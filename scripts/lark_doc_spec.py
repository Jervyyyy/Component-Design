#!/usr/bin/env python3
"""Append a component adaptation spec (see specs/iphone-duo-p0.json) to a Lark docx.

Layout: every configuration is a two-column grid (spec text | mockup) sized so that no
mockup is taller than --max-img-h; spec tables become native tables; core rules become
a callout. Content is appended to the end of the document. Stdlib only.

Calls go through the official Feishu CLI (`lark-cli`, npm @larksuite/cli) as the user
logged in with `lark-cli auth login --domain docs,drive`, so the user's own edit access
applies. --client app uses the app credentials from lark_table.py instead (LARK_APP_ID,
LARK_APP_SECRET, LARK_DOMAIN; the app must be added to the document with edit access).

Usage:
  python3 scripts/lark_doc_spec.py <doc_url_or_id> --spec specs/iphone-duo-p0.json --dry-run
  python3 scripts/lark_doc_spec.py <doc_url_or_id> --spec specs/iphone-duo-p0.json [--only N] [--from N] [--until N]

N is a 1-based component number or a prefix of "<name> <cn>", e.g. "Sheet" or "Share 分享面板".
--only / --from skip the overview section at the top; --no-intro skips it explicitly.
"""
import argparse
import json
import math
import os
import re
import shutil
import struct
import subprocess
import sys
import time
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lark_table import (BLOCK_IMAGE, BLOCK_TABLE, BLOCK_TABLE_CELL, Client, DocxTables,  # noqa: E402
                        LarkError, resolve_node, wiki_token)

BLOCK_TEXT = 2
BLOCK_HEADING = {1: 3, 2: 4, 3: 5, 4: 6}
BLOCK_BULLET = 12
BLOCK_ORDERED = 13
BLOCK_CALLOUT = 19
BLOCK_DIVIDER = 22
BLOCK_GRID = 24
BLOCK_GRID_COLUMN = 25
TEXT_KEY = {2: "text", 3: "heading1", 4: "heading2", 5: "heading3", 6: "heading4",
            12: "bullet", 13: "ordered"}
NAMES = {2: "P", 3: "H1", 4: "H2", 5: "H3", 6: "H4", 12: "UL", 13: "OL", 19: "CALLOUT",
         22: "HR", 24: "GRID", 25: "COL", 27: "IMG", 31: "TABLE", 32: "CELL"}

GRAY, ORANGE = 7, 2        # text_color
CALLOUT_BLUE = 5           # background_color / border_color
COL_PAD = 24               # horizontal padding inside a grid column, px
RETRY_CODES = {99991400, 1254290, 1254291}   # rate limit / edit conflict
LABEL = re.compile(r"^([^：:，,。；;]{1,16}[：:])(.*)$")


# ---------------------------------------------------------------- block builders

def run(content, bold=False, color=None, link=None):
    style = {}
    if bold:
        style["bold"] = True
    if color:
        style["text_color"] = color
    if link:
        style["link"] = {"url": urllib.parse.quote(link, safe="")}
    return {"text_run": {"content": content, "text_element_style": style}}


def text_block(elements, block_type=BLOCK_TEXT, children=None):
    b = {"block_type": block_type, TEXT_KEY[block_type]: {"elements": elements}}
    if children:
        b["children"] = children
    return b


def heading(level, text):
    return text_block([run(text)], BLOCK_HEADING[level])


def paragraphs(text, color=None):
    return [text_block([run(line, color=color)]) for line in text.split("\n") if line.strip()]


def rich(line):
    """'宽度：382…' -> bold label + plain rest."""
    m = LABEL.match(line)
    if m and m.group(2).strip():
        return [run(m.group(1), bold=True), run(m.group(2))]
    return [run(line)]


def spec_lines(lines):
    """Lines that are only a label ('面板：') become bold sub-headings, the rest bullets."""
    out = []
    for line in lines:
        m = LABEL.match(line)
        if m and not m.group(2).strip():
            out.append(text_block([run(line, bold=True)]))
        else:
            out.append(text_block(rich(line), BLOCK_BULLET))
    return out


def callout(title, items):
    children = [text_block([run(title, bold=True)])]
    children += [text_block(rich(item), BLOCK_ORDERED) for item in items]
    return {"block_type": BLOCK_CALLOUT,
            "callout": {"background_color": CALLOUT_BLUE, "border_color": CALLOUT_BLUE,
                        "emoji_id": "pushpin"},
            "children": children}


