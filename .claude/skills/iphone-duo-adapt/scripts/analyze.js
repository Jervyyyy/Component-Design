// iPhone DUO adapt · analyze (READ-ONLY). Paste the whole file as `code` into use_figma.
// Edit only the PARAMS line. Returns page judgment + block inventory used to pick schemes.
const PARAMS = { sourceId: "SOURCE_NODE_ID" };

const NAV_RE = /navigation\s*bar|navbar|nav\s*bar|导航栏|标题栏|header/i;
const STATUS_RE = /status\s*bar|状态栏/i;
const BOTTOM_RE = /tab\s*bar|bottom|底部|footer|toolbar|操作栏|提交栏|按钮栏|home\s*indicator/i;
const GLOBAL_NAV_RE = /tab\s*bar|全局导航|global\s*nav/i;
const OVERLAY_RE = /sheet|popup|弹窗|浮层|弹层|modal|dialog|toast|snackbar|提示条/i;

const src = await figma.getNodeByIdAsync(PARAMS.sourceId);
if (!src) throw new Error("source not found: " + PARAMS.sourceId);
let page = src; while (page.type !== "PAGE") page = page.parent;
await figma.setCurrentPageAsync(page);
let top = src; while (top.parent.type !== "PAGE") top = top.parent;

const r = (v) => Math.round(v);
const rootW = src.width;
const inner = (n) => n.width - (n.paddingLeft || 0) - (n.paddingRight || 0);
const visFill = (n) => "fills" in n && Array.isArray(n.fills) && n.fills.some((f) => f.visible !== false && (f.opacity ?? 1) > 0.05);
const hasImage = (n) => "fills" in n && Array.isArray(n.fills) && n.fills.some((f) => f.type === "IMAGE" && f.visible !== false);
const radius = (n) => (typeof n.cornerRadius === "number" ? n.cornerRadius : n.topLeftRadius || 0);
const cardLike = (n) => (n.type === "FRAME" || n.type === "INSTANCE") && visFill(n) && radius(n) > 0 && n.width < rootW - 1;
async function compKey(n) {
  if (n.type !== "INSTANCE") return null;
  const mc = await n.getMainComponentAsync();
  if (!mc) return null;
  const set = mc.parent && mc.parent.type === "COMPONENT_SET" ? mc.parent : null;
  return { key: mc.key, name: mc.name, set: set ? set.name : null, setKey: set ? set.key : null };
}
function overflowX(n) {
  if (n.layoutMode !== "HORIZONTAL" || !("children" in n)) return false;
  const kids = n.children.filter((c) => c.visible && c.layoutPositioning !== "ABSOLUTE");
  const sum = kids.reduce((a, c) => a + c.width, 0) + Math.max(0, kids.length - 1) * (n.itemSpacing || 0) + (n.paddingLeft || 0) + (n.paddingRight || 0);
  return sum > n.width + 1;
}

if (!("children" in src)) throw new Error("source must be a frame-like node, got " + src.type);
const kids = src.children.filter((c) => c.visible);
const status = kids.find((c) => STATUS_RE.test(c.name) && c.y < 4 && c.height <= 64);
let nav = kids.find((c) => c.y < 8 && c.height >= 44 && c.height <= 140 && c.width >= rootW * 0.9 && NAV_RE.test(c.name));
if (!nav) for (const c of kids) { const k = await compKey(c); if (k && k.set && NAV_RE.test(k.set) && c.y < 8) { nav = c; break; } }
const bottom = kids.find((c) => c !== nav && c.y + c.height >= src.height - 2 && c.height >= 44 && c.height <= 160 && c.width >= rootW * 0.9 && BOTTOM_RE.test(c.name));
const navInfo = nav ? { id: nav.id, name: nav.name, h: r(nav.height), comp: await compKey(nav),
  texts: ("findAll" in nav ? nav.findAll((t) => t.type === "TEXT" && t.visible) : []).map((t) => t.characters.slice(0, 40)).filter((t) => !/^\d{1,2}:\d{2}$/.test(t)) } : null;

// content containers = remaining in-flow children
const content = kids.filter((c) => c !== nav && c !== status && c !== bottom && c.layoutPositioning !== "ABSOLUTE");
const absolutes = kids.filter((c) => c.layoutPositioning === "ABSOLUTE").map((c) => ({ id: c.id, name: c.name, w: r(c.width), h: r(c.height), fullWidth: Math.abs(c.width - rootW) < 1.5 }));
const containers = content.filter((c) => c.type === "FRAME" && c.layoutMode === "VERTICAL").map((c) => ({ id: c.id, name: c.name, w: r(c.width), h: r(c.height), padL: c.paddingLeft, padR: c.paddingRight, gap: c.itemSpacing }));
const margins = containers.map((c) => c.padL).filter((v) => v > 0);
const margin = src.layoutMode !== "NONE" && src.paddingLeft > 0 ? src.paddingLeft : margins.length ? margins[0] : null;

