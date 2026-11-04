import type { BookSide, Config, DeviceKind, Posture } from "./types";

/**
 * Screen definitions + Share layout rules.
 * All numbers come from the Figma "Share · Overview" and "Share 分享 · iPhone Duo 适配" frames.
 */

export interface ScreenSpec {
  kind: DeviceKind;
  name: string;
  sub: string;
  w: number;
  h: number;
  /** screen corner radius */
  radius: number;
  /** status bar height used by the app page (phones) */
  statusBar: number;
  /** total height of the overlay navigation bar when hasMedia (status bar + 44 title bar on phones, 84 on DUO) */
  navBar: number;
  homeIndicator: number;
  island?: boolean;
  notch?: boolean;
  /** iPhone DUO side "Vertical Bar" / pane controls on the right edge */
  verticalBar?: { width: number; height: number };
  /** iPhone DUO inner portrait top-right reserved region (status bar) */
  reserved?: { x: number; y: number; w: number; h: number };
  crease?: "vertical" | "horizontal";
  /** iPhone DUO half-fold (book) folding region, read at runtime from reservedRegions(kind: .division) */
  fold?: { x: number; w: number };
  /** compact = phone rules (W ≤ 440): full-bleed sheet, 32 media inset, 4.5 items */
  compact: boolean;
}

export const IPHONES = {
  iphone16: { name: "iPhone 16", w: 390, h: 844, radius: 55, statusBar: 62, island: true },
  iphone16promax: { name: "iPhone 16 Pro Max", w: 440, h: 956, radius: 62, statusBar: 62, island: true },
  iphone13mini: { name: "iPhone 13 mini", w: 375, h: 812, radius: 44, statusBar: 50, notch: true },
} as const;

export const POSTURES: Record<Posture, { title: string; en: string; w: number; h: number }> = {
  A: { title: "A · 外屏竖握", en: "Outer Portrait", w: 466, h: 678 },
  B: { title: "B · 内屏竖握", en: "Inner Portrait", w: 669, h: 951 },
  C: { title: "C · 内屏横握（展平）", en: "Inner Landscape", w: 951, h: 669 },
  D: { title: "D · 内屏半折（书本态）", en: "Partial Book", w: 951, h: 669 },
};

export const CUSTOM_PRESETS = [
  { label: "Android 360×800", w: 360, h: 800 },
  { label: "Fold 内屏 673×841", w: 673, h: 841 },
  { label: "iPad mini 744×1133", w: 744, h: 1133 },
  { label: "iPad 横屏 1180×820", w: 1180, h: 820 },
  { label: "折叠横屏 1024×720", w: 1024, h: 720 },
];

export function getScreen(c: Config): ScreenSpec {
  if (c.device === "iphone") {
    const m = IPHONES[c.iphone];
    return {
      kind: "iphone",
      name: m.name,
      sub: `${m.w} × ${m.h} pt`,
      w: m.w,
      h: m.h,
      radius: m.radius,
      statusBar: m.statusBar,
      navBar: m.statusBar + 44,
      homeIndicator: 34,
      island: "island" in m ? m.island : false,
      notch: "notch" in m ? m.notch : false,
      compact: m.w <= 440,
    };
  }
  if (c.device === "duo") {
    const p = POSTURES[c.posture];
    const base: ScreenSpec = {
      kind: "duo",
      name: `iPhone DUO · ${p.title}`,
      sub: `${p.en} · ${p.w} × ${p.h} pt`,
      w: p.w,
      h: p.h,
      radius: c.posture === "A" ? 44 : 40,
      statusBar: 0,
      navBar: 84,
      homeIndicator: 34,
      compact: false,
    };
    if (c.posture === "A") base.verticalBar = { width: 84, height: 486 };
    if (c.posture === "B") {
      base.reserved = { x: 518, y: 0, w: 151, h: 84 };
      base.crease = "horizontal";
    }
    if (c.posture === "C") {
      base.verticalBar = { width: 84, height: 669 };
      base.crease = "vertical";
    }
    if (c.posture === "D") {
      base.verticalBar = { width: 84, height: 669 };
      base.fold = { x: p.w / 2 - 12, w: 24 };
    }
    return base;
  }
  const w = Math.round(c.customW);
  const h = Math.round(c.customH);
  return {
    kind: "custom",
    name: "自由尺寸 Resizable",
    sub: `${w} × ${h} pt`,
    w,
    h,
    radius: w <= 440 ? 40 : 28,
    statusBar: 28,
    navBar: 28 + 44,
    homeIndicator: w <= 440 ? 34 : 24,
    compact: w <= 440,
  };
}