def table(rows, widths, page_w):
    cols = len(rows[0])
    total = sum(widths)
    cells = []
    for r, row in enumerate(rows):
        assert len(row) == cols, f"row {r} has {len(row)} cells, expected {cols}: {row}"
        for value in row:
            cells.append({"block_type": BLOCK_TABLE_CELL, "table_cell": {},
                          "children": [text_block([run(value, bold=r == 0)])]})
    return {"block_type": BLOCK_TABLE,
            "table": {"property": {"row_size": len(rows), "column_size": cols,
                                   "column_width": [max(60, round(w * page_w / total)) for w in widths],
                                   "header_row": True}},
            "children": cells}


def png_size(path):
    with open(path, "rb") as f:
        head = f.read(24)
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"not a PNG: {path}")
    return struct.unpack(">II", head[16:24])


def image_layout(png_w, png_h, opts):
    """Display size and grid ratio for a mockup: as tall as max_img_h unless that would
    make it wider than max_img_ratio percent of the page."""
    aspect = png_w / png_h
    max_w = opts.page_width * opts.max_img_ratio / 100 - COL_PAD
    w = min(opts.max_img_h * aspect, max_w)
    ratio = min(opts.max_img_ratio, math.ceil((w + COL_PAD) * 100 / opts.page_width))
    return round(w), round(w / aspect), ratio


def config_grid(block, image_dir, opts):
    path = os.path.join(image_dir, block["node"].replace(":", "_") + ".png")
    w, h, img_ratio = image_layout(*png_size(path), opts)
    text = [heading(4, block["title"])]
    if block.get("flag"):
        text.append(text_block([run(block["flag"], color=ORANGE)]))
    text.append(text_block([run(block["size"], color=GRAY)]))
    text += spec_lines(block["lines"])
    image = {"block_type": BLOCK_IMAGE, "image": {}, "_file": path, "_size": (w, h)}
    return {"block_type": BLOCK_GRID, "grid": {"column_size": 2},
            "children": [
                {"block_type": BLOCK_GRID_COLUMN, "grid_column": {"width_ratio": 100 - img_ratio},
                 "children": text},
                {"block_type": BLOCK_GRID_COLUMN, "grid_column": {"width_ratio": img_ratio},
                 "children": [image]},
            ]}


def component_nodes(comp, image_dir, opts):
    """Top-level blocks for one component, grouped: each group is one API call."""
    groups = [[heading(1, f"{comp['name']} {comp['cn']}"),
               text_block([run(comp["meta"], color=GRAY)])]]
    for b in comp["blocks"]:
        t = b["type"]
        if t in ("h2", "h3"):
            simple = [heading(int(t[1]), b["text"])]
        elif t == "p":
            simple = paragraphs(b["text"])
        elif t == "note":
            simple = paragraphs(b["text"], color=GRAY)
        elif t == "callout":
            groups.append([callout(b["title"], b["items"])])
            continue
        elif t == "config":
            groups.append([config_grid(b, image_dir, opts)])
            continue
        elif t == "table":
            groups.append([table(b["rows"], b["widths"], opts.page_width)])
            continue
        else:
            raise ValueError(f"{comp['name']}: unknown block type {t!r}")
        if all(n["block_type"] in TEXT_KEY for n in groups[-1]):
            groups[-1] += simple
        else:
            groups.append(simple)
    return groups


def intro_nodes(spec, opts):
    rows = [["组件", "覆盖形态", "更新", "状态"]]
    for comp in spec["components"]:
        forms = []
        for b in comp["blocks"]:
            if b["type"] == "config":
                key = b["title"].split(" · ")[0]
                if key not in forms:
                    forms.append(key)
        meta = dict(re.findall(r"(更新|状态)：([^｜]+)", comp["meta"]))
        rows.append([f"{comp['name']} {comp['cn']}", " / ".join(forms),
                     meta.get("更新", "").strip(), meta.get("状态", "").strip()])
    return [[heading(1, "总览"),
             text_block([run("来源："), run(f"Figma · {spec['title']}", link=spec["figma"]),
                         run(f" ｜ 共 {len(spec['components'])} 个组件；示意图按 1× 绘制，点击图片可查看原图。",
                             color=GRAY)])],
            [table(rows, [300, 220, 160, 520], opts.page_width)],
            [{"block_type": BLOCK_DIVIDER, "divider": {}}]]


# ---------------------------------------------------------------- dry run

