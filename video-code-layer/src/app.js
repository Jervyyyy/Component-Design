import { html, render, useState, useEffect, useRef, useLayoutEffect, cx, fmtTime } from './lib.js';
import { Icon, RawSvg, DUO_LEVELS } from './icons.js';
import { player, usePlayer } from './player.js';
import { CLIPS, clipsOf } from './media.js';
import { Video, TopBar, ControlBar, CenterState, SideRail, seekShown } from './video.js';
import { resolve, cSplit, CLASS_LABEL, DUO } from './rules.js';
import { CommentsPane, commentCount } from './comments.js';
import { Panel, DeviceBar } from './panel.js';

export const DEFAULTS = {
  device: 'iphone',          // iphone | duo | resizable
  iphoneOrient: 'vertical',  // iPhone rotation drives Video.orientation
  duo: 'A',                  // iPhone Duo posture A–E
  duoD: 'info',              // tabletop lower half: info | center
  bookComments: true,        // book posture secondary pane: comments | details
  cComments: null,           // inner landscape: null = follow ratio | true = comments split | false = full screen
  rz: { w: 669, h: 951 },
  // ---- TDS props (Video 主组件) ----
  hasTopBar: true,
  hasControls: true,
  hasSideRail: false,
  autoHide: true,            // 播放时 3 秒无操作隐藏控件（行为规范，非 Figma 变体）
  ratio: '9:16',             // Media › ratio
  centerOverride: 'auto',    // CenterState instance: auto | loading | error
  hasSeek: 'auto',          // paused 时 ±10s：auto（竖屏隐藏 / 横屏显示）| on | off
  cb: { type: 'auto', state: 'default', hasSpeed: true, hasRotate: true, hasPreview: false, hasCounter: false },
  pb: { hasChapters: false },
  topBar: { centerSlot: 'empty' },
  rail: {
    hasCreator: true, hasLike: true, hasComment: true, hasFavorite: true, hasShare: true, hasMenu: true,
    hasLikeCount: true, hasCommentCount: true, hasFavoriteCount: true,
    likeCount: '73', commentCount: '17', favoriteCount: '23',
  },
  group: 'highlights',
};