// blocks: children of the main container (largest), else root content
const main = content.filter((c) => "children" in c).sort((a, b) => b.height - a.height)[0];
const blockParent = main && main.type === "FRAME" && main.layoutMode !== "NONE" ? main : src;
const pInner = inner(blockParent);
const blocks = [];
let idx = 0;
for (const b of blockParent.children) {
  if (!b.visible || b === nav || b === status || b === bottom) continue;
  let kind = "block";
  if (b.layoutPositioning === "ABSOLUTE") kind = "absolute";
  else if (b.type === "TEXT") kind = "text";
  else if (hasImage(b) && b.width >= pInner * 0.9) kind = "media";
  else if (overflowX(b)) kind = "hscroll";
  else if (cardLike(b)) kind = "card";
  const o = { idx: idx++, id: b.id, name: b.name.slice(0, 40), type: b.type, kind, w: r(b.width), h: r(b.height), sizingH: b.layoutSizingHorizontal };
  if (b.type === "TEXT") o.text = b.characters.slice(0, 40);
  else if ("findAll" in b) { const t = b.findOne((n) => n.type === "TEXT" && n.visible); if (t) o.text = t.characters.slice(0, 40); }
  blocks.push(o);
}
// repeat groups (grid candidates): >=2 similar siblings, not inside instances
const groups = [];
// similar = same component, or same width + layout + first-level child structure (names are often auto "Frame 123")
async function sig(n) { const k = await compKey(n); return k ? "C:" + k.key : [n.type, r(n.width), n.layoutMode || "", "children" in n ? n.children.map((c) => c.type).join(",") : ""].join(":"); }
async function scan(n, depth) {
  if (depth > 5 || !("children" in n) || n.type === "INSTANCE") return;
  const cs = n.children.filter((c) => c.visible && c.layoutPositioning !== "ABSOLUTE");
  let run = [];
  const flush = () => {
    if (run.length >= 2 && run[0].width >= 80 && run[0].height >= 32 && run[0].type !== "TEXT")
      groups.push({ parentId: n.id, parentName: n.name.slice(0, 30), parentLayout: n.layoutMode, overflow: overflowX(n), itemIds: run.map((x) => x.id), count: run.length,
        itemW: r(run[0].width), itemH: r(run[0].height), allChildren: run.length === cs.length, inAutoLayout: n.layoutMode !== "NONE", depth });
    run = [];
  };
  let prev = null;
  for (const c of cs) {
    const s = await sig(c);
    if (prev && s === prev && Math.abs(c.height - run[run.length - 1].height) <= Math.max(40, c.height * 0.5)) run.push(c);
    else { flush(); run = [c]; }
    prev = s;
  }
  flush();
  for (const c of cs) await scan(c, depth + 1);
}
await scan(blockParent, 0);
// card layout if most blocks are cards, counting the cards inside repeated groups (e.g. a list of cards)
let cardCount = blocks.filter((b) => b.kind === "card").length;
for (const g of groups) for (const id of g.itemIds) { const n = await figma.getNodeByIdAsync(id); if (n && cardLike(n)) { cardCount++; break; } }
const layoutType = cardCount >= Math.max(1, blocks.filter((b) => b.kind !== "text" && b.kind !== "absolute").length / 2) ? "card" : "fullBleed";

// images (for the 3:4 narrow-card rule) and fixed-width nodes that will not stretch
const images = [], fixedNarrow = [], overlays = [];
blockParent.findAll((n) => {
  if (!n.visible) return false;
  if (hasImage(n) && n.width < pInner * 0.9) images.push({ id: n.id, w: r(n.width), h: r(n.height), ratio: +(n.width / n.height).toFixed(2), parentLayout: n.parent.layoutMode || "NONE" });
  if (n.parent && n.parent.layoutMode && n.parent.layoutMode !== "NONE" && n.layoutPositioning !== "ABSOLUTE" && n.layoutSizingHorizontal === "FIXED" && n.type !== "TEXT" && n.width >= 160 && n.width < inner(n.parent) - 1.5) fixedNarrow.push({ id: n.id, name: n.name.slice(0, 30), w: r(n.width), parentInner: r(inner(n.parent)) });
  return false;
});
src.findAll((n) => { if (OVERLAY_RE.test(n.name) && n.visible && n.width >= rootW * 0.8) overlays.push({ id: n.id, name: n.name.slice(0, 30), y: r(n.absoluteBoundingBox ? n.absoluteBoundingBox.y - src.absoluteBoundingBox.y : n.y), w: r(n.width), h: r(n.height) }); return false; });

const warnings = [];
if (src.layoutMode === "NONE") warnings.push("根节点不是自动布局：生成时只能按约束拉伸，需重点人工检查");
if (!nav) warnings.push("未识别到 NavigationBar：生成时不会替换标题栏");
if (![375, 390, 393, 402, 414, 428, 430, 440].includes(r(rootW))) warnings.push("根宽度 " + r(rootW) + " 不是常见直板机宽度，确认这是一整屏设计稿");
if (fixedNarrow.length) warnings.push(fixedNarrow.length + " 个固定宽度节点不会随窗口变宽（见 fixedNarrow）");

return {
  source: { id: src.id, name: src.name, type: src.type, page: { id: page.id, name: page.name }, topLevel: { id: top.id, name: top.name, type: top.type }, w: r(rootW), h: r(src.height), layoutMode: src.layoutMode, singleScreen: src.height <= 940 },
  guess: { pageType: bottom && GLOBAL_NAV_RE.test(bottom.name) ? "primary" : "secondary", layoutType, hasBottomBar: !!bottom, margin },
  nav: navInfo, statusBar: status ? { id: status.id, name: status.name } : null,
  bottomBar: bottom ? { id: bottom.id, name: bottom.name, h: r(bottom.height), kind: GLOBAL_NAV_RE.test(bottom.name) ? "globalNav" : "contentBar" } : null,
  containers, absolutes, blockParent: { id: blockParent.id, name: blockParent.name, inner: r(pInner) }, blocks,
  repeatGroups: groups.slice(0, 20), images: images.slice(0, 20), fixedNarrow: fixedNarrow.slice(0, 20), overlays, warnings,
};