def describe(node, indent=""):
    bt = node["block_type"]
    name = NAMES.get(bt, str(bt))
    if bt in TEXT_KEY:
        content = "".join(e["text_run"]["content"] for e in node[TEXT_KEY[bt]]["elements"])
        return [f"{indent}{name:<7} {content[:60]}"]
    if bt == BLOCK_GRID:
        ratios = [c["grid_column"]["width_ratio"] for c in node["children"]]
        img = node["children"][1]["children"][0]
        title = describe(node["children"][0]["children"][0])[0].split(None, 1)[1]
        return [f"{indent}{name:<7} {ratios} {title}  img {img['_size'][0]}×{img['_size'][1]}"
                f"  ({os.path.basename(img['_file'])})"]
    if bt == BLOCK_TABLE:
        p = node["table"]["property"]
        return [f"{indent}{name:<7} {p['row_size']}×{p['column_size']} widths {p['column_width']}"]
    if bt == BLOCK_CALLOUT:
        return [f"{indent}{name:<7} " + describe(node["children"][0])[0].split(None, 1)[1]
                + f" ×{len(node['children']) - 1}"]
    return [f"{indent}{name}"]


def walk(node):
    yield node
    for c in node.get("children", []):
        yield from walk(c)


def check(groups, opts):
    problems = []
    for node in (n for g in groups for top in g for n in walk(top)):
        if node["block_type"] == BLOCK_GRID:
            total = sum(c["grid_column"]["width_ratio"] for c in node["children"])
            if total != 100:
                problems.append(f"grid ratios sum to {total}")
        if node["block_type"] == BLOCK_IMAGE and node["_size"][1] > opts.max_img_h:
            problems.append(f"{node['_file']} displays {node['_size'][1]}px tall")
    return problems


# ---------------------------------------------------------------- writing

class CliClient:
    """Same surface as lark_table.Client, sending every call through lark-cli."""

    def __init__(self, identity="user"):
        self.identity = identity
        self.env = dict(os.environ, LARKSUITE_CLI_NO_UPDATE_NOTIFIER="1",
                        LARKSUITE_CLI_NO_SKILLS_NOTIFIER="1")

    def _run(self, args, stdin=None):
        p = subprocess.run(["lark-cli", *args, "--as", self.identity], input=stdin,
                           capture_output=True, text=True, env=self.env)
        out = (p.stdout if p.returncode == 0 else p.stderr).strip()
        try:
            payload = json.loads(out)
        except ValueError:
            raise LarkError(f"lark-cli {' '.join(args[:3])}: {out[:300]}")
        if not payload.get("ok"):
            err = payload.get("error", {})
            raise LarkError(f"lark-cli {' '.join(args[:3])}: {err.get('code')} {err.get('message')}",
                            err.get("code"))
        return payload.get("data") or {}

    def _request(self, method, path, params=None, body=None, **_):
        args = ["api", method, path]
        if params:
            args += ["--params", json.dumps(params)]
        if body is not None:
            args += ["--data", "-"]
        return self._run(args, json.dumps(body, ensure_ascii=False) if body is not None else None)

    def get(self, path, **params):
        return self._request("GET", path, params=params)

    def post(self, path, body, **params):
        return self._request("POST", path, params=params, body=body)

    def patch(self, path, body, **params):
        return self._request("PATCH", path, params=params, body=body)

    def upload_media(self, file_path, parent_type, parent_node, extra=None):
        # lark-cli only accepts file paths relative to the working directory
        args = ["docs", "+media-upload", "--file", os.path.relpath(file_path),
                "--parent-type", parent_type, "--parent-node", parent_node]
        if extra and extra.get("drive_route_token"):
            args += ["--doc-id", extra["drive_route_token"]]
        return self._run(args)["file_token"]


def call(fn, *args, **kwargs):
    for attempt in range(5):
        try:
            res = fn(*args, **kwargs)
            time.sleep(0.35)
            return res
        except LarkError as e:
            if e.code not in RETRY_CODES or attempt == 4:
                raise
            time.sleep(2 ** attempt)


def flatten(nodes, safe):
    """Nested builder output -> (children_id, descendants, images) for the descendant API.
    safe=True drops optional styling the API might reject."""
    descendants, images, counter = [], {}, [0]

    def visit(node):
        counter[0] += 1
        tmp = f"tmp{counter[0]}"
        d = {k: v for k, v in node.items() if k != "children" and not k.startswith("_")}
        if safe:
            if "callout" in d:
                d["callout"] = {}
            if "table" in d:
                d["table"] = {"property": {k: v for k, v in d["table"]["property"].items()
                                           if k in ("row_size", "column_size")}}
        d["block_id"] = tmp
        kids = [visit(c) for c in node.get("children", [])]
        if kids:
            d["children"] = kids
        if "_file" in node:
            images[tmp] = (node["_file"], node["_size"])
        descendants.append(d)
        return tmp

    top = [visit(n) for n in nodes]
    return top, descendants, images


