// iPhone DUO adapt · generate (WRITES to the canvas). Paste the whole file as `code` into use_figma.
// Edit only the PARAMS line (single line of JSON). mode "proposal" = 推荐/备选方案示意图（每屏裁成一屏高）；
// mode "final" = 设计师确认后的 01/02/03 适配稿（整页高度），默认放在直板机稿右侧。
const PARAMS = {"sourceId":"SOURCE_NODE_ID","mode":"proposal","target":null,"header":[],"rows":[{"tag":"推荐方案","forms":[{"form":"outer","vb":"B"},{"form":"innerPortrait"},{"form":"innerLandscape","vb":"B"}]},{"tag":"备选方案","forms":[{"form":"outer","vb":"A"},{"form":"innerPortrait"},{"form":"innerLandscape","vb":"A"}]}],"notes":[]};

const KEYS = Object.assign({
  navBar: "1b79ad4a7271c7a21156b368abfbbba683df03fa",       // NavigationBar · theme=default, type=basic（DUO 头部 84）
  paneControls: "40a28888ff30ebd6a973037e2901cd4d9e5801c8", // Pane controls · Type=Leading（Vertical Bar 84）
  statusBar: "791e5b94f148b6840d22cfff3df3cbcb2219bd37",    // Status bar · Dynamic Island=Off, orientation=vertical
  hinge: "50082a1c865b7a71a48a545ae8e374d5cd6c8280",        // .NavigationSplitView.Hinge · state=fold
}, PARAMS.keys || {});
const FORMS = {
  outer: { no: "01", key: "outerPortrait", label: "外屏", W: 466, H: 678, vbW: 84, rrW: 0 },
  innerPortrait: { no: "02", key: "innerPortrait", label: "内屏竖屏", W: 669, H: 951, vbW: 0, rrW: 151 },
  innerLandscape: { no: "03", key: "innerLandscape", label: "内屏横屏", W: 951, H: 669, vbW: 84, rrW: 0 },
};
const NAV_RE = /navigation\s*bar|navbar|nav\s*bar|导航栏|标题栏|header/i;
const STATUS_RE = /status\s*bar|状态栏/i;
const BOTTOM_RE = /tab\s*bar|bottom|底部|footer|toolbar|操作栏|提交栏|按钮栏|home\s*indicator/i;
const C_TITLE = { r: 0.06, g: 0.16, b: 0.3 }, C_SUB = { r: 0.27, g: 0.35, b: 0.45 }, C_WARN = { r: 0.85, g: 0.33, b: 0.1 };
const warnings = [], applied = [];
const warn = (m) => { if (!warnings.includes(m)) warnings.push(m); };

const src = await figma.getNodeByIdAsync(PARAMS.sourceId);
if (!src || !("children" in src)) throw new Error("source frame not found: " + PARAMS.sourceId);
if (src.type === "COMPONENT_SET" || src.type === "SECTION" || src.type === "GROUP") throw new Error("source must be a FRAME / COMPONENT / INSTANCE screen, got " + src.type);
let page = src; while (page.type !== "PAGE") page = page.parent;
await figma.setCurrentPageAsync(page);
let anchor = src; while (anchor.parent.type !== "PAGE") anchor = anchor.parent;
const rootW = src.width, singleScreen = src.height <= 940;

// ---------- fonts / text ----------
let FONT = null;
for (const [fam, st] of [["Trip-Inter Variable", ["Regular", "SemiBold", "Bold"]], ["Inter", ["Regular", "Semi Bold", "Bold"]]]) {
  try { for (const s of st) await figma.loadFontAsync({ family: fam, style: s }); FONT = { R: { family: fam, style: st[0] }, M: { family: fam, style: st[1] }, B: { family: fam, style: st[2] } }; break; } catch (e) {}
}
function txt(chars, font, size, color, width) {
  const t = figma.createText(); t.fontName = font; t.fontSize = size; t.characters = String(chars); t.fills = [{ type: "SOLID", color }];
  if (width) { t.textAutoResize = "HEIGHT"; t.resize(width, t.height); }
  return t;
}
async function loadTextFonts(t) { try { await Promise.all(t.getRangeAllFontNames(0, t.characters.length).map((f) => figma.loadFontAsync(f))); return true; } catch (e) { return false; } }
// moving / inserting nodes that contain text throws "unloaded font" unless every font inside is loaded first
async function loadNodeFonts(n) {
  const fs = new Set();
  for (const t of "findAll" in n ? n.findAll((x) => x.type === "TEXT") : n.type === "TEXT" ? [n] : []) try { for (const f of t.getRangeAllFontNames(0, t.characters.length)) fs.add(JSON.stringify(f)); } catch (e) {}
  for (const f of fs) try { await figma.loadFontAsync(JSON.parse(f)); } catch (e) { warn("字体不可用：" + JSON.parse(f).family + " " + JSON.parse(f).style); }
}
await loadNodeFonts(src);

