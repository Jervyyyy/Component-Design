// TDS Video 视频 — code reconstruction of Figma › Video 视频 › Component.
// Every visual value below is taken from the Figma component (sizes in pt = CSS px at 1×).
import { html, useState, useRef, useEffect, useLayoutEffect, clamp, fmtTime, cx } from './lib.js';
import { Icon, RawSvg, STATUS_ICONS } from './icons.js';
import { player, usePlayer, usePlayerTime, speedLabel } from './player.js';
import { CLIPS, GROUPS } from './media.js';

const RATIO = { '9:16': 9 / 16, '3:4': 3 / 4, '16:9': 16 / 9 };

// ---------------------------------------------------------------------------------------------
// Toast (Feedback Toast 反馈浮层 — spec only: 8 radius, 12 padding, Body/M, 16pt from top)
// ---------------------------------------------------------------------------------------------
let toastState = null;
const toastSubs = new Set();
export function showToast(icon, text) {
  toastState = { icon, text, id: Date.now() };
  toastSubs.forEach((f) => f());
  const id = toastState.id;
  setTimeout(() => { if (toastState && toastState.id === id) { toastState = null; toastSubs.forEach((f) => f()); } }, 1500);
}
function Toast({ top }) {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((n) => n + 1); toastSubs.add(f); return () => toastSubs.delete(f); }, []);
  if (!toastState) return null;
  return html`<div class="v-toast" key=${toastState.id} style=${`top:${top}px`}>
    <${Icon} name=${toastState.icon} size=${16} /><span class="t-body-m">${toastState.text}</span>
  </div>`;
}

// ---------------------------------------------------------------------------------------------
// Media (.Video.MediaPortrait / .Video.MediaLandscape)
// ---------------------------------------------------------------------------------------------
export function mediaLayout(W, H, orientation, ratio, withHint) {
  const r = RATIO[ratio];
  if (orientation === 'horizontal') {
    // 横屏：三档均为高度撑满、水平居中 (Aspect Fit when the window is narrower than the video)
    let h = H, w = H * r;
    if (w > W) { w = W; h = W / r; }
    return { x: (W - w) / 2, y: (H - h) / 2, w, h };
  }
  if (ratio === '9:16') {
    // 竖屏 9:16：顶部对齐，高度撑满并在底部留出 76pt 给控制栏，宽度按比例、水平居中
    const h = H - 76, w = h * r;
    return { x: (W - w) / 2, y: 0, w, h };
  }
  // 竖屏 3:4 宽度撑满、垂直居中；16:9 宽度撑满，与下方 16pt 的 Rotate 按钮一起垂直居中
  let w = W, h = W / r;
  if (h > H) { h = H; w = H * r; }
  const group = h + (withHint ? 16 + 30 : 0);
  const y = (H - group) / 2;
  return { x: (W - w) / 2, y, w, h, hintY: y + h + 16 };
}

function MediaFrame({ rect, onTap }) {
  const host = useRef(null);
  const s = usePlayer();
  const clip = CLIPS.find((c) => c.id === s.clipId);
  useLayoutEffect(() => { host.current.appendChild(player.video); }, []);
  return html`<div class="v-media" style=${`left:${rect.x}px;top:${rect.y}px;width:${rect.w}px;height:${rect.h}px`} onClick=${onTap}>
    <img class="v-poster" src=${clip.poster} alt="" draggable="false" />
    <div class="v-media-host" ref=${host}></div>
  </div>`;
}

