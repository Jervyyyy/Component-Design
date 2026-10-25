#!/usr/bin/env python3
"""Write the "P0 组件 · iPhone Duo 适配规范" spec into a Lark docx.

Text lives in duo_spec/content.json, screenshots in duo_spec/images/ (Figma
exports at 2x). Every 形态 is laid out as a grid with its spec text beside the
screenshots, so no single image spans the page. Stdlib only.

Env (same as lark_table.py):
  LARK_APP_ID, LARK_APP_SECRET   self-built app with docx:document + drive:drive;
                                 add the app to the doc as an editor
  LARK_USER_ACCESS_TOKEN         alternatively, write as yourself with a user token
  LARK_DOMAIN                    default https://open.larksuite.com

Usage:
  python3 scripts/lark_duo_spec.py preview                  # -> duo_spec/preview.html
  python3 scripts/lark_duo_spec.py write <doc_url> --dry-run
  python3 scripts/lark_duo_spec.py write <doc_url> [--clear] [--only intro,navbar,...]
"""
import argparse
import html
import json
import os
import re
import struct
import sys
import time
import urllib.parse
import uuid

from lark_table import Client, LarkError, resolve_node

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "duo_spec"))
CONTENT = os.path.join(ROOT, "content.json")
IMAGES = os.path.join(ROOT, "images")

TEXT, BULLET, CALLOUT, DIVIDER = 2, 12, 19, 22
GRID, GRID_COLUMN, IMAGE, TABLE, TABLE_CELL = 24, 25, 27, 31, 32
GREY, RED = 7, 1  # text_color enum
# style -> (background_color, border_color, emoji_id)
CALLOUTS = {"intro": (5, 5, "pushpin"), "rules": (3, 3, "bulb"),
            "info": (4, 4, "white_check_mark"), "warn": (2, 2, "warning")}
TABLE_WIDTH = 820  # px, the default (non-wide) doc content width
MAX_DESCENDANTS = 1000
WRITE_PAUSE = 0.35  # docx write APIs allow ~3 requests/s
RATE_LIMITED = re.compile(r"99991400|frequency limit|rate limit", re.I)


# ---------------------------------------------------------------- blocks

def run(content, bold=False, color=None, link=None):
    style = {}
    if bold:
        style["bold"] = True
    if color:
        style["text_color"] = color
    if link:
        style["link"] = {"url": urllib.parse.quote(link, safe="")}
    return {"text_run": {"content": content, "text_element_style": style}}


def rich(line):
    """'宽度：382…' -> bold label + plain text; a leading '!' marks an open question."""
    if line.startswith("!"):
        return [run(line[1:], bold=True, color=RED)]
    head, sep, tail = line.partition("：")
    if sep and tail and len(head) <= 16 and not re.search("[，。；]", head):
        return [run(head + sep, bold=True), run(tail)]
    return [run(line)]


def text_width(s):
    return sum(2 if ord(ch) > 0x2E7F else 1 for ch in s)


def column_widths(rows):
    weights = [min(48, max(6, max(text_width(r[c]) for r in rows))) for c in range(len(rows[0]))]
    return [max(64, round(TABLE_WIDTH * w / sum(weights))) for w in weights]


def image_size(path):
    with open(path, "rb") as f:
        data = f.read()
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return struct.unpack(">II", data[16:24])
    i = 2
    while i + 9 < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker == 0xFF or 0xD0 <= marker <= 0xD9 or marker == 0x01:
            i += 2 if marker != 0xFF else 1
            continue
        if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
            h, w = struct.unpack(">HH", data[i + 5:i + 9])
            return w, h
        i += 2 + struct.unpack(">H", data[i + 2:i + 4])[0]
    raise ValueError(f"cannot read image size: {path}")