// ---------- components: import by key → reuse a copy already on this page → SVG replica ----------
const cache = {};
const INST_NAMES = { navBar: /navigation\s*bar|header/i, paneControls: /^pane controls$/i, statusBar: /^status bar$/i, hinge: /^hinge$/i };
async function comp(name) {
  if (name in cache) return cache[name];
  let c = null;
  try { c = await figma.importComponentByKeyAsync(KEYS[name]); } catch (e) {}
  if (!c) for (const i of figma.currentPage.findAllWithCriteria({ types: ["INSTANCE"] })) {
    if (!INST_NAMES[name].test(i.name)) continue;
    const mc = await i.getMainComponentAsync(); if (mc && mc.key === KEYS[name]) { c = mc; break; }
  }
  if (!c) warn(`组件 ${name} 无法导入（库未发布或无权限），已用矢量复刻代替`);
  return (cache[name] = c);
}
function levelsSvg(cx, cy) {
  const r = 19, a = (d) => [cx + r * Math.cos((d * Math.PI) / 180), cy + r * Math.sin((d * Math.PI) / 180)].map((v) => v.toFixed(1)).join(" ");
  return `<path d="M ${a(125)} A ${r} ${r} 0 1 1 ${a(55)}" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"/>` +
    [[-7, 16], [-2.5, 17.5], [2.5, 17.5], [7, 16]].map(([dx, dy]) => `<circle cx="${cx + dx}" cy="${cy + dy}" r="2" fill="#000"/>`).join("") +
    `<path d="M ${cx - 8} ${cy - 3} a 11.3 11.3 0 0 1 16 0" fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="round"/>` +
    `<path d="M ${cx - 4.6} ${cy + 0.6} a 6.5 6.5 0 0 1 9.2 0" fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="round"/><circle cx="${cx}" cy="${cy + 4}" r="1.9" fill="#000"/>`;
}
function svgNode(w, h, body, name) {
  const n = figma.createNodeFromSvg(`<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`);
  n.name = name; n.fills = []; return n;
}
function timeText(w) { const t = txt("9:41", FONT.B, 16, { r: 0, g: 0, b: 0 }); t.textAlignHorizontal = "CENTER"; t.textAutoResize = "HEIGHT"; t.resize(w, t.height); return t; }
async function sysPart(name, h) {
  const C = await comp(name);
  if (C) {
    const i = C.createInstance(); await loadNodeFonts(i);
    if (name === "paneControls") for (const c of i.children) if (/controls/i.test(c.name)) c.visible = false; // 只保留系统状态，不放业务控件
    return i;
  }
  if (name === "paneControls") { // Vertical Bar 84 宽：摄像头 + 时间 + 信号环
    const f = figma.createFrame(); f.name = "Vertical Bar（复刻）"; f.fills = []; f.resize(84, h); f.clipsContent = false;
    const g = svgNode(48, 136, `<circle cx="24" cy="18" r="18" fill="#000"/>` + levelsSvg(24.5, 108.5), "Status"); f.appendChild(g); g.x = 12; g.y = 29;
    const t = timeText(48); f.appendChild(t); t.x = 12; t.y = 90; return f;
  }
  if (name === "statusBar") { // Reserved Region 内：时间 + 信号环（104×48）
    const f = figma.createFrame(); f.name = "Status bar（复刻）"; f.fills = []; f.resize(104, 48); f.clipsContent = false;
    const g = svgNode(104, 48, levelsSvg(80.5, 23.5), "Levels"); f.appendChild(g);
    const t = timeText(46); f.appendChild(t); t.x = 8; t.y = 14; return f;
  }
  if (name === "hinge") { const l = figma.createRectangle(); l.name = "Hinge 折痕（复刻）"; l.resize(1, Math.max(1, h)); l.fills = [{ type: "SOLID", color: { r: 0.89, g: 0.9, b: 0.92 } }]; return l; }
  return null;
}

