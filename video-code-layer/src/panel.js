// Left control panel — every control maps 1:1 to a TDS component property (names as in Figma).
import { html, cx, fmtTime } from './lib.js';
import { player, speedLabel } from './player.js';
import { CLIPS, clipsOf } from './media.js';
import { CLASS_LABEL, DUO } from './rules.js';

export function Seg({ value, options, onChange, full, disabled }) {
  return html`<div class=${cx('segc', full && 'full')}>
    ${options.map((o) => {
      const [v, label] = Array.isArray(o) ? o : [o, o];
      return html`<button class=${cx(value === v && 'on')} disabled=${disabled} onClick=${() => onChange(v)}>${label}</button>`;
    })}
  </div>`;
}

export function Switch({ on, onChange, disabled }) {
  return html`<button class=${cx('switch', on && 'on')} role="switch" aria-checked=${on} disabled=${disabled} onClick=${() => onChange(!on)}></button>`;
}

// `na`: the capability doesn't exist in the current window/posture → the row isn't rendered
function Row({ label, sub, tip, children, na, live, disabled }) {
  if (na) return null;
  return html`<div class=${cx('row', disabled && 'disabled')} title=${tip || ''}>
    <div class="lbl">${label}${live && html`<span class="pill live">${live}</span>`}
      ${sub && html`<small>${sub}</small>`}
    </div>
    ${children}
  </div>`;
}

function Sec({ name, cn, tag, children }) {
  return html`<section class="sec">
    <div class="sec-h"><div class="name">${name}<small>${cn}</small></div>${tag && html`<span class="tag">${tag}</span>`}</div>
    ${children}
  </section>`;
}

const RZ_PRESETS = [
  ['iPhone', 375, 812], ['iPhone 横', 812, 375], ['Duo 外屏', 466, 678], ['Duo 内屏', 669, 951],
  ['Duo 内屏横', 951, 669], ['Flip 外屏', 360, 420], ['平板', 1024, 768], ['分屏小窗', 520, 440],
];

// Demo 区顶部：设备 / 窗口尺寸选择
export function DeviceBar({ st, set, resolved, scale }) {
  return html`<div class="devbar">
    <div class="devbar-row">
      <${Seg} value=${st.device} onChange=${(v) => set({ device: v })} options=${[['iphone', 'iPhone'], ['duo', 'iPhone Duo'], ['resizable', 'Resizable']]} />
      ${st.device === 'iphone' && html`<${Seg} value=${st.iphoneOrient} onChange=${(v) => set({ iphoneOrient: v })} options=${[['vertical', '竖屏 375×812'], ['horizontal', '横屏 812×375']]} />`}
      ${st.device === 'duo' && html`<div class="segc">${Object.entries(DUO).map(([k, d]) => html`<button class=${cx(st.duo === k && 'on')} title=${`${d.en} · ${d.w} × ${d.h} pt`} onClick=${() => set({ duo: k })}><b class="dk">${k}</b>${d.name}</button>`)}</div>`}
      <span class="devbar-zoom">${Math.round(scale * 100)}%</span>
    </div>
    ${st.device === 'duo' && html`<div class="devbar-row sub">
      <span class="devbar-meta">${DUO[st.duo].en} · ${DUO[st.duo].w} × ${DUO[st.duo].h} pt</span>
      ${st.duo === 'D' && html`<span class="devbar-item">下半屏 <${Seg} value=${st.duoD} onChange=${(v) => set({ duoD: v })} options=${[['info', '信息与选集'], ['center', '中心状态']]} /></span>`}
      <span class="devbar-item">显示标注 <${Switch} on=${st.annotate} onChange=${(v) => set({ annotate: v })} /></span>
    </div>`}
    ${st.device === 'resizable' && html`<div class="devbar-row sub">
      <span class="devbar-meta"><b>${st.rz.w} × ${st.rz.h} pt</b> · ${CLASS_LABEL[resolved.cls]} · 拖动窗口边缘调整</span>
      <div class="chips">${RZ_PRESETS.map(([n, w, h]) => html`<button class=${cx('chip', st.rz.w === w && st.rz.h === h && 'on')} onClick=${() => set({ rz: { w, h } })}>${n} ${w}×${h}</button>`)}</div>
    </div>`}
  </div>`;
}