// ---------------------------------------------------------------------------------------------
// Video.State (CenterState) — 240×140, identical size in every state so the frame never jumps
// ---------------------------------------------------------------------------------------------
export function CenterState({ display, style = '' }) {
  const stop = (e) => e.stopPropagation();
  let body = null;
  if (display === 'paused') {
    body = html`<div class="vs-row">
      <button class="vs-seek" aria-label="Back 10s" onClick=${(e) => { stop(e); player.skip(-10); }}><${Icon} name="backword_10" size=${32} /></button>
      <button class="vib-large" aria-label="Play" onClick=${(e) => { stop(e); player.play(); }}><${Icon} name="play" size=${48} /></button>
      <button class="vs-seek" aria-label="Forward 10s" onClick=${(e) => { stop(e); player.skip(10); }}><${Icon} name="forward_10" size=${32} /></button>
    </div>`;
  } else if (display === 'loading') {
    body = html`<div class="vs-col gap8"><${Icon} name="loading_ios" size=${24} cls="spin" /><span class="t-body-m vs-dim">Loading…</span></div>`;
  } else if (display === 'error') {
    body = html`<div class="vs-col gap12">
      <${Icon} name="image_failed_filled" size=${32} />
      <span class="t-body-m vs-dim vs-err">Couldn’t load this video. Check your connection.</span>
      <button class="btn-ondark-xs t-body-m-em" onClick=${(e) => { stop(e); player.retry(); window.dispatchEvent(new CustomEvent('tds-retry')); }}>Try again</button>
    </div>`;
  }
  return html`<div class="v-center" style=${style} data-state=${display}>${body}</div>`;
}