// ---------- source helpers ----------
const inner = (n) => n.width - (n.paddingLeft || 0) - (n.paddingRight || 0);
function pathOf(node) { const p = []; let n = node; while (n.id !== src.id) { const par = n.parent; if (!par || par.type === "PAGE") return null; p.unshift(par.children.indexOf(n)); n = par; } return p; }
function at(root, p) { let n = root; for (const i of p) { if (!n || !("children" in n)) return null; n = n.children[i]; } return n || null; }
const pathCache = {};
async function srcPath(id) { if (!(id in pathCache)) { const n = await figma.getNodeByIdAsync(id); pathCache[id] = n ? pathOf(n) : null; } return pathCache[id]; }
async function inClone(root, id) { const p = await srcPath(id); if (!p) { warn("节点 " + id + " 不在直板机稿内，已忽略"); return null; } return at(root, p); }
function walkNoInst(n, fn) { if (!("children" in n)) return; for (const c of n.children) { if (!c.visible) continue; fn(c); if (c.type !== "INSTANCE") walkNoInst(c, fn); } }
async function setNameKey(n) { if (n.type !== "INSTANCE") return ""; const mc = await n.getMainComponentAsync(); return mc && mc.parent && mc.parent.type === "COMPONENT_SET" ? mc.parent.name : mc ? mc.name : ""; }
async function detect(f) {
  const kids = f.children.filter((c) => c.visible);
  const status = kids.find((c) => STATUS_RE.test(c.name) && c.y < 4 && c.height <= 64);
  let nav = kids.find((c) => c.y < 8 && c.height >= 44 && c.height <= 140 && c.width >= rootW * 0.9 && NAV_RE.test(c.name));
  if (!nav) for (const c of kids) if (c.y < 8 && NAV_RE.test(await setNameKey(c))) { nav = c; break; }
  const bottom = kids.find((c) => c !== nav && c.y + c.height >= f.height - 2 && c.height >= 44 && c.height <= 160 && c.width >= rootW * 0.9 && BOTTOM_RE.test(c.name));
  const bgs = kids.filter((c) => c !== nav && c !== bottom && c.layoutPositioning === "ABSOLUTE" && Math.abs(c.width - rootW) < 1.5);
  const flow = kids.filter((c) => c !== nav && c !== status && c !== bottom && c.layoutPositioning !== "ABSOLUTE");
  const containers = flow.filter((c) => c.type === "FRAME" && c.layoutMode === "VERTICAL" && c.paddingLeft > 0 && c.paddingLeft === c.paddingRight);
  return { nav, status, bottom, bgs, flow, containers };
}
function pageMargin(W, lt) { if (W < 600) return 20; if (W < 834) return lt === "fullBleed" ? 32 : 24; if (W < 1184) return lt === "fullBleed" ? 40 : 32; return Math.round((W - 1120) / 2); }
function cloneSource() {
  let c = src.type === "COMPONENT" ? src.createInstance() : src.clone();
  if (c.type === "INSTANCE") c = c.detachInstance();
  return c;
}