def insert_image(client, doc_id, block_id, path, size):
    token = call(client.upload_media, path, "docx_image", block_id,
                 extra={"drive_route_token": doc_id})
    url = f"/open-apis/docx/v1/documents/{doc_id}/blocks/{block_id}"
    try:
        call(client.patch, url, {"replace_image": {"token": token, "width": size[0],
                                                   "height": size[1], "align": 2}},
             document_revision_id=-1)
    except LarkError as e:
        print(f"      replace_image with size failed ({e}); retrying without size", file=sys.stderr)
        call(client.patch, url, {"replace_image": {"token": token}}, document_revision_id=-1)


def create_descendants(client, doc_id, parent_id, nodes, safe=False):
    top, descendants, images = flatten(nodes, safe)
    res = call(client.post, f"/open-apis/docx/v1/documents/{doc_id}/blocks/{parent_id}/descendant",
               {"children_id": top, "index": -1, "descendants": descendants},
               document_revision_id=-1)
    rel = {r["temporary_block_id"]: r["block_id"] for r in res.get("block_id_relations", [])}
    return [rel[t] for t in top], [(rel[t], path, size) for t, (path, size) in images.items()]


def create_grid_stepwise(client, doc_id, grid):
    """Fallback: create an empty grid, set its column ratios, then fill each column."""
    base = f"/open-apis/docx/v1/documents/{doc_id}/blocks"
    res = call(client.post, f"{base}/{doc_id}/children",
               {"children": [{"block_type": BLOCK_GRID, "grid": {"column_size": len(grid["children"])}}],
                "index": -1}, document_revision_id=-1)
    grid_id = res["children"][0]["block_id"]
    col_ids = res["children"][0]["children"]
    call(client.patch, f"{base}/{grid_id}",
         {"update_grid_column_width_ratio": {
             "width_ratios": [c["grid_column"]["width_ratio"] for c in grid["children"]]}},
         document_revision_id=-1)
    images = []
    for col_id, col in zip(col_ids, grid["children"]):
        placeholder = call(client.get, f"{base}/{col_id}", document_revision_id=-1)["block"].get("children", [])
        _, imgs = create_descendants(client, doc_id, col_id, col["children"])
        images += imgs
        if placeholder:   # the API seeds each new column with an empty paragraph
            call(client._request, "DELETE", f"{base}/{col_id}/children/batch_delete",
                 params={"document_revision_id": -1},
                 body={"start_index": 0, "end_index": len(placeholder)})
    return [grid_id], images


def create_group(client, doc_id, nodes):
    try:
        return create_descendants(client, doc_id, doc_id, nodes)
    except LarkError as e:
        print(f"      create failed ({e}); retrying without optional styling", file=sys.stderr)
    try:
        return create_descendants(client, doc_id, doc_id, nodes, safe=True)
    except LarkError as e:
        if not (len(nodes) == 1 and nodes[0]["block_type"] == BLOCK_GRID):
            raise
        print(f"      create failed again ({e}); building the grid step by step", file=sys.stderr)
    return create_grid_stepwise(client, doc_id, nodes[0])


def verify(client, doc_id, created, groups):
    blocks = DocxTables(client, doc_id).blocks
    want, got, empty = {}, {}, 0
    for node in (n for g in groups for top in g for n in walk(top)):
        want[node["block_type"]] = want.get(node["block_type"], 0) + 1
    stack = list(created)
    while stack:
        b = blocks.get(stack.pop())
        if not b:
            continue
        got[b["block_type"]] = got.get(b["block_type"], 0) + 1
        if b["block_type"] == BLOCK_IMAGE and not b.get("image", {}).get("token"):
            empty += 1
        stack += b.get("children", [])
    # table cells may get an extra empty paragraph from the API; only check structural blocks
    keys = (BLOCK_GRID, BLOCK_GRID_COLUMN, BLOCK_IMAGE, BLOCK_TABLE, BLOCK_CALLOUT)
    diff = {NAMES[k]: (want.get(k, 0), got.get(k, 0)) for k in keys if want.get(k, 0) != got.get(k, 0)}
    return diff, empty


def doc_token(client, url):
    m = re.search(r"/docx/([A-Za-z0-9]+)", url)
    if m:
        return m.group(1)
    if "/wiki/" in url:
        obj_type, obj_token, _ = resolve_node(client, wiki_token(url))
        if obj_type != "docx":
            raise LarkError(f"wiki node is a {obj_type}, not a docx")
        return obj_token
    return url


