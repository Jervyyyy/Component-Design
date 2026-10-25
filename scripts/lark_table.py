#!/usr/bin/env python3
"""Fill Trip (T) component screenshots into the fold-adaptation table in a Lark wiki page.

Supports wiki nodes backed by a docx (table block) or a sheet. Stdlib only.

Env:
  LARK_APP_ID, LARK_APP_SECRET   self-built app credentials (the app must be added
                                 to the wiki page as a collaborator with edit access)
  LARK_DOMAIN                    default https://open.larksuite.com
                                 (use https://open.feishu.cn for Feishu tenants)

Usage:
  python3 scripts/lark_table.py inspect <wiki_url_or_token>
  python3 scripts/lark_table.py upload  <wiki_url_or_token> --plan shots/plan.csv [--dry-run]

plan.csv columns: component,mode,file
  component  text in the first column of the target row (exact match after trim)
  mode       01 / 02 / 03 / 04, matched against the header cell prefix
  file       path to the PNG, relative to plan.csv
"""
import argparse
import csv
import json
import mimetypes
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid

DOMAIN = os.environ.get("LARK_DOMAIN", "https://open.larksuite.com").rstrip("/")

BLOCK_IMAGE = 27
BLOCK_TABLE = 31
BLOCK_TABLE_CELL = 32


class LarkError(RuntimeError):
    def __init__(self, msg, code=None):
        super().__init__(msg)
        self.code = code