// ---------- one screen form ----------
async function adapt(cfg, mode, host) {
  const F = FORMS[cfg.form]; if (!F) throw new Error("unknown form " + cfg.form);
  const split = cfg.form === "innerLandscape" && cfg.split ? cfg.split : null;
  const vb = F.vbW ? (cfg.vb === "A" ? "A" : "B") : null;
  const W = F.W, vbW = F.vbW, cW = W - vbW, lt = cfg.layoutType || PARAMS.layoutType || "card";
  const margin = cfg.margin != null ? cfg.margin : split ? pageMargin(split.primaryWidth || Math.round(W / 2), lt) : pageMargin(cW, lt);
  const f = cloneSource(); host.appendChild(f);
  f.name = `${F.no} ${F.key} · ${src.name}`;
  // resolve every referenced source id in the clone BEFORE restructuring
  const grid = [];
  for (const g of cfg.grid || []) grid.push({ g, parent: await inClone(f, g.parentId), items: (await Promise.all((g.itemIds || []).map((id) => inClone(f, id)))).filter(Boolean) });
  const secondary = split ? (await Promise.all((split.secondaryIds || []).map((id) => inClone(f, id)))).filter(Boolean) : [];
  const d = await detect(f);
  const isAL = f.layoutMode && f.layoutMode !== "NONE";
  const oldMargin = isAL && f.paddingLeft > 0 ? f.paddingLeft : d.containers[0] ? d.containers[0].paddingLeft : null;

  // nodes that fill their parent today must keep filling it after the width change
  const fills = [];
  walkNoInst(f, (c) => {
    const p = c.parent;
    if (!p || p.layoutMode !== "VERTICAL" || c.layoutPositioning === "ABSOLUTE" || c.layoutSizingHorizontal !== "FIXED" || c === d.nav) return;
    const w = inner(p);
    if (Math.abs(c.width - w) <= 1.5 || (c.type === "TEXT" && c.width >= w * 0.85)) fills.push(c);
  });

  // 1) window width + Vertical Bar avoidance
  if (isAL) {
    if (f.paddingLeft > 0 && f.paddingLeft === oldMargin) { f.paddingLeft = margin; f.paddingRight = margin + (split ? 0 : vbW); }
    else f.paddingRight = (f.paddingRight || 0) + (split ? 0 : vbW);
    f.resize(W, f.height);
  } else {
    f.resize(cW, f.height); f.resizeWithoutConstraints(W, f.height);
    warn("直板机稿根节点不是自动布局：内容按约束拉伸，请人工检查");
  }
  for (const b of d.bgs) { b.resize(vb === "A" ? cW : W, b.height); b.x = 0; }
  for (const c of d.containers) if (c.paddingLeft === oldMargin) { c.paddingLeft = margin; c.paddingRight = margin; }
  if (oldMargin != null && oldMargin !== margin) applied.push(`${F.key}: 页边距 ${oldMargin} → ${margin}`);
  for (const c of fills) { try { if (c.type === "TEXT" && !(await loadTextFonts(c))) continue; if (c.type === "TEXT" && c.textAutoResize === "WIDTH_AND_HEIGHT") c.textAutoResize = "HEIGHT"; c.layoutSizingHorizontal = "FILL"; } catch (e) {} }
  if (d.bottom) {
    if (d.bottom.layoutPositioning === "ABSOLUTE" || !isAL) { d.bottom.x = 0; d.bottom.resize(cW, d.bottom.height); d.bottom.constraints = { horizontal: "STRETCH", vertical: "MAX" }; }
    if (/tab\s*bar|全局导航|global/i.test(d.bottom.name)) warn("全局导航是系统控件：DUO 上按系统尺寸/方向显示（可能变为右侧竖排），稿中仅示意");
  }

  // 2) title bar → TDS NavigationBar with the DUO overrides（头部 84 = 24 + 48 + 12，状态栏隐藏，标题左对齐，左侧按钮距边 = 页边距）
  if (d.nav) {
    const C = await comp("navBar");
    if (C) {
      const inst = C.createInstance(); await loadNodeFonts(inst); const par = d.nav.parent;
      par.insertChild(par.children.indexOf(d.nav), inst); inst.name = "NavigationBar · DUO";
      const dst = inst.componentProperties, base = (k) => k.split("#")[0];
      if (d.nav.type === "INSTANCE") for (const [k, v] of Object.entries(d.nav.componentProperties)) {
        const dk = Object.keys(dst).find((x) => base(x) === base(k) && dst[x].type === v.type);
        if (dk) try { inst.setProperties({ [dk]: v.value }); } catch (e) {}
      }
      const srcMain = d.nav.type === "INSTANCE" ? await d.nav.getMainComponentAsync() : null;
      if (srcMain && srcMain.key === C.key) {
        // same component: replay the designer's overrides (icons, hidden title, transparent bg …)
        const ovs = (d.nav.overrides || []).slice().sort((a, b) => a.id.split(";").length - b.id.split(";").length);
        const pre = "I" + d.nav.id + ";";
        figma.skipInvisibleInstanceChildren = false; // hidden layers (e.g. a hidden title) are otherwise unreachable
        for (const o of ovs) {
          if (o.id !== d.nav.id && !o.id.startsWith(pre)) continue;
          const sn = o.id === d.nav.id ? d.nav : await figma.getNodeByIdAsync(o.id);
          const dn = o.id === d.nav.id ? inst : await figma.getNodeByIdAsync("I" + inst.id + ";" + o.id.slice(pre.length));
          if (!sn || !dn) continue;
          for (const fld of o.overriddenFields) try {
            if (fld === "componentProperties" && sn !== d.nav && sn.type === "INSTANCE") dn.setProperties(Object.fromEntries(Object.entries(sn.componentProperties).map(([k, v]) => [k, v.value])));
            else if (fld === "visible" || fld === "opacity") dn[fld] = sn[fld];
            else if (fld === "fills" || fld === "strokes") dn[fld] = JSON.parse(JSON.stringify(sn[fld]));
            else if (fld === "characters" && sn.type === "TEXT" && (await loadTextFonts(dn))) dn.characters = sn.characters;
          } catch (e) {}
        }
      } else {
        const t = d.nav.findAll ? d.nav.findAll((n) => n.type === "TEXT" && n.visible && !/^\d{1,2}:\d{2}$/.test(n.characters)).sort((a, b) => b.fontSize - a.fontSize)[0] : null;
        const tk = Object.keys(dst).find((x) => /title|标题/i.test(base(x)) && dst[x].type === "TEXT");
        if (t && tk) try { inst.setProperties({ [tk]: t.characters }); } catch (e) {}
        warn("原标题栏不是 TDS NavigationBar：已换成 DUO 标题栏并迁移标题文字，左右操作按钮需人工核对");
      }
      const lead = Math.max(20, margin);
      const sb = inst.children.find((c) => STATUS_RE.test(c.name)); if (sb) sb.visible = false;
      inst.paddingTop = 12; inst.primaryAxisAlignItems = "CENTER"; inst.primaryAxisSizingMode = "FIXED"; inst.resize(cW, 84);
      const bar = inst.children.find((c) => c.type === "FRAME" && c.layoutMode === "HORIZONTAL");
      if (bar) {
        bar.paddingLeft = bar.paddingRight = lead + 40;
        for (const c of bar.children) {
          if (/title/i.test(c.name) && "counterAxisAlignItems" in c) { c.counterAxisAlignItems = "MIN"; for (const t of c.findAll((n) => n.type === "TEXT")) if (await loadTextFonts(t)) t.textAlignHorizontal = "LEFT"; }
          else if (/trailing/i.test(c.name) && "paddingRight" in c) c.paddingRight = lead;
          else if (c.type === "FRAME" && c.layoutPositioning === "ABSOLUTE") { c.primaryAxisSizingMode = "AUTO"; c.paddingLeft = lead; }
        }
      }
      if (d.nav.layoutPositioning === "ABSOLUTE" || !isAL) { if (isAL) inst.layoutPositioning = "ABSOLUTE"; inst.x = 0; inst.y = 0; }
      else inst.layoutSizingHorizontal = "FILL";
      if (F.rrW) inst.paddingRight = F.rrW;
      d.nav.remove();
      applied.push(`${F.key}: 标题栏改为 DUO 头部 84（24+48+12），标题左对齐，左侧按钮距边 ${lead}`);
    } else {
      const sb = d.nav.findOne ? d.nav.findOne((n) => STATUS_RE.test(n.name)) : null; if (sb) sb.visible = false;
      warn("DUO NavigationBar 组件不可用：保留原标题栏并隐藏状态栏，需人工改为 24+48+12 头部、标题左对齐");
    }
  }
  if (d.status) d.status.remove();

  // 3) grids（卡片网格化）
  const pend = [];
  for (const { g, parent, items } of grid) {
    if (!parent || items.length < 2) { warn("网格配置无效：" + g.parentId); continue; }
    const cols = g.columns || 2, gap = g.gap != null ? g.gap : parent.itemSpacing || 12;
    try {
      let box = parent;
      const flow = parent.children.filter((c) => c.visible && c.layoutPositioning !== "ABSOLUTE");
      if (items.length === flow.length) {
        parent.layoutMode = "HORIZONTAL"; parent.layoutWrap = "WRAP"; parent.itemSpacing = gap; parent.counterAxisSpacing = gap;
        try { parent.layoutSizingHorizontal = "FILL"; } catch (e) {} try { parent.layoutSizingVertical = "HUG"; } catch (e) {}
      } else {
        box = figma.createAutoLayout("HORIZONTAL", { name: `DUO Grid ×${cols}`, fills: [], itemSpacing: gap });
        parent.insertChild(parent.children.indexOf(items[0]), box);
        box.layoutWrap = "WRAP"; box.counterAxisSpacing = gap;
        for (const it of items) box.appendChild(it);
        box.layoutSizingHorizontal = "FILL";
      }
      pend.push({ box, items, cols, gap });
    } catch (e) { warn(`网格 ${g.parentId} 无法改为 ${cols} 列（${String(e.message).slice(0, 60)}），可能位于组件实例内部`); }
  }

  // 4) Main–Support / List–Detail split（仅内屏横屏）
  let secondaryBox = null;
  if (split && isAL) {
    const pW = split.primaryWidth || Math.round(W / 2), m2 = split.secondaryMargin != null ? split.secondaryMargin : pageMargin(W - pW - vbW, lt);
    const flow = f.children.filter((c) => c.layoutPositioning !== "ABSOLUTE");
    const primary = figma.createAutoLayout("VERTICAL", { name: "Primary", fills: [] });
    f.insertChild(f.children.indexOf(flow[0]), primary);
    for (const c of flow) primary.appendChild(c);
    f.layoutMode = "HORIZONTAL"; f.itemSpacing = 0; f.paddingLeft = 0; f.paddingRight = 0; f.counterAxisAlignItems = "MIN";
    f.primaryAxisSizingMode = "FIXED"; f.resize(W, f.height);
    primary.resize(pW, primary.height); primary.layoutSizingVertical = "HUG";
    for (const c of flow) try { c.layoutSizingHorizontal = "FILL"; } catch (e) {}
    const hinge = await sysPart("hinge", f.height); hinge.name = "Hinge"; f.appendChild(hinge); try { hinge.layoutSizingVertical = "FILL"; } catch (e) {}
    secondaryBox = figma.createAutoLayout("VERTICAL", { name: "Secondary", fills: [], paddingTop: 24, paddingBottom: 24, paddingLeft: m2, paddingRight: m2 + vbW, itemSpacing: d.containers[0] ? d.containers[0].itemSpacing : 12 });
    f.appendChild(secondaryBox); secondaryBox.layoutSizingHorizontal = "FILL"; secondaryBox.layoutSizingVertical = "HUG";
    for (const n of secondary) { secondaryBox.appendChild(n); try { n.layoutSizingHorizontal = "FILL"; } catch (e) {} }
    if (split.detailSourceId) {
      const ds = await figma.getNodeByIdAsync(split.detailSourceId);
      if (ds && "children" in ds) {
        await loadNodeFonts(ds); let dc = ds.clone(); if (dc.type === "INSTANCE") dc = dc.detachInstance();
        const dd = await detect(dc);
        secondaryBox.paddingLeft = 0; secondaryBox.paddingRight = vbW;
        for (const c of dd.flow) { secondaryBox.appendChild(c); try { c.layoutSizingHorizontal = "FILL"; } catch (e) {} if (c.layoutMode === "VERTICAL" && c.paddingLeft > 0) { c.paddingLeft = m2; c.paddingRight = m2; } }
        dc.remove();
        warn("List–Detail：列表需新增选中态（TDS selected），默认选中第一项；两栏各自滚动");
      } else warn("detailSourceId 无效：" + split.detailSourceId);
    }
    applied.push(`${F.key}: ${split.detailSourceId ? "List–Detail" : "Main–Support"} 分栏（主栏 ${pW}，次栏边距 ${m2}，标题栏只覆盖主栏）`);
  } else if (split) warn("根节点非自动布局，无法自动分栏");

  // 5) height: proposal = one screen; final = hug content (single-screen sources keep the device height)
  if (mode === "proposal" || singleScreen || !isAL) { f.resize(W, F.H); if (mode === "proposal" && f.layoutMode === "VERTICAL") f.primaryAxisAlignItems = "MIN"; }
  else if (f.layoutMode === "VERTICAL") f.primaryAxisSizingMode = "AUTO"; else f.counterAxisSizingMode = "AUTO";
  f.clipsContent = true;

  // 6) grid column widths（after the window width is final）
  for (const { box, items, cols, gap } of pend) {
    const colW = Math.floor((inner(box) - gap * (cols - 1)) / cols);
    for (const it of items) {
      try { const vH = it.layoutSizingVertical; it.layoutSizingHorizontal = "FIXED"; it.resize(colW, it.height); if (vH === "HUG") try { it.layoutSizingVertical = "HUG"; } catch (e) {} } catch (e) {}
    }
    applied.push(`${F.key}: ${items.length} 项改为 ${cols} 列网格（列宽 ${colW}）`);
    if (colW < 340 && cfg.ratio34 !== false) {
      let fixed = 0, vertical = 0;
      for (const it of items) {
        const imgs = "findAll" in it ? it.findAll((n) => n.visible && "fills" in n && Array.isArray(n.fills) && n.fills.some((p) => p.type === "IMAGE")) : [];
        for (const im of imgs) {
          if (im.parent && im.parent.layoutMode === "HORIZONTAL") { try { im.resize(Math.round((im.height * 3) / 4), im.height); fixed++; } catch (e) {} }
          else vertical++;
        }
      }
      if (fixed) applied.push(`${F.key}: 卡片宽 ${colW} < 340，${fixed} 张图片改为 3:4（高度不变）`);
      if (vertical) warn(`${F.key}: 卡片宽 ${colW} < 340，${vertical} 张图片位于纵向卡片中，未自动改 3:4，请人工确认（规范 8.1.8）`);
    }
  }
  if (mode !== "proposal" && !singleScreen && isAL) { if (f.layoutMode === "VERTICAL") f.primaryAxisSizingMode = "AUTO"; else f.counterAxisSizingMode = "AUTO"; }

  // 7) system areas: Vertical Bar（外屏/内屏横屏）or Reserved Region（内屏竖屏）
  const H = f.height;
  if (vbW) {
    if (vb === "A") {
      const w = figma.createRectangle(); w.name = "Vertical Bar 置白"; w.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
      f.appendChild(w); if (f.layoutMode !== "NONE") w.layoutPositioning = "ABSOLUTE"; w.x = cW; w.y = 0; w.resize(vbW, H); w.constraints = { horizontal: "MAX", vertical: "STRETCH" };
    }
    const bar = await sysPart("paneControls", H);
    bar.name = "Vertical Bar"; f.appendChild(bar); if (f.layoutMode !== "NONE") bar.layoutPositioning = "ABSOLUTE";
    bar.x = cW; bar.y = 0; bar.resize(vbW, H); bar.constraints = { horizontal: "MAX", vertical: "STRETCH" };
  }
  if (F.rrW) {
    const rr = figma.createAutoLayout("VERTICAL", { name: "Reserved Region", fills: [], paddingTop: 24, paddingRight: 24, paddingBottom: 12, paddingLeft: 23 });
    rr.appendChild(await sysPart("statusBar", 48));
    f.appendChild(rr); if (f.layoutMode !== "NONE") rr.layoutPositioning = "ABSOLUTE";
    rr.x = W - rr.width; rr.y = 0; rr.constraints = { horizontal: "MAX", vertical: "MIN" };
  }

  const auto = [vb === "B" ? "方式 B：内容避让 Vertical Bar，背景延伸" : vb === "A" ? "方式 A：整体避让 Vertical Bar，VB 置白" : "无 VB，避让 Reserved Region，撑满窗口",
    split ? (split.detailSourceId ? "List–Detail 分栏" : "Main–Support 分栏") : null,
    `边距 ${margin}`, pend.length ? [...new Set(pend.map((p) => `${p.cols} 列网格`))].join("/") : null].filter(Boolean).join(" · ");
  return { f, F, summary: cfg.summary || auto };
}

