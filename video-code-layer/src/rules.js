// iPhone Duo postures (Figma › Video · iPhone Duo 适配 › Configurations)
export const DUO = {
  A: { name: '外屏竖握', en: 'Outer Portrait', w: 466, h: 678 },
  B: { name: '内屏竖握（展平）', en: 'Inner Portrait', w: 669, h: 951 },
  C: { name: '内屏横握（展平）', en: 'Inner Landscape', w: 951, h: 669 },
  D: { name: '内屏半折（桌面态）', en: 'Partial Tabletop', w: 669, h: 951 },
  E: { name: '内屏半折（书本态）', en: 'Partial Book', w: 951, h: 669 },
};

// Window rules from the TDS spec:
//  · Guideline › Foldable 折叠屏适配 — the component only looks at the window size (pt) + posture
//  · Video · iPhone Duo 适配 — mode by aspect ratio, Aspect Fit, margins per width class
export function windowClass(w, h) {
  if (w >= 600 && h >= 480) return 'large';   // 展开态 · 大屏规则
  if (w < 600 && h < 480) return 'small';     // 小窗口
  return 'phone';                             // 手机规则（含外屏、手机横持）
}

// 控件左右边距：< 600 → 16，600–834 → 32，834–1184 → 40
export const marginFor = (w) => (w < 600 ? 16 : w < 834 ? 32 : 40);

export const CLASS_LABEL = { phone: '手机规则', large: '大屏规则 · 展开态', small: '小窗口' };

/**
 * Resolve the TDS props the panel asked for into the props the component actually renders in this
 * window, plus a list of the rules that changed something (shown in the panel).
 * kind: 'iphone' | 'duo' | 'resizable'
 */
export function resolve(state, { kind, w, h, posture }) {
  const cls = kind === 'iphone' ? 'phone' : windowClass(w, h);
  const forced = {}; // prop path → reason
  const notes = [];

  let orientation;
  if (kind === 'iphone') orientation = state.iphoneOrient;
  else {
    orientation = w >= h ? 'horizontal' : 'vertical';
    notes.push(`orientation = ${orientation}（窗口 ${Math.round(w)}×${Math.round(h)}，宽 ${w >= h ? '≥' : '<'} 高）`);
    forced.orientation = '跟随窗口宽高比';
  }
  const vertical = orientation === 'vertical';

  const cb = { ...state.cb };
  if (cb.type === 'auto') {
    if (kind === 'resizable' && cls === 'large') { cb.type = 'standard'; notes.push('ControlBar type = standard（大屏控制栏统一 standard）'); }
    else cb.type = vertical ? 'minimal' : 'standard';
  }
  if (cls === 'large' && cb.hasRotate) { cb.hasRotate = false; forced['cb.hasRotate'] = '大屏规则：hasRotate=false'; }
  if (cls === 'small') {
    if (cb.hasSpeed) { cb.hasSpeed = false; forced['cb.hasSpeed'] = '小窗口：关闭 hasSpeed'; }
    if (cb.hasRotate) { cb.hasRotate = false; forced['cb.hasRotate'] = '小窗口：关闭 hasRotate'; }
  }
  if (kind === 'duo' && cb.hasRotate) { cb.hasRotate = false; forced['cb.hasRotate'] = 'Duo：外屏横握禁用 / 内屏按大屏规则'; }

  let hasSideRail = state.hasSideRail;
  if (hasSideRail && cls === 'small') { hasSideRail = false; forced.hasSideRail = '小窗口：hasSideRail=false'; }
  if (hasSideRail && posture === 'D') { hasSideRail = false; forced.hasSideRail = '桌面模式：hasSideRail=false'; }
  if (state.hasSideRail && !vertical && !forced.hasSideRail) forced.hasSideRail = '横屏不使用侧边栏';

  const topBar = { ...state.topBar };
  if (cls === 'small' && topBar.centerSlot !== 'empty') { topBar.centerSlot = 'empty'; forced['topBar.centerSlot'] = '小窗口：centerSlot 留空'; }

  const rotateHint = kind === 'iphone' || (kind === 'resizable' && cls === 'phone');
  if (vertical && state.ratio === '16:9' && !rotateHint) notes.push('「Rotate for fullscreen」不出现（大屏 / Duo 外屏横握已禁用）');

  const margin = kind === 'iphone' ? 16 : marginFor(w);
  notes.push(`控件左右边距 ${margin}（${w < 600 ? '< 600' : w < 834 ? '600–834' : '834–1184'} 档）`);
  if (cls === 'large' && !vertical) notes.push('横屏控制栏最大宽度 1024pt 居中');

  return {
    cls, forced, notes,
    p: { ...state, orientation, cb, hasSideRail, topBar },
    env: { margin, rotateHint, controlMaxWidth: cls === 'large' ? 1024 : null },
  };
}