export interface ItemRule {
  /** how the item width is derived */
  mode: "fixed" | "peek" | "min72" | "spread";
  itemW: number;
  /** human readable rule for the readout */
  rule: string;
  visible: number;
}

export interface ShareLayout {
  /** horizontal region the overlay lives in (whole window, or the triggered half in book posture) */
  region: { x: number; w: number };
  panel: { x: number; w: number; floating: boolean; bottomRadius: number };
  media: { x: number; w: number; top: number; carouselMaxW: number; inset: string };
  navPadLeft: number;
}

export const SHEET_MAX = 653;
export const MEDIA_MAX = 501;
export const SIDE_BAR = 84;

export function getShareLayout(s: ScreenSpec, bookSide: BookSide): ShareLayout {
  const W = s.w;
  let region = { x: 0, w: W };
  if (s.fold) {
    region =
      bookSide === "left"
        ? { x: 0, w: s.fold.x }
        : { x: s.fold.x + s.fold.w, w: W - (s.fold.x + s.fold.w) };
  }

  // Panel (Sheet adaptation): phones full-bleed; larger windows inset 8 and capped at 653, centered.
  let panel: ShareLayout["panel"];
  if (s.compact) {
    panel = { x: 0, w: W, floating: false, bottomRadius: 0 };
  } else if (s.fold) {
    // book: left 8 → folding region edge (455.5 max); never crosses the fold
    panel =
      bookSide === "left"
        ? { x: 8, w: region.w - 8, floating: true, bottomRadius: 0 }
        : { x: region.x, w: region.w - 8, floating: true, bottomRadius: 0 };
  } else {
    const w = Math.min(SHEET_MAX, W - 16);
    // Surface: only the top corners are rounded (Radius/XL 20); the screen's own corners clip the bottom.
    panel = { x: (W - w) / 2, w, floating: true, bottomRadius: s.kind === "duo" ? 0 : Math.max(20, s.radius - 8) };
  }

  // Media (share image) horizontal rules
  const top = s.navBar + 16;
  let media: ShareLayout["media"];
  if (s.compact) {
    media = { x: 32, w: W - 64, top, carouselMaxW: 270, inset: "左右 32（Space/XXL）" };
  } else if (s.fold) {
    // book: preview inset 16 from both panel edges, centred on the panel; on the right half it also keeps
    // clear of the Vertical Bar (same rule as A/C: the preview avoids it, the sheet does not).
    const barLeft = s.verticalBar ? W - s.verticalBar.width : W;
    const inset = Math.max(16, panel.x + panel.w - barLeft);
    media = {
      x: panel.x + inset,
      w: panel.w - inset * 2,
      top,
      carouselMaxW: panel.w - inset * 2,
      inset: inset > 16 ? `面板两边各收进 ${round(inset)}（避让 Vertical Bar）` : "面板两边各收进 16，与面板中线对齐",
    };
  } else {
    const w = Math.min(MEDIA_MAX, W - SIDE_BAR * 2);
    media = { x: (W - w) / 2, w, top, carouselMaxW: w, inset: `左右 ≥ 84（对称避让 Vertical Bar），宽 ≤ ${MEDIA_MAX}` };
  }

  return { region, panel, media, navPadLeft: s.compact ? 16 : 24 };
}

/** Share.Panel overflow rules (Behavior · overflow=scroll 露出个数) */
export function getItemRule(panelW: number, overflow: "fixed" | "scroll", count: number): ItemRule {
  const inner = panelW - 40;
  if (overflow === "fixed") {
    const n = Math.max(1, Math.min(count, 5));
    const itemW = Math.max(72, (inner - 8 * (n - 1)) / n);
    return { mode: "fixed", itemW, rule: `fixed · 一行最多 5 个，平分宽度 (${n} 个)`, visible: n };
  }
  // scroll: when every item already fits at its scroll width, nothing overflows — share the row equally instead
  const scrollW = panelW <= 440 ? (panelW - 52) / 4.5 : 72;
  if (count > 0 && count * scrollW + (count - 1) * 8 <= inner) {
    const itemW = (inner - 8 * (count - 1)) / count;
    return { mode: "spread", itemW, rule: `scroll · 未超出宽度时平分 (${count} 个)`, visible: count };
  }
  if (panelW <= 440) {
    const itemW = scrollW;
    return { mode: "peek", itemW, rule: "W ≤ 440 · 露出 4.5，Item = (W − 52) ÷ 4.5", visible: 4.5 };
  }
  const fit = Math.floor((inner + 8) / 80);
  return {
    mode: "min72",
    itemW: 72,
    rule: "W > 440 · Item 72 / 间距 8 从左排列",
    visible: Math.min(count, fit + ((inner + 8) % 80) / 80),
  };
}

export const round = (n: number) => Math.round(n * 10) / 10;