// ---------- layout helpers ----------
function label(lines, width) {
  const box = figma.createAutoLayout("VERTICAL", { name: "Label", fills: [], itemSpacing: 4 });
  lines.forEach(([s, font, size, color]) => box.appendChild(txt(s, font, size, color, width)));
  return box;
}
function tag(text, primary) {
  const t = figma.createAutoLayout("HORIZONTAL", { name: "Tag · " + text, paddingTop: 4, paddingBottom: 4, paddingLeft: 10, paddingRight: 10, cornerRadius: 6,
    fills: [{ type: "SOLID", color: primary ? { r: 0.2, g: 0.4, b: 1 } : { r: 0.52, g: 0.57, b: 0.65 } }] });
  t.appendChild(txt(text, FONT.M, 14, { r: 1, g: 1, b: 1 })); return t;
}
function overlaps(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }
function freeSpot(parent, rect, dir, ignore) {
  for (let guard = 0, moved = true; moved && guard < 300; guard++) {
    moved = false;
    for (const n of parent.children) {
      if (ignore.includes(n.id)) continue;
      if (overlaps(rect, { x: n.x, y: n.y, w: n.width, h: n.height })) { if (dir === "right") rect.x = n.x + n.width + 200; else rect.y = n.y + n.height + 200; moved = true; }
    }
  }
  return rect;
}
async function placeHost(name, w, h, dir) {
  const t = PARAMS.target;
  if (t && t.nodeId) {
    const n = await figma.getNodeByIdAsync(t.nodeId);
    if (!n) throw new Error("target not found: " + t.nodeId);
    const host = n.type === "SECTION" ? figma.createSection() : figma.createFrame();
    host.name = name; if (host.type === "FRAME") host.fills = [];
    const kids = n.children ? n.children.filter((c) => c.id !== host.id) : [];
    const x = t.x != null ? t.x : kids.length ? Math.max(...kids.map((c) => c.x + c.width)) + 160 : 100, y = t.y != null ? t.y : 100;
    n.appendChild(host); host.x = x; host.y = y;
    return { host, grow: n.type === "SECTION" ? n : null };
  }
  let pg = page;
  if (t && t.pageId) { pg = await figma.getNodeByIdAsync(t.pageId); if (!pg || pg.type !== "PAGE") throw new Error("target page not found: " + t.pageId); await pg.loadAsync(); }
  const host = figma.createSection(); host.name = name; pg.appendChild(host);
  const rect = t && t.x != null ? { x: t.x, y: t.y || 0, w, h } : dir === "right" ? { x: anchor.x + anchor.width + 200, y: anchor.y, w, h } : { x: anchor.x, y: anchor.y + anchor.height + 200, w, h };
  const pos = freeSpot(pg, rect, dir, [host.id]); host.x = pos.x; host.y = pos.y;
  return { host, grow: null, rect: pos, pg };
}
function fitSection(s, pad) {
  if (s.type !== "SECTION") return;
  const ks = s.children; if (!ks.length) return;
  s.resizeWithoutConstraints(Math.max(...ks.map((c) => c.x + c.width)) + pad, Math.max(...ks.map((c) => c.y + c.height)) + pad);
}