export function Panel({ st, set, resolved, scrubbing, ps, controlsHidden }) {
  const na = resolved.na;
  const cb = (patch) => set((o) => ({ cb: { ...o.cb, ...patch } }));
  const rail = (patch) => set((o) => ({ rail: { ...o.rail, ...patch } }));
  const eff = resolved.p;
  const vertical = eff.orientation === 'vertical';
  const centerNow = ps.error ? 'error' : ps.loading ? 'loading' : ps.playing ? 'playing' : 'paused';
  const cbTypeNow = eff.cb.type;

  return html`<aside class="panel">
    <div class="panel-head">
      <div class="brand">Trip.com · TDS</div>
      <div class="panel-title"><b>Video 视频</b><span class="t-body-s" style="color:var(--text-tertiary)">Code Layer · 交互还原</span></div>
      <div class="panel-sub t-body-s">属性与 Figma 组件一一对应，悬停查看说明。</div>
    </div>

    <${Sec} name="Video" cn="主组件" tag=${na.orientation ? 'orientation=' + eff.orientation : 'Video'}>
      <${Row} label="orientation" na=${na.orientation} tip="由设备旋转决定">
        <${Seg} value=${eff.orientation} onChange=${(v) => set({ iphoneOrient: v })} options=${['vertical', 'horizontal']} />
      <//>
      <${Row} label="state" live=${ps.playing ? 'playing' : null} tip="单击画面切换；与中心播放键、控制栏图标联动">
        <${Seg} value=${ps.playing ? 'playing' : 'paused'} onChange=${(v) => player.setPlaying(v === 'playing')} options=${['paused', 'playing']} />
      <//>
      <${Row} label="hasTopBar"><${Switch} on=${st.hasTopBar} onChange=${(v) => set({ hasTopBar: v })} /><//>
      <${Row} label="hasControls"><${Switch} on=${st.hasControls} onChange=${(v) => set({ hasControls: v })} /><//>
      <${Row} label="autoHide" na=${na.autoHide} live=${controlsHidden ? '清屏中' : null} sub="3s 清屏" tip="playing 3s 无操作清屏；清屏时单击先唤起，再单击暂停"><${Switch} on=${st.autoHide} onChange=${(v) => set({ autoHide: v })} /><//>
      <${Row} label="hasSideRail" na=${na.hasSideRail} tip="UGC / 内容浏览类产线开启"><${Switch} on=${st.hasSideRail} onChange=${(v) => set({ hasSideRail: v })} /><//>
    <//>

    <${Sec} name="Media" cn="画面区" tag=${vertical ? '.Video.MediaPortrait' : '.Video.MediaLandscape'}>
      <${Row} label="ratio" tip=${vertical ? (st.ratio === '9:16' ? '顶部对齐，底部留 76pt' : st.ratio === '3:4' ? '宽度撑满，垂直居中' : '垂直居中，下方 16pt 自带 Rotate 按钮') : '高度撑满，水平居中'}>
        <${Seg} value=${st.ratio} onChange=${(v) => set({ ratio: v })} options=${['9:16', '3:4', '16:9']} />
      <//>
    <//>

    <${Sec} name="Video.State" cn="播放状态层" tag="CenterState">
      <${Row} label="state" live=${centerNow} tip="auto 跟随播放器；loading / error 在实例面板直接切换">
        <${Seg} value=${st.centerOverride} onChange=${(v) => set({ centerOverride: v })} options=${[['auto', 'auto'], ['loading', 'loading'], ['error', 'error']]} />
      <//>
      <${Row} label="hasSeek" sub="±10s" tip="paused 时播放键两侧 ±10s；auto = 竖屏隐藏、横屏显示">
        <${Seg} value=${st.hasSeek} onChange=${(v) => set({ hasSeek: v })} options=${[['auto', 'auto'], ['on', 'on'], ['off', 'off']]} />
      <//>
    <//>

    ${st.hasControls && html`<${Sec} name="Video.ControlBar" cn="播放控制栏" tag=${'type=' + cbTypeNow}>
      <${Row} label="type" sub=${st.cb.type === 'auto' ? `→ ${cbTypeNow}` : null} tip="auto：竖屏 minimal / 横屏 standard">
        <${Seg} value=${st.cb.type} onChange=${(v) => cb({ type: v })} options=${['auto', 'minimal', 'standard']} />
      <//>
      <${Row} label="state" live=${scrubbing ? 'dragging' : null} tip="拖动进度条即进入 scrubbing">
        <${Seg} value=${scrubbing ? 'scrubbing' : st.cb.state} onChange=${(v) => cb({ state: v })} options=${['default', 'scrubbing']} />
      <//>
      <${Row} label="hasSpeed" na=${na['cb.hasSpeed']} tip="1.0X › 1.25X › 1.5X › 2.0X › 0.75X"><${Switch} on=${st.cb.hasSpeed} onChange=${(v) => cb({ hasSpeed: v })} /><//>
      <${Row} label="hasRotate" na=${na['cb.hasRotate']} tip="standard 右端 Shrink 图标"><${Switch} on=${st.cb.hasRotate} onChange=${(v) => cb({ hasRotate: v })} /><//>
      <${Row} label="hasPreview" tip="scrubbing 时的画面缩略预览"><${Switch} on=${st.cb.hasPreview} onChange=${(v) => cb({ hasPreview: v })} /><//>
      <${Row} label="hasCounter" na=${na['cb.hasCounter']} tip="多素材计数：胶片条 + 数量标记"><${Switch} on=${st.cb.hasCounter} onChange=${(v) => cb({ hasCounter: v })} /><//>
    <//>

    <${Sec} name="Video.ProgressBar" cn="进度条">
      <${Row} label="hasChapters" tip="轨道上展示章节锚点"><${Switch} on=${st.pb.hasChapters} onChange=${(v) => set({ pb: { hasChapters: v } })} /><//>
    <//>`}

    ${st.hasTopBar && !na['topBar.centerSlot'] && html`<${Sec} name="Video.TopBar" cn="顶部栏">
      <${Row} label="centerSlot" tip="SegmentedControl 分组切换">
        <${Seg} value=${st.topBar.centerSlot} onChange=${(v) => set({ topBar: { centerSlot: v } })} options=${[['empty', '留空'], ['segmented', 'SegmentedControl']]} />
      <//>
    <//>`}

    ${eff.hasSideRail && html`<${Sec} name="Video.SideRail" cn="侧边互动栏">
      ${[['hasCreator', '创作者头像与关注'], ['hasLike', '点赞'], ['hasComment', '评论'], ['hasFavorite', '收藏'], ['hasShare', '分享'], ['hasMenu', '目录']].map(([k, sub]) => html`<${Row} label=${k} tip=${sub}><${Switch} on=${st.rail[k]} onChange=${(v) => rail({ [k]: v })} /><//>`)}
      ${[['Like', 'likeCount'], ['Comment', 'commentCount'], ['Favorite', 'favoriteCount']].map(([n, key]) => html`<${Row} label=${'has' + n + 'Count'} tip="计数为 0 或拿不到时关闭，不要显示 0">
        <span style="display:flex;gap:8px;align-items:center">
          <input class="txt" value=${st.rail[key]} disabled=${!st.rail['has' + n + 'Count']} onInput=${(e) => rail({ [key]: e.target.value })} aria-label=${key} />
          <${Switch} on=${st.rail['has' + n + 'Count']} onChange=${(v) => rail({ ['has' + n + 'Count']: v })} />
        </span>
      <//>`)}
    <//>`}

    <${Sec} name="Content" cn="素材 · Singapore" tag=${(clipsOf(st.group).findIndex((c) => c.id === ps.clipId) + 1 || '–') + '/' + clipsOf(st.group).length}>
      <div class="clips">${CLIPS.map((c) => html`<button class=${cx('clip', ps.clipId === c.id && 'on')} onClick=${() => { if (!clipsOf(st.group).find((x) => x.id === c.id)) set({ group: 'highlights' }); player.load(c.id); }}>
        <img src=${c.poster} alt="" /><div><b>${c.title}</b><span>${c.place} · ${fmtTime(c.duration)}</span></div>
      </button>`)}</div>
      <div class="note">实拍素材来自 Wikimedia Commons（CC 授权，见 CREDITS.md）。</div>
    <//>

    <${Sec} name="Rules" cn="当前窗口生效规则">
      <div class="rules">
        <div class="kv">
          <b>窗口</b><span>${resolved.cls === 'phone' && st.device === 'iphone' ? 'iPhone' : CLASS_LABEL[resolved.cls]}</span>
          <b>orientation</b><span>${eff.orientation}</span>
          <b>ControlBar</b><span>${eff.cb.type}${eff.cb.hasRotate ? ' · hasRotate' : ''}${eff.cb.hasSpeed ? ' · hasSpeed' : ''}</span>
          <b>播放</b><span>${fmtTime(player.t)} / ${fmtTime(ps.duration)} · ${speedLabel(ps.rate)}${ps.muted ? ' · Muted' : ''}</span>
        </div>
        <ul>${resolved.notes.map((n) => html`<li>${n}</li>`)}${Object.entries(na).map(([k, n]) => html`<li>隐藏 <code>${k.split('.').pop()}</code>：${n}</li>`)}</ul>
      </div>
    <//>
  </aside>`;
}