def select(components, only, start, until):
    def index(key):
        if key.isdigit():
            return int(key) - 1
        for i, c in enumerate(components):
            if f"{c['name']} {c['cn']}".lower().startswith(key.lower()):
                return i
        sys.exit(f"no component matches {key!r}")

    if only:
        return [index(only)]
    return list(range(index(start) if start else 0,
                      index(until) + 1 if until else len(components)))


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("url")
    p.add_argument("--spec", required=True)
    p.add_argument("--only", help="write just this component")
    p.add_argument("--from", dest="start", help="write this component and the ones after it")
    p.add_argument("--until", help="stop after this component (inclusive)")
    p.add_argument("--no-intro", action="store_true", help="skip the overview table at the top")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--client", choices=("cli", "app"), default="cli" if shutil.which("lark-cli") else "app",
                   help="cli: lark-cli as the logged-in user (default when installed); app: LARK_APP_ID/SECRET")
    p.add_argument("--page-width", type=int, default=820, help="doc content width in px")
    p.add_argument("--max-img-h", type=int, default=380, help="max displayed mockup height in px")
    p.add_argument("--max-img-ratio", type=int, default=72, help="max grid share of the mockup column, %%")
    opts = p.parse_args()

    with open(opts.spec, encoding="utf-8") as f:
        spec = json.load(f)
    root = os.path.dirname(os.path.dirname(os.path.abspath(opts.spec)))
    image_dir = os.path.join(root, spec["image_dir"])
    picked = select(spec["components"], opts.only, opts.start, opts.until)
    with_intro = not (opts.no_intro or opts.only or opts.start)

    plan = []   # (label, groups)
    if with_intro:
        plan.append(("总览", intro_nodes(spec, opts)))
    for i in picked:
        comp = spec["components"][i]
        groups = component_nodes(comp, image_dir, opts)
        if i > 0:
            groups.insert(0, [{"block_type": BLOCK_DIVIDER, "divider": {}}])
        plan.append((f"{comp['name']} {comp['cn']}", groups))

    problems = []
    for label, groups in plan:
        problems += [f"{label}: {x}" for x in check(groups, opts)]
    if opts.dry_run:
        for label, groups in plan:
            print(f"\n== {label}")
            for g in groups:
                for top in g:
                    print("\n".join(describe(top, "  ")))
        images = sum(1 for _, gs in plan for g in gs for t in g for n in walk(t) if n["block_type"] == BLOCK_IMAGE)
        tallest = max((n["_size"][1] for _, gs in plan for g in gs for t in g for n in walk(t)
                       if n["block_type"] == BLOCK_IMAGE), default=0)
        print(f"\n{len(plan)} sections, {images} images (tallest {tallest}px), "
              f"{len(problems)} problems")
        for x in problems:
            print("  PROBLEM", x)
        return 1 if problems else 0
    if problems:
        sys.exit("refusing to write:\n  " + "\n  ".join(problems))

    if opts.client == "app":
        app_id, secret = os.environ.get("LARK_APP_ID"), os.environ.get("LARK_APP_SECRET")
        if not app_id or not secret:
            sys.exit("set LARK_APP_ID and LARK_APP_SECRET, or use --client cli")
    progress_path = os.path.join(image_dir, "progress.json")
    try:
        with open(progress_path, encoding="utf-8") as f:
            progress = json.load(f)
    except FileNotFoundError:
        progress = {}
    try:
        client = CliClient() if opts.client == "cli" else Client(app_id, secret)
        doc_id = doc_token(client, opts.url)
        progress.setdefault(doc_id, {})
        for label, groups in plan:
            print(f"== {label}")
            created = []
            for g in groups:
                ids, images = create_group(client, doc_id, g)
                created += ids
                progress[doc_id][label] = created
                with open(progress_path, "w", encoding="utf-8") as f:
                    json.dump(progress, f, ensure_ascii=False, indent=1)
                print("  " + " / ".join(describe(top)[0].split(None, 1)[0] for top in g)
                      + f"  -> {', '.join(ids)}")
                for block_id, path, size in images:
                    insert_image(client, doc_id, block_id, path, size)
                    print(f"    image {os.path.basename(path)} {size[0]}×{size[1]}")
            diff, empty = verify(client, doc_id, created, groups)
            status = "ok" if not diff and not empty else f"MISMATCH {diff} empty_images={empty}"
            print(f"  verify: {status}")
            if diff or empty:
                return 1
    except LarkError as e:
        sys.exit(f"error: {e}  (created block ids so far: {progress_path})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