// ---------------------------------------------------------------------------------------------
// Video.TopBar — 返回 → centerSlot → 静音, 44pt
// ---------------------------------------------------------------------------------------------
export function TopBar({ margin = 16, trailingInset = 0, centerSlot, group, onGroup, style = '' }) {
  const s = usePlayer();
  const mute = (e) => {
    e.stopPropagation();
    const m = player.toggleMute();
    if (m) showToast('volume_slash_outlined', 'Muted');
  };
  return html`<div class="v-topbar" style=${style}>
    <div class="vt-lead" style=${`padding-left:${margin}px`}>
      <button class="vt-btn" aria-label="Back" onClick=${(e) => e.stopPropagation()}><${Icon} name="arrow_left_ios_outlined" size=${20} /></button>
    </div>
    <div class="vt-slot">
      ${centerSlot === 'segmented' && html`<div class="seg" onClick=${(e) => e.stopPropagation()}>
        ${GROUPS.map((g) => html`<button class=${cx('seg-item t-body-m-em', g.id === group && 'on')} onClick=${() => onGroup && onGroup(g.id)}>${g.label}</button>`)}
      </div>`}
    </div>
    <div class="vt-trail" style=${`padding-right:${margin + trailingInset}px`}>
      <button class="vt-btn" aria-label=${s.muted ? 'Unmute' : 'Mute'} onClick=${mute}>
        ${s.muted ? html`<${Icon} name="volume_slash_outlined" size=${20} />` : html`<${Icon} name="volume_outlined" size=${20} />`}
      </button>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------------------------
// Video.ProgressBar — default 2pt track / 8pt handle; scrubbing 4pt / 14pt; hit area 44pt
// ---------------------------------------------------------------------------------------------
export function ProgressBar({ variant, scrubbing, hasChapters, onScrub }) {
  const t = usePlayerTime();
  const s = usePlayer();
  const clip = CLIPS.find((c) => c.id === s.clipId);
  const ref = useRef(null);
  const d = s.duration || clip.duration || 1;
  const played = clamp(t / d, 0, 1);
  const buffered = clamp(player.bufferedEnd / d, 0, 1);
  const showHandle = scrubbing || variant === 'standard';

  const onDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const el = ref.current;
    const rect = el.getBoundingClientRect();
    const at = (x) => clamp((x - rect.left) / rect.width, 0, 1) * d;
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    player.scrubStart();
    onScrub && onScrub(true);
    player.scrubTo(at(e.clientX));
    const move = (ev) => player.scrubTo(at(ev.clientX));
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      player.scrubEnd();
      onScrub && onScrub(false); // 松手立即回到 default，不做延迟消失
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };

  return html`<div ref=${ref} class=${cx('pb', 'pb-' + variant, scrubbing && 'scrubbing')} onPointerDown=${onDown} onClick=${(e) => e.stopPropagation()}
      role="slider" aria-valuemin="0" aria-valuemax=${Math.round(d)} aria-valuenow=${Math.round(t)}>
    <div class="pb-track"></div>
    <div class="pb-buffered" style=${`width:${buffered * 100}%`}></div>
    <div class="pb-played" style=${`width:${played * 100}%`}></div>
    ${hasChapters && (clip.chapters || []).map((f) => html`<div class="pb-chapter" style=${`left:${f * 100}%`}></div>`)}
    ${showHandle && html`<div class="pb-handle" style=${`left:${played * 100}%`}></div>`}
  </div>`;
}

function TimeText() {
  const t = usePlayerTime();
  const s = usePlayer();
  return html`<div class="vc-time t-body-xs-em">
    <span>${fmtTime(t)}</span><i class="vc-div"></i><span class="dim">${fmtTime(s.duration)}</span>
  </div>`;
}

function Readout() {
  const t = usePlayerTime();
  const s = usePlayer();
  return html`<div class="vc-readout t-heading-2xl">
    <span>${fmtTime(t)}</span><i class="vc-div-lg"></i><span class="dim">${fmtTime(s.duration)}</span>
  </div>`;
}

function Preview({ ratio }) {
  const host = useRef(null);
  useLayoutEffect(() => { host.current.appendChild(player.preview); }, []);
  // 卡牌预览：比例同播放页面比例，最小边尺寸固定为 90
  const r = RATIO[ratio];
  const w = r >= 1 ? 90 * r : 90, h = r >= 1 ? 90 : 90 / r;
  return html`<div class="vc-preview" style=${`width:${w}px;height:${h}px`}><div class="v-media-host" ref=${host}></div></div>`;
}

function SpeedLabel() {
  const s = usePlayer();
  const tap = (e) => {
    e.stopPropagation();
    const r = player.cycleSpeed(); // 标签原地更新，即时生效
    showToast('fast', speedLabel(r));
  };
  return html`<button class="vc-speed t-body-xs-em" onClick=${tap}>${speedLabel(s.rate)}</button>`;
}

function PlayPause() {
  const s = usePlayer();
  return html`<button class="vib-small" aria-label=${s.playing ? 'Pause' : 'Play'} onClick=${(e) => { e.stopPropagation(); player.toggle(); }}>
    <${Icon} name=${s.playing ? 'pause' : 'play'} size=${20} />
  </button>`;
}

// ---------------------------------------------------------------------------------------------
// Counter (ControlBar hasCounter) — filmstrip 64pt + carousel.number
// ---------------------------------------------------------------------------------------------
export function Counter({ playlist, filmstrip, margin = 12 }) {
  const s = usePlayer();
  const idx = Math.max(0, playlist.findIndex((c) => c.id === s.clipId));
  const strip = useRef(null);
  useEffect(() => {
    const el = strip.current && strip.current.children[idx];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [idx, filmstrip]);
  return html`<div class="v-counter" style=${`padding:12px ${margin}px`} onClick=${(e) => e.stopPropagation()}>
    ${filmstrip && html`<div class="vco-strip" ref=${strip}>
      ${playlist.map((c, i) => html`<button class=${cx('vco-thumb', i === idx && 'on')} onClick=${() => player.load(c.id)}><img src=${c.poster} alt="" draggable="false" /></button>`)}
    </div>`}
    <div class="vco-num"><${Icon} name="image_filled" size=${16} /><span class="t-body-s">${idx + 1}/${playlist.length}</span></div>
  </div>`;
}

// ---------------------------------------------------------------------------------------------
// Video.ControlBar — standard (68/76pt) | minimal (88pt); scrubbing grows upward
// ---------------------------------------------------------------------------------------------
export function ControlBar({ type, scrubbing, hasSpeed, hasRotate, hasPreview, hasCounter, hasChapters, ratio, margin = 16, maxWidth, onScrub, onRotate, playlist, filmstrip, bottom = 0, padBottom }) {
  const inner = maxWidth ? `max-width:${maxWidth}px;margin:0 auto;width:100%` : '';
  const counter = hasCounter && !scrubbing && html`<div class="vc-counter-wrap"><${Counter} playlist=${playlist} filmstrip=${filmstrip} /></div>`;
  if (type === 'standard') {
    const pb = padBottom ?? 32;
    return html`<div class=${cx('v-controlbar', 'cb-standard', scrubbing && 'scrubbing')} style=${`bottom:${bottom}px;padding:${scrubbing ? 0 : 12}px ${margin}px ${pb}px`} onClick=${(e) => e.stopPropagation()}>
      ${counter}
      ${scrubbing && hasPreview && html`<${Preview} ratio=${ratio} />`}
      ${scrubbing && html`<${Readout} />`}
      <div class="cb-row" style=${inner}>
        <${PlayPause} />
        <div class="cb-progress"><${ProgressBar} variant="standard" scrubbing=${scrubbing} hasChapters=${hasChapters} onScrub=${onScrub} /></div>
        <${TimeText} />
        ${hasSpeed && html`<${SpeedLabel} />`}
        ${hasRotate && html`<button class="cb-fullscreen" aria-label="Rotate back to portrait" onClick=${(e) => { e.stopPropagation(); onRotate && onRotate('vertical'); }}><${Icon} name="shrink" size=${16} /></button>`}
      </div>
    </div>`;
  }
  // minimal
  const pb = padBottom ?? (scrubbing ? 64 : 40);
  return html`<div class=${cx('v-controlbar', 'cb-minimal', scrubbing && 'scrubbing')} style=${`bottom:${bottom}px;padding-bottom:${pb}px`} onClick=${(e) => e.stopPropagation()}>
    ${counter}
    ${scrubbing && hasPreview && html`<${Preview} ratio=${ratio} />`}
    ${scrubbing && html`<${Readout} />`}
    <${ProgressBar} variant="minimal" scrubbing=${scrubbing} hasChapters=${hasChapters} onScrub=${onScrub} />
    ${!scrubbing && html`<div class="cb-mrow" style=${`padding:0 ${margin}px`}>
      <${TimeText} />
      ${hasSpeed && html`<${SpeedLabel} />`}
    </div>`}
  </div>`;
}

// ---------------------------------------------------------------------------------------------
// Video.SideRail — 创作者 · 点赞 · 评论 · 收藏 · 分享 · 目录
// ---------------------------------------------------------------------------------------------
export function SideRail({ rail, right = 12, bottom = 94 }) {
  const [liked, setLiked] = useState(false);
  const [faved, setFaved] = useState(false);
  const [followed, setFollowed] = useState(false);
  const bump = (v, on) => { const n = parseInt(v, 10); return isNaN(n) ? v : String(n + (on ? 1 : 0)); };
  const stop = (e) => e.stopPropagation();
  const item = (key, icon, count, hasCount, on, toggle) => html`<button class=${cx('vr-item', on && 'on')} onClick=${(e) => { stop(e); toggle && toggle(); }}>
    <${Icon} name=${icon} size=${30} cls="vr-ic" />
    ${hasCount && count !== '' && html`<span class="t-body-xs-em vr-count">${count}</span>`}
  </button>`;
  return html`<div class="v-siderail" style=${`right:${right}px;bottom:${bottom}px`} onClick=${stop}>
    <div class="vr-actions">
      ${rail.hasCreator && html`<button class="vr-creator" onClick=${(e) => { stop(e); setFollowed(!followed); }} aria-label="Creator">
        <span class="vr-avatar"></span>
        ${!followed && html`<span class="vr-follow"><${Icon} name="add_circle_filled" size=${20} /></span>`}
      </button>`}
      ${rail.hasLike && item('like', 'thumbs_up_filled', bump(rail.likeCount, liked), rail.hasLikeCount, liked, () => setLiked(!liked))}
      ${rail.hasComment && item('comment', 'comment_filled', rail.commentCount, rail.hasCommentCount, false)}
      ${rail.hasFavorite && item('fav', 'favorite_filled', bump(rail.favoriteCount, faved), rail.hasFavoriteCount, faved, () => setFaved(!faved))}
      ${rail.hasShare && item('share', 'arrow_share_ios_filled', '', false, false)}
    </div>
    ${rail.hasMenu && html`<button class="vr-menu" aria-label="Menu" onClick=${stop}><${Icon} name="menu_outlined" size=${28} cls="vr-ic" /></button>`}
  </div>`;
}

// ---------------------------------------------------------------------------------------------
// iOS StatusBar (inside the component on iPhone portrait)
// ---------------------------------------------------------------------------------------------
export function StatusBar() {
  return html`<div class="v-statusbar"><span class="sb-time">9:41</span><${RawSvg} svg=${STATUS_ICONS} cls="sb-icons" /></div>`;
}

// ---------------------------------------------------------------------------------------------
// Video (主组件)
// ---------------------------------------------------------------------------------------------
// p   = TDS props as configured in the control panel (already resolved by the window rules)
// env = container facts supplied by the device frame (size, insets, margins, hint availability)
export function Video({ p, env, live }) {
  const s = usePlayer();
  const W = env.w, H = env.h;
  const vertical = p.orientation === 'vertical';
  const scrubbing = live.scrubbing || p.cb.state === 'scrubbing';
  const showHint = vertical && p.ratio === '16:9' && env.rotateHint;
  const rect = mediaLayout(W, H, p.orientation, p.ratio, showHint);
  const mediaOnly = env.layout === 'mediaOnly';

  // Video.State: loading / error come from the instance override (CenterState) or the real player
  let display = s.playing ? 'playing' : 'paused';
  if (s.loading) display = 'loading';
  if (s.error) display = 'error';
  if (p.centerOverride !== 'auto') display = p.centerOverride;
  if (env.hideCenter) display = 'hidden';

  const cbType = p.cb.type;
  const cbHeight = cbType === 'minimal' ? 88 : 76;
  const top = env.statusBar ? 62 : env.topInset;
  const filmstrip = vertical && p.ratio === '16:9';
  const tap = () => { if (display === 'playing' || display === 'paused') player.toggle(); };
  const scrimTop = vertical ? 140 : 96, scrimBottom = vertical ? 220 : 160;

  return html`<div class=${cx('tds-video', vertical ? 'is-vertical' : 'is-horizontal')} style=${`width:${W}px;height:${H}px`} onClick=${tap}>
    <${MediaFrame} rect=${rect} onTap=${null} />
    ${showHint && html`<button class="v-hint t-body-xs-em" style=${`top:${rect.hintY}px`} onClick=${(e) => { e.stopPropagation(); env.onRotate && env.onRotate('horizontal'); }}>
      <${Icon} name="rotate_screen_horizontal_outlined" size=${16} />Rotate for fullscreen
    </button>`}
    <div class="v-scrim-top" style=${`height:${scrimTop}px`}></div>
    <div class="v-scrim-bottom" style=${`height:${scrimBottom}px`}></div>
    ${display !== 'hidden' && html`<${CenterState} display=${display === 'playing' ? 'playing' : display} />`}
    ${!mediaOnly && p.hasControls && html`<${ControlBar} type=${cbType} scrubbing=${scrubbing} hasSpeed=${p.cb.hasSpeed} hasRotate=${p.cb.hasRotate}
        hasPreview=${p.cb.hasPreview} hasCounter=${p.cb.hasCounter} hasChapters=${p.pb.hasChapters} ratio=${p.ratio} margin=${env.margin}
        maxWidth=${!vertical ? env.controlMaxWidth : null} onScrub=${live.onScrub} onRotate=${env.onRotate} playlist=${env.playlist} filmstrip=${filmstrip} />`}
    ${!mediaOnly && p.hasSideRail && vertical && html`<${SideRail} rail=${p.rail} right=${Math.max(12, env.margin - 4)}
        bottom=${p.hasControls ? cbHeight + 6 + (p.cb.hasCounter && filmstrip && !scrubbing ? 101 : 0) : 40} />`}
    ${!mediaOnly && html`<div class="v-top" style=${env.statusBar ? '' : `padding-top:${top}px`}>
      ${env.statusBar && html`<${StatusBar} />`}
      ${p.hasTopBar && html`<${TopBar} margin=${env.margin} trailingInset=${env.trailingInset || 0} centerSlot=${p.topBar.centerSlot} group=${env.group} onGroup=${env.onGroup} />`}
    </div>`}
    <${Toast} top=${!vertical && p.topBar.centerSlot !== 'segmented' ? 16 : top + (p.hasTopBar ? 44 : 0) + 16} />
  </div>`;
}