// ---------------------------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------------------------
function useSize(ref) {
  const [s, set] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => set({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return s;
}

// Duo 状态栏（Figma › Pane controls › Status bar）：时间 SF Pro Rounded Bold 16 + Levels 46 圆形组合图标。
// 横向（Vertical Bar 内）：外屏带灵动岛 36（y 29），时间 y 90；内屏无灵动岛，时间 y 40。
function VerticalBar({ theme = 'dark', showCam = true, children }) {
  return html`<div class=${'vbar ' + theme}>
    ${showCam && html`<i class="cam"></i>`}
    <div class="vb-time" style=${`margin-top:${showCam ? 25 : 40}px`}>9:41</div>
    <${RawSvg} svg=${DUO_LEVELS} cls="vb-levels" />
    ${children}
  </div>`;
}

// ---------------------------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------------------------
function IPhone({ st, set, live }) {
  const vertical = st.iphoneOrient === 'vertical';
  const w = vertical ? 390 : 844, h = vertical ? 844 : 390;
  const r = resolve(st, { kind: 'iphone', w, h });
  const env = {
    w, h, statusBar: vertical, topInset: 8, margin: 16, rotateHint: true,
    onRotate: (o) => set({ iphoneOrient: o }), playlist: clipsOf(st.group), group: st.group, onGroup: live.onGroup,
  };
  return { r, natural: { w: w + 24, h: h + 24 }, node: html`<div class=${cx('iphone', !vertical && 'landscape')}>
    <div class="screen" style=${`width:${w}px;height:${h}px`}>
      <${Video} p=${r.p} env=${env} live=${live} />
      <i class="island"></i><i class="home-ind"></i>
    </div>
  </div>` };
}

function Duo({ st, set, live }) {
  const k = st.duo, spec = DUO[k];
  const playlist = clipsOf(st.group);
  const s = player.s;
  const clip = CLIPS.find((c) => c.id === s.clipId);
  const others = playlist.filter((c) => c.id !== clip.id);
  const base = { statusBar: false, topInset: 24, playlist, group: st.group, onGroup: live.onGroup, onRotate: null };
  let screen, r;
  const pad = 14;

  if (k === 'A') {
    // 外屏竖握：画面与控件限内容区 382；状态栏在 Vertical Bar 内反白；
    // SideRail 一列操作项放进 Vertical Bar（84pt 居中），不占用内容区
    r = resolve(st, { kind: 'duo', w: 382, h: 678, posture: k });
    const p = r.p;
    const railBottom = p.hasControls ? (p.cb.type === 'minimal' ? 88 : 76) + 6 : 40;
    screen = html`<div class="screen" style="width:466px;height:678px">
      <div style="position:absolute;left:0;top:0"><${Video} p=${p} env=${{ ...base, ...r.env, w: 382, h: 678, railInVerticalBar: true }} live=${live} /></div>
      <${VerticalBar} theme="dark">
        ${p.hasSideRail && html`<${SideRail} hidden=${live.controlsHidden} rail=${p.rail} right=${24} bottom=${railBottom} />`}
      <//>
    </div>`;
  } else if (k === 'B') {
    // 内屏竖握：TopBar 右侧避让系统保留区 151×84，trailing 止于 518；边距 32
    r = resolve(st, { kind: 'duo', w: 669, h: 951, posture: k });
    screen = html`<div class="screen" style="width:669px;height:951px">
      <${Video} p=${r.p} env=${{ ...base, ...r.env, w: 669, h: 951, trailingInset: 151 - r.env.margin }} live=${live} />
      <div class="reserved"><${DuoStatusBar} /></div>
    </div>`;
  } else if (k === 'C' && !cSplit(st)) {
    // 内屏横握 · 全屏（横版视频）：horizontal；内容区 867，16:9 宽度撑满 867×488；边距 40，ControlBar 完整版；展平时画面可跨折痕
    r = resolve(st, { kind: 'duo', w: 867, h: 669, posture: k });
    screen = html`<div class="screen" style="width:951px;height:669px">
      <div style="position:absolute;left:0;top:0"><${Video} p=${r.p} env=${{ ...base, ...r.env, w: 867, h: 669 }} live=${live} /></div>
      <${VerticalBar} theme="dark" showCam=${false} />
    </div>`;
  } else if (k === 'C') {
    // 内屏横握 · 打开评论（竖版视频）：播放器 464（leading，按 vertical 模式，边距 16）+ 折痕 24 + 评论 380（trailing）
    // + Vertical Bar 84；分栏边界对齐折痕，画面不跨折痕
    r = resolve(st, { kind: 'duo', w: 464, h: 669, posture: 'C-split' });
    const p = r.p;
    screen = html`<div class="screen" style="width:951px;height:669px;background:#000">
      <div style="position:absolute;left:0;top:0"><${Video} p=${p} env=${{ ...base, ...r.env, w: 464, h: 669, railInVerticalBar: true }} live=${live} /></div>
      <div class="fold-region" style="left:464px;top:0;width:24px;height:669px"></div>
      <div class="pane-dark" style="left:488px;top:0;width:380px;height:669px">
        <${CommentsPane} inset=${0} onClose=${() => set({ cComments: false })} />
      </div>
      <${VerticalBar} theme="dark" showCam=${false}>
        ${p.hasSideRail && html`<${SideRail} hidden=${live.controlsHidden} rail=${p.rail} right=${24} bottom=${24} onComment=${() => set({ cComments: false })} />`}
      <//>
    </div>`;
  } else if (k === 'D') {
    // 内屏半折（桌面态）：画面在上半屏 669×463.5（horizontal），ControlBar 与信息在下半屏，不跨折痕区
    const upperH = 463.5, foldH = 24, lowerTop = upperH + foldH, lowerH = 951 - lowerTop;
    r = resolve(st, { kind: 'duo', w: 669, h: upperH, posture: k });
    const p = r.p, m = 32;
    const info = st.duoD === 'info';
    // 桌面态：下半屏控件常显（不做 3s 清屏）；单击下半屏空白处切换显隐，单击上半屏画面切换播放 / 暂停
    const state = stateOf(s, p);
    const hidden = live.controlsHidden && !live.scrubbing && p.cb.state !== 'scrubbing';
    const fade = (dir) => cx('v-fade', dir, hidden && 'is-hidden');
    const toggleControls = (e) => { if (!e.target.closest('button, input, a, .pb')) live.setControlsHidden(!hidden); };
    screen = html`<div class="screen" style="width:669px;height:951px">
      <div style="position:absolute;left:0;top:0">
        <${Video} p=${p} env=${{ ...base, ...r.env, w: 669, h: upperH, layout: 'mediaOnly', hideCenter: !info, manualControls: true }} live=${live} />
      </div>
      <div class="pane-dark tds-video" style=${`left:0;top:${lowerTop}px;width:669px;height:${lowerH}px;background:#000`} onClick=${toggleControls}>
        ${p.hasTopBar && html`<div class=${fade('up')} style="padding-top:16px"><${TopBar} margin=${m} centerSlot=${p.topBar.centerSlot} group=${st.group} onGroup=${live.onGroup} /></div>`}
        ${info ? html`<div style=${`padding:16px ${m}px 0`}>
          <div class="info"><div class="t-heading-s">${clip.title}</div><div class="t-body-m meta">${clip.place} · ${fmtTime(s.duration)} · ${clip.views}</div></div>
          <div class="t-body-m upnext-h" style="margin-top:16px">Up next</div>
          <div class="cards3">${others.slice(0, 3).map((c) => html`<button class="card3" onClick=${() => player.load(c.id)}><img src=${c.poster} alt="" /><span class="t-body-m">${c.title.split(' · ')[0]}</span></button>`)}</div>
        </div>` : html`<div class=${fade()}><${CenterStateLive} p=${p} /></div>`}
        ${p.hasControls && html`<${ControlBar} hidden=${hidden} disabled=${state === 'loading' || state === 'error'} type="standard" scrubbing=${live.scrubbing || p.cb.state === 'scrubbing'} hasSpeed=${p.cb.hasSpeed} hasRotate=${false}
            hasPreview=${p.cb.hasPreview} hasCounter=${false} hasChapters=${p.pb.hasChapters} ratio=${p.ratio} margin=${m} onScrub=${live.onScrub} playlist=${playlist} />`}
      </div>
      <div class="fold-region" style=${`left:0;top:${upperH}px;width:669px;height:${foldH}px`}></div>
    </div>`;
  } else {
    // 内屏半折（书本态）· NavigationSplitView：Primary 476 放播放器（按半区当窗口 → vertical），
    // 铰链处 0pt 分隔线；Secondary 放评论，右侧 Vertical Bar 84 承载状态栏与 SideRail
    r = resolve(st, { kind: 'duo', w: 476, h: 669, posture: k });
    const p = r.p;
    const comments = st.bookComments;
    screen = html`<div class="screen" style="width:951px;height:669px;background:#000">
      <div style="position:absolute;left:0;top:0"><${Video} p=${p} env=${{ ...base, ...r.env, w: 476, h: 669, railInVerticalBar: true }} live=${live} /></div>
      <i class="book-hinge"></i>
      <div class="pane-dark book-secondary">
        ${comments ? html`<${CommentsPane} onClose=${() => set({ bookComments: false })} />` : html`<div class="book-details">
          <div class="t-heading-s">${clip.title}</div>
          <div class="t-body-m meta">${clip.place} · ${fmtTime(s.duration)} · ${clip.views}</div>
          <button class="book-open-comments t-body-m" onClick=${() => set({ bookComments: true })}><${Icon} name="comment_outlined" size=${16} />${commentCount()} comments<${Icon} name="arrow_right_ios_outlined" size=${16} /></button>
          <div class="t-body-m upnext-h" style="margin-top:24px">Up next</div>
          <div style="margin-top:8px">${others.slice(0, 4).map((c) => html`<button class="list-item dark" onClick=${() => player.load(c.id)}>
            <${Icon} name="layers_outlined" size=${24} />
            <div class="li-text"><b class="t-body-l">${c.title.split(' · ')[0]}</b><span class="t-body-m">${c.place} · ${fmtTime(c.duration)}</span></div>
            <${Icon} name="arrow_right_ios_outlined" size=${16} />
          </button>`)}</div>
        </div>`}
      </div>
      <${VerticalBar} theme="dark" showCam=${false}>
        ${p.hasSideRail && html`<${SideRail} hidden=${live.controlsHidden} rail=${p.rail} right=${24} bottom=${24} onComment=${() => set((o) => ({ bookComments: !o.bookComments }))} />`}
      <//>
    </div>`;
  }
  return { r, natural: { w: spec.w + pad * 2, h: spec.h + pad * 2 }, node: html`<div style="position:relative">
    <div class=${cx('duo', k === 'A' && 'outer')}>
      ${screen}
    </div>
  </div>` };
}

function stateOf(s, p) {
  if (p.centerOverride !== 'auto') return p.centerOverride;
  return s.error ? 'error' : s.loading ? 'loading' : s.playing ? 'playing' : 'paused';
}

// 纵向（内屏竖握，保留区 151×84 内）：104×48，时间与 Levels 横排
function DuoStatusBar() {
  return html`<div class="duo-sb-v"><span class="vb-time">9:41</span><${RawSvg} svg=${DUO_LEVELS} cls="vb-levels" /></div>`;
}

function CenterStateLive({ p }) {
  const d = stateOf(usePlayer(), p);
  // 中心按钮自身处理播放；按钮外的空白处冒泡给下半屏，切换控件显隐
  return html`<div style="position:absolute;inset:0"><${CenterState} display=${d} seek=${seekShown(p)} /></div>`;
}

function Resizable({ st, set, live, scale }) {
  const { w, h } = st.rz;
  const r = resolve(st, { kind: 'resizable', w, h });
  const env = {
    ...r.env, w, h, statusBar: false, topInset: r.p.orientation === 'vertical' ? 24 : 8,
    onRotate: () => set({ rz: { w: h, h: w } }), playlist: clipsOf(st.group), group: st.group, onGroup: live.onGroup,
  };
  const drag = (axis) => (e) => {
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, sw = w, sh = h;
    const k = scale.current || 1;
    const move = (ev) => {
      const nw = axis.includes('r') ? Math.round(Math.min(1440, Math.max(280, sw + (ev.clientX - sx) / k * 2))) : sw;
      const nh = axis.includes('b') ? Math.round(Math.min(1200, Math.max(280, sh + (ev.clientY - sy) / k * 2))) : sh;
      set({ rz: { w: nw, h: nh } });
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); document.body.style.cursor = ''; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return { r, natural: { w: Math.max(w, 700), h: Math.max(h, 700) + 40 }, node: html`<div class="rz" style=${`width:${w}px;height:${h}px`}>
    <div class="rz-size">${w} × ${h} pt<em>${CLASS_LABEL[r.cls]} · ${r.p.orientation}</em></div>
    <div class="screen"><${Video} p=${r.p} env=${env} live=${live} /></div>
    <i class="rz-h r" onPointerDown=${drag('r')}></i><i class="rz-h b" onPointerDown=${drag('b')}></i><i class="rz-h br" onPointerDown=${drag('rb')}></i>
  </div>` };
}

// ---------------------------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------------------------
function App() {
  const [st, setSt] = useState(DEFAULTS);
  const [scrubbing, setScrubbing] = useState(false);
  const [controlsHidden, setControlsHidden] = useState(false); // 运行时清屏状态，跨旋转/折叠/缩放保留
  // 打开只在拖动时出现的能力（hasPreview）时，短暂进入 scrubbing 让效果立刻可见
  const [peek, setPeek] = useState(false);
  const peekTimer = useRef(null);
  const peekScrub = () => { setPeek(true); clearTimeout(peekTimer.current); peekTimer.current = setTimeout(() => setPeek(false), 2000); };
  const ps = usePlayer();
  const set = (patch) => setSt((o) => ({ ...o, ...(typeof patch === 'function' ? patch(o) : patch) }));
  const stageRef = useRef(null);
  const stage = useSize(stageRef);
  const scaleRef = useRef(1);

  useEffect(() => { player.load(CLIPS[0].id, { keepPlaying: false }); }, []);
  // Video.State = error 对应视频未加载：画面清空、进度归零；离开 error 时重新加载当前视频
  const prevOverride = useRef(st.centerOverride);
  useEffect(() => {
    const was = prevOverride.current;
    prevOverride.current = st.centerOverride;
    if (st.centerOverride === 'error') player.fail();
    else if (was === 'error' && player.s.error) player.retry();
  }, [st.centerOverride]);
  useEffect(() => {
    const f = () => set({ centerOverride: 'auto' });
    window.addEventListener('tds-retry', f);
    return () => window.removeEventListener('tds-retry', f);
  }, []);

  const live = {
    scrubbing: scrubbing || peek,
    onScrub: setScrubbing,
    controlsHidden,
    setControlsHidden,
    onGroup: (g) => {
      set({ group: g });
      const list = clipsOf(g);
      if (!list.find((c) => c.id === player.s.clipId)) player.load(list[0].id);
    },
  };

  const dev = st.device === 'iphone' ? IPhone({ st, set, live })
    : st.device === 'duo' ? Duo({ st, set, live })
    : Resizable({ st, set, live, scale: scaleRef });
  const pad = 40;
  const scale = stage.w ? Math.min(1, (stage.w - pad * 2) / dev.natural.w, (stage.h - pad * 2) / dev.natural.h) : 1;
  scaleRef.current = scale;


  return html`<div class="app">
    <${Panel} st=${st} set=${set} resolved=${dev.r} scrubbing=${scrubbing || peek} onPeekScrub=${peekScrub} ps=${ps} controlsHidden=${controlsHidden} />
    <main class="stage">
      <${DeviceBar} st=${st} set=${set} resolved=${dev.r} scale=${scale} />
      <div class="stage-canvas" ref=${stageRef}>
        <div class="stage-scale" style=${`transform:translate(-50%,-50%) scale(${scale})`}>${dev.node}</div>
      </div>
    </main>
  </div>`;
}

render(html`<${App} />`, document.getElementById('root'));