class Client:
    def __init__(self, app_id, app_secret):
        res = self._request("POST", "/open-apis/auth/v3/tenant_access_token/internal",
                            body={"app_id": app_id, "app_secret": app_secret}, auth=False)
        self.token = res["tenant_access_token"]

    def _request(self, method, path, params=None, body=None, data=None,
                 content_type=None, auth=True):
        url = DOMAIN + path
        if params:
            url += "?" + urllib.parse.urlencode(params)
        headers = {}
        if auth:
            headers["Authorization"] = f"Bearer {self.token}"
        if body is not None:
            data = json.dumps(body).encode()
            content_type = "application/json; charset=utf-8"
        if content_type:
            headers["Content-Type"] = content_type
        req = urllib.request.Request(url, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                payload = json.loads(resp.read())
        except urllib.error.HTTPError as e:
            payload = json.loads(e.read() or b"{}")
        if payload.get("code", 0) != 0:
            raise LarkError(f"{method} {path}: {payload.get('code')} {payload.get('msg')}",
                            payload.get("code"))
        return payload.get("data", payload)

    def get(self, path, **params):
        return self._request("GET", path, params=params)

    def post(self, path, body, **params):
        return self._request("POST", path, params=params, body=body)

    def patch(self, path, body, **params):
        return self._request("PATCH", path, params=params, body=body)

    def upload_media(self, file_path, parent_type, parent_node, extra=None):
        fields = {
            "file_name": os.path.basename(file_path),
            "parent_type": parent_type,
            "parent_node": parent_node,
            "size": str(os.path.getsize(file_path)),
        }
        if extra:
            fields["extra"] = json.dumps(extra)
        boundary = uuid.uuid4().hex
        parts = []
        for k, v in fields.items():
            parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
        mime = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
        with open(file_path, "rb") as f:
            content = f.read()
        parts.append(
            f'--{boundary}\r\nContent-Disposition: form-data; name="file"; '
            f'filename="{fields["file_name"]}"\r\nContent-Type: {mime}\r\n\r\n'.encode()
            + content + b"\r\n")
        parts.append(f"--{boundary}--\r\n".encode())
        res = self._request("POST", "/open-apis/drive/v1/medias/upload_all", data=b"".join(parts),
                            content_type=f"multipart/form-data; boundary={boundary}")
        return res["file_token"]


def wiki_token(url_or_token):
    m = re.search(r"/wiki/([A-Za-z0-9]+)", url_or_token)
    return m.group(1) if m else url_or_token


def resolve_node(client, token):
    node = client.get("/open-apis/wiki/v2/spaces/get_node", token=token)["node"]
    return node["obj_type"], node["obj_token"], node.get("title", "")


# ---------------------------------------------------------------- docx

def text_of(block):
    for v in block.values():
        if isinstance(v, dict) and "elements" in v:
            return "".join(e.get("text_run", {}).get("content", "")
                           or e.get("mention_doc", {}).get("title", "")
                           for e in v["elements"])
    return ""


class DocxTables:
    def __init__(self, client, doc_id):
        self.client = client
        self.doc_id = doc_id
        self.blocks = {}
        page_token = None
        while True:
            params = {"page_size": 500, "document_revision_id": -1}
            if page_token:
                params["page_token"] = page_token
            res = client.get(f"/open-apis/docx/v1/documents/{doc_id}/blocks", **params)
            for b in res.get("items", []):
                self.blocks[b["block_id"]] = b
            if not res.get("has_more"):
                break
            page_token = res["page_token"]
        self.tables = [b for b in self.blocks.values() if b["block_type"] == BLOCK_TABLE]

    def cell_info(self, cell_id):
        cell = self.blocks.get(cell_id, {})
        texts, images = [], 0
        for child_id in cell.get("children", []):
            child = self.blocks.get(child_id, {})
            if child.get("block_type") == BLOCK_IMAGE:
                images += 1
            else:
                texts.append(text_of(child))
        return " ".join(t for t in texts if t).strip(), images

    def grid(self, table):
        prop = table["table"]["property"]
        rows, cols = prop["row_size"], prop["column_size"]
        cells = table["table"]["cells"]
        return [[cells[r * cols + c] for c in range(cols)] for r in range(rows)]

    def insert_image(self, cell_id, file_path):
        res = self.client.post(
            f"/open-apis/docx/v1/documents/{self.doc_id}/blocks/{cell_id}/children",
            {"children": [{"block_type": BLOCK_IMAGE, "image": {}}]},
            document_revision_id=-1)
        image_block = res["children"][0]["block_id"]
        file_token = self.client.upload_media(file_path, "docx_image", image_block,
                                              extra={"drive_route_token": self.doc_id})
        self.client.patch(f"/open-apis/docx/v1/documents/{self.doc_id}/blocks/{image_block}",
                          {"replace_image": {"token": file_token}}, document_revision_id=-1)


# ---------------------------------------------------------------- sheet

def col_letter(i):
    s = ""
    i += 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s


def sheet_cell_text(v):
    if v is None:
        return ""
    if isinstance(v, list):
        return "".join(sheet_cell_text(x) for x in v)
    if isinstance(v, dict):
        return v.get("text", "") or ("[image]" if v.get("type") in ("embed-image", "image") else "")
    return str(v)


class SheetTables:
    def __init__(self, client, token):
        self.client = client
        self.token = token
        self.sheets = client.get(f"/open-apis/sheets/v3/spreadsheets/{token}/sheets/query")["sheets"]

    def values(self, sheet):
        grid = sheet["grid_properties"]
        rng = f"{sheet['sheet_id']}!A1:{col_letter(grid['column_count'] - 1)}{grid['row_count']}"
        res = self.client.get(f"/open-apis/sheets/v2/spreadsheets/{self.token}/values/"
                              + urllib.parse.quote(rng), valueRenderOption="ToString")
        return res["valueRange"].get("values") or []

    def insert_image(self, sheet_id, row, col, file_path):
        cell = f"{sheet_id}!{col_letter(col)}{row + 1}:{col_letter(col)}{row + 1}"
        with open(file_path, "rb") as f:
            image = list(f.read())
        self.client.post(f"/open-apis/sheets/v2/spreadsheets/{self.token}/values_image",
                         {"range": cell, "image": image, "name": os.path.basename(file_path)})


# ---------------------------------------------------------------- commands

def mode_columns(header):
    """Map '01'..'04' to column index from header texts like '01 外屏竖'."""
    out = {}
    for i, text in enumerate(header):
        m = re.match(r"\s*(0[1-9])", text)
        if m:
            out.setdefault(m.group(1), i)
    return out


def load_tables(client, url):
    obj_type, obj_token, title = resolve_node(client, wiki_token(url))
    print(f"wiki node: {title!r} ({obj_type} {obj_token})", file=sys.stderr)
    if obj_type == "docx":
        doc = DocxTables(client, obj_token)
        tables = []
        for t in doc.tables:
            ids = doc.grid(t)
            info = [[doc.cell_info(c) for c in row] for row in ids]
            tables.append({"name": t["block_id"], "ids": ids,
                           "text": [[i[0] for i in row] for row in info],
                           "images": [[i[1] for i in row] for row in info]})
        return obj_type, doc, tables
    if obj_type == "sheet":
        sh = SheetTables(client, obj_token)
        tables = []
        for s in sh.sheets:
            if s.get("resource_type", "sheet") != "sheet":
                continue
            vals = sh.values(s)
            text = [[sheet_cell_text(v) for v in row] for row in vals]
            tables.append({"name": s["sheet_id"], "title": s.get("title"), "text": text,
                           "images": [[int(t == "[image]") for t in row] for row in text]})
        return obj_type, sh, tables
    raise LarkError(f"unsupported wiki object type: {obj_type}")


def cmd_inspect(client, args):
    _, _, tables = load_tables(client, args.url)
    for n, t in enumerate(tables):
        modes = mode_columns(t["text"][0]) if t["text"] else {}
        print(f"\n== table {n} [{t['name']}] {t.get('title') or ''} modes={modes}")
        for r, row in enumerate(t["text"]):
            cells = []
            for c, text in enumerate(row):
                img = t["images"][r][c]
                cells.append((text[:24] or "-") + (f" [img x{img}]" if img and text != "[image]" else ""))
            print(f"  r{r:<3}| " + " | ".join(cells))


def cmd_upload(client, args):
    obj_type, backend, tables = load_tables(client, args.url)
    base = os.path.dirname(os.path.abspath(args.plan))
    with open(args.plan, newline="", encoding="utf-8") as f:
        plan = [r for r in csv.DictReader(f) if r.get("file")]

    # index rows by first-column text across all tables that have mode headers
    rows = {}
    for n, t in enumerate(tables):
        if args.table is not None and n != args.table:
            continue
        modes = mode_columns(t["text"][0]) if t["text"] else {}
        if not modes:
            continue
        for r, row in enumerate(t["text"][1:], start=1):
            if row and row[0].strip():
                rows.setdefault(row[0].strip(), (n, r, modes))

    failed = 0
    for item in plan:
        comp, mode = item["component"].strip(), item["mode"].strip().zfill(2)
        path = os.path.join(base, item["file"])
        hit = rows.get(comp)
        if not hit:
            print(f"SKIP  {comp} / {mode}: no row with first column {comp!r}")
            failed += 1
            continue
        n, r, modes = hit
        if mode not in modes:
            print(f"SKIP  {comp} / {mode}: no header column starting with {mode}")
            failed += 1
            continue
        c = modes[mode]
        t = tables[n]
        if t["images"][r][c] and not args.append:
            print(f"KEEP  {comp} / {mode}: cell r{r}c{c} already has an image (use --append)")
            continue
        if not os.path.exists(path):
            print(f"SKIP  {comp} / {mode}: missing file {path}")
            failed += 1
            continue
        print(f"{'PLAN' if args.dry_run else 'PUT '}  {comp} / {mode} -> table {n} r{r}c{c}  {item['file']}")
        if args.dry_run:
            continue
        try:
            if obj_type == "docx":
                backend.insert_image(t["ids"][r][c], path)
            else:
                backend.insert_image(t["name"], r, c, path)
        except LarkError as e:
            print(f"FAIL  {comp} / {mode}: {e}")
            failed += 1
    return 1 if failed else 0


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    pi = sub.add_parser("inspect", help="print every table as row/column grid")
    pi.add_argument("url")
    pu = sub.add_parser("upload", help="insert screenshots listed in a plan CSV")
    pu.add_argument("url")
    pu.add_argument("--plan", required=True)
    pu.add_argument("--table", type=int, help="only use table N from `inspect`")
    pu.add_argument("--append", action="store_true", help="insert even if the cell already has an image")
    pu.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    app_id, secret = os.environ.get("LARK_APP_ID"), os.environ.get("LARK_APP_SECRET")
    if not app_id or not secret:
        sys.exit("set LARK_APP_ID and LARK_APP_SECRET")
    try:
        client = Client(app_id, secret)
        sys.exit(cmd_inspect(client, args) if args.cmd == "inspect" else cmd_upload(client, args))
    except LarkError as e:
        sys.exit(f"error: {e}")


if __name__ == "__main__":
    main()