// ---------- run ----------
const mode = PARAMS.mode === "final" ? "final" : "proposal";
const rows = mode === "final" ? [PARAMS.rows[0]] : PARAMS.rows;
const out = { mode, frames: [], warnings, applied };
if (mode === "proposal") {
  const { host, grow, pg } = await placeHost(`${src.name} · iPhone DUO 适配方案（待确认）`, 2800, 3000, "down");
  const board = figma.createAutoLayout("VERTICAL", { name: "Plans", itemSpacing: 64, paddingTop: 72, paddingBottom: 72, paddingLeft: 72, paddingRight: 72, fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }], cornerRadius: 24 });
  host.appendChild(board); board.x = 100; board.y = 100;
  board.appendChild(label([[`iPhone DUO 适配方案（待设计师确认）· ${src.name}`, FONT.B, 40, C_TITLE], ...(PARAMS.header || []).map((s) => [s, FONT.R, 18, C_SUB])], 2200));
  for (const row of rows) {
    const r = figma.createAutoLayout("HORIZONTAL", { name: "Row " + row.tag, itemSpacing: 80, fills: [] });
    board.appendChild(r);
    for (const cfg of row.forms) {
      const cell = figma.createAutoLayout("VERTICAL", { name: "Cell", itemSpacing: 16, fills: [] }); r.appendChild(cell);
      const F = FORMS[cfg.form];
      cell.appendChild(tag(row.tag, /推荐/.test(row.tag)));
      cell.appendChild(txt(cfg.title || `${F.no} ${F.label} ${F.key}`, FONT.B, 22, C_TITLE));
      const res = await adapt(cfg, mode, cell);
      cell.appendChild(txt([res.summary, ...(cfg.notes || [])].map((s) => "• " + s).join("\n"), FONT.R, 14, C_SUB, F.W));
      out.frames.push({ row: row.tag, form: cfg.form, id: res.f.id, w: Math.round(res.f.width), h: Math.round(res.f.height) });
    }
  }
  if (warnings.length) board.appendChild(txt(warnings.map((s) => "⚠ " + s).join("\n"), FONT.R, 14, C_WARN, 2200));
  fitSection(host, 100); if (grow) fitSection(grow, 100);
  out.sectionId = host.id;
} else {
  const { host, grow } = await placeHost(`${src.name} · iPhone DUO 适配稿`, 2600, 3200, "right");
  let x = 100;
  for (const cfg of rows[0].forms) {
    const res = await adapt(cfg, mode, host);
    res.f.x = x; res.f.y = 160;
    const lb = label([[`${res.F.no} ${res.F.key} · ${res.F.label} ${res.F.W}×${res.F.H}`, FONT.B, 24, C_TITLE], [res.summary, FONT.R, 16, C_SUB]], Math.max(res.F.W, 360));
    host.appendChild(lb); lb.x = x; lb.y = 160 - 16 - lb.height;
    out.frames.push({ form: cfg.form, id: res.f.id, w: Math.round(res.f.width), h: Math.round(res.f.height) });
    x += res.F.W + 120;
  }
  const lines = [...(PARAMS.notes || []), ...applied, ...warnings.map((s) => "⚠ " + s)];
  if (lines.length) {
    const card = figma.createAutoLayout("VERTICAL", { name: "适配说明 · " + src.name, itemSpacing: 12, paddingTop: 32, paddingBottom: 32, paddingLeft: 32, paddingRight: 32, cornerRadius: 16, fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }] });
    card.appendChild(txt("适配说明 · " + src.name, FONT.B, 22, C_TITLE));
    card.appendChild(txt(lines.map((s) => "• " + s).join("\n"), FONT.R, 14, C_SUB, 496));
    host.appendChild(card); card.x = x; card.y = 160;
  }
  fitSection(host, 100); if (grow) fitSection(grow, 100);
  out.sectionId = host.id;
}
return out;