class Doc:
    """Blocks in the shape the docx "create descendants" API takes, keyed by temp id."""

    def __init__(self):
        self.nodes = {}
        self.images = {}  # grid_column temp id -> image paths, inserted after creation
        self._n = 0

    def node(self, block_type, key, payload, children=()):
        self._n += 1
        bid = f"tmp{self._n}"
        self.nodes[bid] = {"block_id": bid, "block_type": block_type, key: payload}
        if children:
            self.nodes[bid]["children"] = list(children)
        return bid

    def text(self, elements, align=None):
        payload = {"elements": elements}
        if align:
            payload["style"] = {"align": align}
        return self.node(TEXT, "text", payload)

    def heading(self, level, content):
        return self.node(2 + level, f"heading{level}", {"elements": [run(content)]})

    def bullet(self, elements):
        return self.node(BULLET, "bullet", {"elements": elements})

    def divider(self):
        return self.node(DIVIDER, "divider", {})

    def callout(self, style, children):
        bg, border, emoji = CALLOUTS[style]
        return self.node(CALLOUT, "callout",
                         {"background_color": bg, "border_color": border, "emoji_id": emoji}, children)

    def lines(self, lines):
        """Short 'label：' lines become bold text, everything else a bullet."""
        out = []
        for line in lines:
            if line.endswith("：") and len(line) <= 10:
                out.append(self.text([run(line, bold=True)]))
            elif line.startswith("!"):
                out.append(self.text(rich(line)))
            else:
                out.append(self.bullet(rich(line)))
        return out

    def grid(self, columns):
        """columns: [(width_ratio, child ids, image paths)]; ratios add up to 100."""
        ids = []
        for ratio, children, images in columns:
            cid = self.node(GRID_COLUMN, "grid_column", {"width_ratio": ratio}, children)
            if images:
                self.images[cid] = list(images)
            ids.append(cid)
        return self.node(GRID, "grid", {"column_size": len(ids)}, ids)

    def table(self, header, rows):
        cells = []
        for r, row in enumerate([header] + rows):
            for value in row:
                cells.append(self.node(TABLE_CELL, "table_cell", {}, [self.text([run(value, bold=r == 0)])]))
        prop = {"row_size": len(rows) + 1, "column_size": len(header),
                "column_width": column_widths([header] + rows), "header_row": True}
        return self.node(TABLE, "table", {"property": prop}, cells)

    def flatten(self, roots):
        out = []

        def walk(bid):
            out.append(self.nodes[bid])
            for child in self.nodes[bid].get("children", []):
                walk(child)

        for bid in roots:
            walk(bid)
        return out


# ---------------------------------------------------------------- layout

