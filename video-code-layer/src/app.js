import { html, render, useState, useEffect, useRef, useLayoutEffect, cx, fmtTime } from './lib.js';
import { Icon, RawSvg, DUO_LEVELS, STATUS_ICONS } from './icons.js';
import { player, usePlayer } from './player.js';
import { CLIPS, clipsOf } from './media.js';
import { Video, TopBar, ControlBar, CenterState, SideRail } from './video.js';
import { resolve, CLASS_LABEL, DUO } from './rules.js';
import { Panel } from './panel.js';

export const DEFAULTS = {
  device: 'iphone',          // iphone | duo | resizable
  iphoneOrient: 'vertical',  // iPhone rotation drives Video.orientation
  duo: 'A',                  // iPhone Duo posture A–E
  duoD: 'info',              // tabletop lower half: info | center
  annotate: true,
  rz: { w: 669, h: 951 },
  // ---- TDS props (Video 主组件) ----
  hasTopBar: true,
  hasControls: true,
  hasSideRail: false,
  ratio: '9:16',             // Media › ratio
  centerOverride: 'auto',    // CenterState instance: auto | loading | error
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

function Dims({ segs, top = -52, rows }) {
  // Figma-style dimension annotation rows above a screen: [[label, width, offsetX?], ...]
  return html`${(rows || [segs]).map((row, ri) => {
    let x = 0;
    return row.map(([label, w, skip]) => {
      const el = skip ? null : html`<div class="dim-ann" style=${`left:${x}px;top:${top + ri * 33}px;width:${w}px;height:27px`}><span>${label}</span><i class="ln"></i></div>`;
      x += w;
      return el;
    });
  })}`;
}

function VerticalBar({ theme = 'dark', showCam = true, children }) {
  return html`<div class=${'vbar ' + theme}>
    ${showCam && html`<i class="cam"></i>`}
    <div class="vb-time" style=${`margin-top:${showCam ? 22 : 40}px`}>9:41</div>
    <${RawSvg} svg=${DUO_LEVELS} cls="vb-levels" />
    ${children}
  </div>`;
}

// ---------------------------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------------------------
function IPhone({ st, set, live }) {
  const vertical = st.iphoneOrient === 'vertical';
  const w = vertical ? 375 : 812, h = vertical ? 812 : 375;
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
  const ann = st.annotate;
  const playlist = clipsOf(st.group);
  const s = player.s;
  const clip = CLIPS.find((c) => c.id === s.clipId);
  const others = playlist.filter((c) => c.id !== clip.id);
  const base = { statusBar: false, topInset: 24, playlist, group: st.group, onGroup: live.onGroup, onRotate: null };
  let screen, r, annRows = [];
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
        ${p.hasSideRail && html`<${SideRail} rail=${p.rail} right=${18} bottom=${railBottom} />`}
      <//>
    </div>`;
    annRows = [[['内容区 382', 382], ['Vertical Bar 84', 84]], [['16', 16], ['', 350, true], ['16', 16]]];
  } else if (k === 'B') {
    // 内屏竖握：TopBar 右侧避让系统保留区 151×84，trailing 止于 518；边距 32
    r = resolve(st, { kind: 'duo', w: 669, h: 951, posture: k });
    screen = html`<div class="screen" style="width:669px;height:951px">
      <${Video} p=${r.p} env=${{ ...base, ...r.env, w: 669, h: 951, trailingInset: 151 - r.env.margin }} live=${live} />
      <div class="reserved"><span class="vb-time">9:41</span><${RawSvg} svg=${STATUS_ICONS} style="width:87px;height:22px;clip-path:inset(0 31px 0 27px);margin:0 -31px 0 -27px" /></div>
    </div>`;
    annRows = [[['TopBar 可用 518', 518], ['保留区 151', 151]], [['32', 32], ['', 605, true], ['32', 32]]];
  } else if (k === 'C') {
    // 内屏横握：horizontal；内容区 867，不进入 Vertical Bar；展平时画面可跨折痕
    r = resolve(st, { kind: 'duo', w: 867, h: 669, posture: k });
    screen = html`<div class="screen" style="width:951px;height:669px">
      <div style="position:absolute;left:0;top:0"><${Video} p=${r.p} env=${{ ...base, ...r.env, w: 867, h: 669 }} live=${live} /></div>
      <${VerticalBar} theme="dark" showCam=${false} />
      ${ann && html`<i class="fold-axis" style="left:475px;top:0;width:1px;height:669px"></i><span class="fold-tag" style="left:396px;top:72px">Fold · 展平时画面可跨折痕</span>`}
    </div>`;
    annRows = [[['内容区 867', 867], ['Vertical Bar 84', 84]], [['40', 40], ['', 787, true], ['40', 40]]];
  } else if (k === 'D') {
    // 内屏半折（桌面态）：画面在上半屏 669×463.5（horizontal），ControlBar 与信息在下半屏，不跨折痕区
    const upperH = 463.5, foldH = 24, lowerTop = upperH + foldH, lowerH = 951 - lowerTop;
    r = resolve(st, { kind: 'duo', w: 669, h: upperH, posture: k });
    const p = r.p, m = 32;
    const info = st.duoD === 'info';
    screen = html`<div class="screen" style="width:669px;height:951px">
      <div style="position:absolute;left:0;top:0">
        <${Video} p=${p} env=${{ ...base, ...r.env, w: 669, h: upperH, layout: 'mediaOnly', hideCenter: !info }} live=${live} />
      </div>
      <div class="pane-dark tds-video" style=${`left:0;top:${lowerTop}px;width:669px;height:${lowerH}px;background:#000`}>
        ${p.hasTopBar && html`<div style="padding-top:16px"><${TopBar} margin=${m} centerSlot=${p.topBar.centerSlot} group=${st.group} onGroup=${live.onGroup} /></div>`}
        ${info ? html`<div style=${`padding:16px ${m}px 0`}>
          <div class="info"><div class="t-heading-s">${clip.title}</div><div class="t-body-m meta">${clip.place} · ${fmtTime(s.duration)} · ${clip.views}</div></div>
          <div class="t-body-m upnext-h" style="margin-top:16px">Up next</div>
          <div class="cards3">${others.slice(0, 3).map((c) => html`<button class="card3" onClick=${() => player.load(c.id)}><img src=${c.poster} alt="" /><span class="t-body-m">${c.title.split(' · ')[0]}</span></button>`)}</div>
        </div>` : html`<${CenterStateLive} p=${p} />`}
        ${p.hasControls && html`<${ControlBar} type="standard" scrubbing=${live.scrubbing || p.cb.state === 'scrubbing'} hasSpeed=${p.cb.hasSpeed} hasRotate=${false}
            hasPreview=${p.cb.hasPreview} hasCounter=${false} hasChapters=${p.pb.hasChapters} ratio=${p.ratio} margin=${m} onScrub=${live.onScrub} playlist=${playlist} />`}
      </div>
      <div class="reserved"><span class="vb-time">9:41</span></div>
      <div class="fold-region" style=${`left:0;top:${upperH}px;width:669px;height:${foldH}px;${ann ? '' : 'background:#000'}`}></div>
      ${ann && html`<span class="fold-tag" style=${`left:210px;top:${upperH + 2.5}px`}>Folding region · 桌面态折痕水平（示意 24pt）</span>`}
    </div>`;
    annRows = [[['页面 669', 669]], [['32', 32], ['', 605, true], ['32', 32]]];
  } else {
    // 内屏半折（书本态）：播放器停靠 leading 半区（464），按半区当窗口 → vertical；trailing 放详情与选集
    r = resolve(st, { kind: 'duo', w: 464, h: 669, posture: k });
    screen = html`<div class="screen" style="width:951px;height:669px;background:#fff">
      <div style="position:absolute;left:0;top:0"><${Video} p=${r.p} env=${{ ...base, ...r.env, w: 464, h: 669 }} live=${live} /></div>
      <div class="pane-light" style="left:488px;top:0;width:380px;height:669px;padding:24px 16px">
        <div class="t-heading-s">${clip.title}</div>
        <div class="t-body-m" style="color:var(--text-tertiary);margin-top:8px">${clip.place} · ${fmtTime(s.duration)} · ${clip.views}</div>
        <div class="t-body-m" style="color:var(--text-tertiary);margin-top:24px">Up next</div>
        <div style="margin-top:8px">${others.slice(0, 5).map((c) => html`<button class="list-item" onClick=${() => player.load(c.id)}>
          <${Icon} name="layers_outlined" size=${24} style="color:var(--text-primary)" />
          <div class="li-text"><b class="t-body-l">${c.title.split(' · ')[0]}</b><span class="t-body-m">${c.place} · ${fmtTime(c.duration)}</span></div>
          <${Icon} name="arrow_right_ios_outlined" size=${16} style="color:var(--text-tertiary)" />
        </button>`)}</div>
      </div>
      <div style="position:absolute;right:0;top:0;bottom:0;width:84px"><${VerticalBar} theme="light" showCam=${false} /></div>
      <div class="fold-region" style=${`left:464px;top:0;width:24px;height:669px;${ann ? '' : 'background:#000'}`}></div>
      ${ann && html`<span class="fold-tag" style="left:401px;top:626px">Folding region · 示意 24pt</span>`}
    </div>`;
    annRows = [[['播放器 464', 464], ['折痕 24', 24], ['详情 380', 380], ['84', 83]], [['16', 16], ['', 432, true], ['16', 16]]];
  }
  const annH = ann ? 70 : 0;
  return { r, natural: { w: spec.w + pad * 2, h: spec.h + pad * 2 + annH }, node: html`<div style=${`padding-top:${annH}px;position:relative`}>
    <div class=${cx('duo', k === 'A' && 'outer')}>
      ${ann && html`<div style=${`position:absolute;left:${pad}px;top:${pad}px`}><${Dims} rows=${annRows} top=${-annH - pad + 4} /></div>`}
      ${screen}
    </div>
  </div>` };
}

function CenterStateLive({ p }) {
  const s = usePlayer();
  let d = s.playing ? 'playing' : 'paused';
  if (s.loading) d = 'loading';
  if (s.error) d = 'error';
  if (p.centerOverride !== 'auto') d = p.centerOverride;
  return html`<div style="position:absolute;inset:0" onClick=${() => (d === 'playing' || d === 'paused') && player.toggle()}><${CenterState} display=${d} /></div>`;
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
  const ps = usePlayer();
  const set = (patch) => setSt((o) => ({ ...o, ...(typeof patch === 'function' ? patch(o) : patch) }));
  const stageRef = useRef(null);
  const stage = useSize(stageRef);
  const scaleRef = useRef(1);

  useEffect(() => { player.load(CLIPS[0].id, { keepPlaying: false }); }, []);
  useEffect(() => {
    const f = () => set({ centerOverride: 'auto' });
    window.addEventListener('tds-retry', f);
    return () => window.removeEventListener('tds-retry', f);
  }, []);

  const live = {
    scrubbing,
    onScrub: setScrubbing,
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

  const title = st.device === 'iphone' ? `iPhone · ${st.iphoneOrient === 'vertical' ? '375 × 812' : '812 × 375'}`
    : st.device === 'duo' ? `iPhone Duo · ${st.duo} ${DUO[st.duo].name} · ${DUO[st.duo].w} × ${DUO[st.duo].h}`
    : `Resizable · ${st.rz.w} × ${st.rz.h}`;

  return html`<div class="app">
    <${Panel} st=${st} set=${set} resolved=${dev.r} scrubbing=${scrubbing} ps=${ps} />
    <main class="stage">
      <div class="stage-bar">
        <div class="stage-title"><b>Demo</b>${title}</div>
        <div class="stage-title">${Math.round(scale * 100)}%</div>
      </div>
      <div class="stage-canvas" ref=${stageRef}>
        <div class="stage-scale" style=${`transform:translate(-50%,-50%) scale(${scale})`}>${dev.node}</div>
      </div>
    </main>
  </div>`;
}

render(html`<${App} />`, document.getElementById('root'));