def build_form(doc, form):
    out = [doc.heading(3, form["title"])]
    spec = [doc.text([run(form["size"], color=GREY)])] + doc.lines(form["lines"])
    images = [(os.path.join(IMAGES, im["file"]), im["caption"]) for im in form["images"]]
    portrait = all(h / w > 1.2 for w, h in (image_size(p) for p, _ in images))

    def image_column(ratio, path, caption):
        return ratio, [doc.text([run(caption, color=GREY)], align=2)], [path]

    if len(images) == 1:
        spec_ratio = 58 if portrait else 40
        out.append(doc.grid([(spec_ratio, spec, None), image_column(100 - spec_ratio, *images[0])]))
    elif portrait and len(images) == 2:
        out.append(doc.grid([(40, spec, None)] + [image_column(30, *im) for im in images]))
    else:
        # landscape pairs: spec on top, screenshots side by side underneath
        out += spec
        ratios = [100 // len(images)] * len(images)
        ratios[-1] += 100 - sum(ratios)
        out.append(doc.grid([image_column(r, *im) for r, im in zip(ratios, images)]))
    return out


def build_section(doc, section):
    out = [doc.heading(2, section["title"])]
    if section.get("desc"):
        out.append(doc.text([run(section["desc"], color=GREY)]))
    if section["type"] == "forms":
        note = section.get("note")
        if note:
            out.append(doc.callout(note["style"], [doc.text([run(note["title"], bold=True)])]
                                   + doc.lines(note["lines"])))
        for form in section["forms"]:
            out += build_form(doc, form)
    elif section["type"] == "table":
        out.append(doc.table(section["header"], section["rows"]))
    elif section["type"] == "list":
        out += doc.lines(section["lines"])
    else:
        raise ValueError(f"unknown section type: {section['type']}")
    return out


def build(content):
    doc = Doc()
    figma = content["figma"]
    comps = content["components"]

    intro = doc.lines(content["intro"])
    intro.append(doc.text([run("设计稿：", bold=True),
                           run(content["title"], link=f"{figma['file']}?node-id={figma['section']}")]))
    common = content["common"]
    roots = [doc.callout("intro", intro),
             doc.heading(1, common["title"]),
             doc.text([run(common["desc"], color=GREY)]),
             doc.table(common["header"], common["rows"]),
             doc.heading(1, "组件索引"),
             doc.table(["#", "组件", "状态", "更新"],
                       [[str(i), f"{c['name']} {c['cn']}", c["status"], c["updated"]]
                        for i, c in enumerate(comps, 1)]),
             doc.divider()]
    chunks = [("intro", roots)]

    for i, comp in enumerate(comps, 1):
        url = f"{figma['file']}?node-id={comp['node']}"
        roots = [doc.heading(1, f"{i}. {comp['name']} {comp['cn']}"),
                 doc.text([run(f"更新：{comp['updated']} ｜ 优先级：P0 ｜ 状态：{comp['status']} ｜ ", color=GREY),
                           run("Figma 原稿", link=url)]),
                 doc.text([run("概述：", bold=True), run(comp["overview"])]),
                 doc.callout("rules", [doc.text([run("核心规则", bold=True)])] + doc.lines(comp["rules"]))]
        for section in comp["sections"]:
            roots += build_section(doc, section)
        if i < len(comps):
            roots.append(doc.divider())
        chunks.append((comp["key"], roots))
    return doc, chunks


def check(doc, key, blocks):
    ids = {b["block_id"] for b in blocks}
    problems = []
    if len(blocks) > MAX_DESCENDANTS:
        problems.append(f"{len(blocks)} blocks > {MAX_DESCENDANTS}")
    for b in blocks:
        problems += [f"{b['block_id']}: missing child {c}" for c in b.get("children", []) if c not in ids]
        if b["block_type"] == GRID:
            total = sum(doc.nodes[c]["grid_column"]["width_ratio"] for c in b["children"])
            if total != 100:
                problems.append(f"{b['block_id']}: grid ratios add up to {total}")
        problems += [f"missing image {p}" for p in doc.images.get(b["block_id"], []) if not os.path.exists(p)]
    if problems:
        sys.exit(f"{key}: " + "; ".join(problems))


# ---------------------------------------------------------------- preview

PREVIEW_CSS = """
body{margin:0;background:#f5f6f7;font:15px/1.7 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#1f2329}
main{width:820px;margin:0 auto;padding:40px 48px;background:#fff;box-sizing:content-box}
h1{font-size:26px;margin:28px 0 8px}h2{font-size:21px;margin:24px 0 6px}h3{font-size:17px;margin:18px 0 4px}
p{margin:4px 0}ul{margin:2px 0;padding-left:22px}hr{border:0;border-top:1px solid #dee0e3;margin:28px 0}
a{color:#245bdb;text-decoration:none}.c1{color:#d83931}.c7{color:#8f959e}
.callout{border:1px solid;border-radius:8px;padding:8px 14px;margin:8px 0}
.bg2{background:#fef1e1;border-color:#f8b16c}.bg3{background:#fefae0;border-color:#f5d968}
.bg4{background:#e4f5e9;border-color:#8ed4a6}.bg5{background:#e1eaff;border-color:#82a7fc}
.grid{display:flex;gap:16px;margin:6px 0}.col{min-width:0}.col img{width:100%;display:block;border-radius:4px}
table{border-collapse:collapse;margin:8px 0;table-layout:fixed}td{border:1px solid #dee0e3;padding:6px 8px;vertical-align:top}
tr:first-child td{background:#f5f6f7}
"""


def render_preview(doc, chunks, title, out_path):
    base = os.path.dirname(os.path.abspath(out_path))

    def elements(els):
        parts = []
        for el in els:
            tr = el["text_run"]
            style = tr["text_element_style"]
            s = html.escape(tr["content"])
            if style.get("bold"):
                s = f"<b>{s}</b>"
            if style.get("text_color"):
                s = f'<span class="c{style["text_color"]}">{s}</span>'
            if style.get("link"):
                s = f'<a href="{html.escape(urllib.parse.unquote(style["link"]["url"]))}">{s}</a>'
            parts.append(s)
        return "".join(parts)

    def block(bid):
        n = doc.nodes[bid]
        t = n["block_type"]
        kids = "".join(block(c) for c in n.get("children", []))
        if t == TEXT:
            align = {2: "center", 3: "right"}.get(n["text"].get("style", {}).get("align"), "left")
            return f'<p style="text-align:{align}">{elements(n["text"]["elements"])}</p>'
        if t in (3, 4, 5):
            return f"<h{t - 2}>{elements(n[f'heading{t - 2}']['elements'])}</h{t - 2}>"
        if t == BULLET:
            return f"<ul><li>{elements(n['bullet']['elements'])}</li></ul>"
        if t == CALLOUT:
            return f'<div class="callout bg{n["callout"]["background_color"]}">{kids}</div>'
        if t == DIVIDER:
            return "<hr>"
        if t == GRID:
            return f'<div class="grid">{kids}</div>'
        if t == GRID_COLUMN:
            imgs = "".join(f'<img src="{html.escape(os.path.relpath(p, base))}">' for p in doc.images.get(bid, []))
            return f'<div class="col" style="flex:{n["grid_column"]["width_ratio"]}">{imgs}{kids}</div>'
        if t == TABLE:
            prop = n["table"]["property"]
            cols = prop["column_size"]
            cells = n["children"]
            widths = "".join(f'<col style="width:{w}px">' for w in prop["column_width"])
            rows = "".join("<tr>" + "".join(f"<td>{block(c)}</td>" for c in cells[r:r + cols]) + "</tr>"
                           for r in range(0, len(cells), cols))
            return f"<table>{widths}{rows}</table>"
        if t == TABLE_CELL:
            return kids
        raise ValueError(f"no preview for block type {t}")

    body = "".join(block(bid) for _, roots in chunks for bid in roots)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(f'<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>{html.escape(title)}</title>'
                f"<style>{PREVIEW_CSS}</style></head><body><main><h1>{html.escape(title)}</h1>{body}</main></body></html>")


# ---------------------------------------------------------------- lark

class UserClient(Client):
    def __init__(self, token):
        self.token = token


def make_client():
    token = os.environ.get("LARK_USER_ACCESS_TOKEN")
    if token:
        return UserClient(token)
    app_id, secret = os.environ.get("LARK_APP_ID"), os.environ.get("LARK_APP_SECRET")
    if not app_id or not secret:
        sys.exit("set LARK_APP_ID and LARK_APP_SECRET (or LARK_USER_ACCESS_TOKEN)")
    return Client(app_id, secret)


def call(fn, *args, **kwargs):
    for attempt in range(4):
        try:
            res = fn(*args, **kwargs)
            time.sleep(WRITE_PAUSE)
            return res
        except LarkError as e:
            if attempt == 3 or not RATE_LIMITED.search(str(e)):
                raise
            time.sleep(2 ** attempt)


def doc_id_of(client, ref):
    m = re.search(r"/docx/([A-Za-z0-9]+)", ref)
    if m:
        return m.group(1)
    m = re.search(r"/wiki/([A-Za-z0-9]+)", ref)
    if m:
        obj_type, obj_token, _ = resolve_node(client, m.group(1))
        if obj_type != "docx":
            raise LarkError(f"wiki node is a {obj_type}, not a docx")
        return obj_token
    return ref


def blocks_path(doc_id, block_id=None):
    return f"/open-apis/docx/v1/documents/{doc_id}/blocks/{block_id or doc_id}"


def page_block(client, doc_id):
    return client.get(blocks_path(doc_id), document_revision_id=-1)["block"]


def clear_doc(client, doc_id, yes):
    n = len(page_block(client, doc_id).get("children", []))
    if not n:
        return
    if not yes and input(f"delete all {n} top-level blocks in the doc? [y/N] ").strip().lower() != "y":
        sys.exit("aborted")
    call(client._request, "DELETE", blocks_path(doc_id) + "/children/batch_delete",
         params={"document_revision_id": -1}, body={"start_index": 0, "end_index": n})
    print(f"cleared {n} blocks")


def set_title(client, doc_id, title, force):
    elements = page_block(client, doc_id).get("page", {}).get("elements", [])
    current = "".join(e.get("text_run", {}).get("content", "") for e in elements).strip()
    if current and not force:
        return
    try:
        call(client.patch, blocks_path(doc_id), {"update_text_elements": {"elements": [run(title)]}},
             document_revision_id=-1)
        print(f"title: {title}")
    except LarkError as e:
        print(f"could not set the title, set it by hand ({e})", file=sys.stderr)


def create_descendants(client, doc_id, roots, blocks):
    body = {"children_id": roots, "descendants": blocks}
    token = str(uuid.uuid4())
    try:
        res = call(client.post, blocks_path(doc_id) + "/descendant", body,
                   document_revision_id=-1, client_token=token)
    except LarkError as e:
        if not any("emoji_id" in b.get("callout", {}) for b in blocks):
            raise
        print(f"  retrying without callout emoji ({e})")
        for b in blocks:
            b.get("callout", {}).pop("emoji_id", None)
        res = call(client.post, blocks_path(doc_id) + "/descendant", body,
                   document_revision_id=-1, client_token=str(uuid.uuid4()))
    return {r["temporary_block_id"]: r["block_id"] for r in res.get("block_id_relations", [])}


def insert_image(client, doc_id, parent_id, path):
    res = call(client.post, blocks_path(doc_id, parent_id) + "/children",
               {"children": [{"block_type": IMAGE, "image": {}}], "index": 0}, document_revision_id=-1)
    image_id = res["children"][0]["block_id"]
    file_token = call(client.upload_media, path, "docx_image", image_id, extra={"drive_route_token": doc_id})
    call(client.patch, blocks_path(doc_id, image_id), {"replace_image": {"token": file_token}},
         document_revision_id=-1)


def cmd_write(args, doc, chunks, title):
    keys = [k for k, _ in chunks]
    only = args.only.split(",") if args.only else keys
    unknown = set(only) - set(keys)
    if unknown:
        sys.exit(f"unknown --only keys {sorted(unknown)}; choose from {','.join(keys)}")
    selected = [(k, roots, doc.flatten(roots)) for k, roots in chunks if k in only]
    for key, _, blocks in selected:
        check(doc, key, blocks)
        n_images = sum(len(doc.images.get(b["block_id"], [])) for b in blocks)
        print(f"{key:<10} {len(blocks):>4} blocks  {n_images:>2} images")
    if args.dump:
        with open(args.dump, "w", encoding="utf-8") as f:
            json.dump({k: {"children_id": r, "descendants": b} for k, r, b in selected}, f, ensure_ascii=False, indent=1)
    if args.dry_run:
        return 0

    client = make_client()
    doc_id = doc_id_of(client, args.doc)
    if args.clear:
        clear_doc(client, doc_id, args.yes)
    set_title(client, doc_id, args.title or title, force=bool(args.title))
    for n, (key, roots, blocks) in enumerate(selected):
        try:
            ids = create_descendants(client, doc_id, roots, blocks)
            images = [(ids[b["block_id"]], p) for b in blocks for p in doc.images.get(b["block_id"], [])]
            for i, (column_id, path) in enumerate(images, 1):
                print(f"\r{key}: image {i}/{len(images)}", end="", flush=True)
                insert_image(client, doc_id, column_id, path)
            print(f"\r{key}: done ({len(blocks)} blocks, {len(images)} images)")
        except (LarkError, KeyError) as e:
            rest = ",".join(k for k, _, _ in selected[n:])
            print(f"\n{key}: failed: {e!r}\n"
                  f"remove the partial '{key}' section in the doc, then resume with: --only {rest}", file=sys.stderr)
            return 1
    print(f"done: document {doc_id}")
    return 0


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    pp = sub.add_parser("preview", help="render the layout to a local HTML page")
    pp.add_argument("-o", "--out", default=os.path.join(ROOT, "preview.html"))
    pw = sub.add_parser("write", help="append the spec to a Lark docx")
    pw.add_argument("doc", help="docx / wiki URL or document id")
    pw.add_argument("--only", help="comma-separated sections: intro and/or component keys")
    pw.add_argument("--clear", action="store_true", help="delete the doc body first (asks to confirm)")
    pw.add_argument("--yes", action="store_true", help="skip the --clear confirmation")
    pw.add_argument("--title", help="overwrite the doc title (default: only set it when empty)")
    pw.add_argument("--dump", help="also write the block JSON to this file")
    pw.add_argument("--dry-run", action="store_true", help="build and validate only, no API calls")
    args = p.parse_args()

    with open(CONTENT, encoding="utf-8") as f:
        content = json.load(f)
    doc, chunks = build(content)
    if args.cmd == "preview":
        render_preview(doc, chunks, content["title"], args.out)
        print(args.out)
        return 0
    try:
        return cmd_write(args, doc, chunks, content["title"])
    except LarkError as e:
        sys.exit(f"error: {e}")


if __name__ == "__main__":
    sys.exit(main())
