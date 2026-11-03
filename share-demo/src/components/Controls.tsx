import type { ReactNode } from "react";
import type { Config, Posture } from "../lib/types";
import { CUSTOM_PRESETS, IPHONES, POSTURES, round, type ItemRule, type ScreenSpec, type ShareLayout } from "../lib/spec";
import { SCENARIOS } from "../data/scenarios";
import tripLogo from "../assets/img/trip-logo.png";
import mapImg from "../assets/img/itinerary-map.jpg";
import nyc from "../assets/img/new-york.jpg";
import room from "../assets/img/hotel-room.jpg";

type Set = <K extends keyof Config>(k: K, v: Config[K]) => void;

/* ------------------------------------------------------------------ ui kit */

function Section({ title, hint, children, disabled }: { title: string; hint?: string; children: ReactNode; disabled?: boolean }) {
  return (
    <section className={`c-sec ${disabled ? "is-disabled" : ""}`}>
      <header>
        <h3>{title}</h3>
        {hint && <span>{hint}</span>}
      </header>
      {children}
    </section>
  );
}

function Field({ label, children, sub }: { label: string; children: ReactNode; sub?: string }) {
  return (
    <div className="c-field">
      <div className="c-label">
        <span>{label}</span>
        {sub && <em>{sub}</em>}
      </div>
      {children}
    </div>
  );
}

function Seg<T extends string>({
  value,
  options,
  onChange,
  cols,
}: {
  value: T;
  options: { v: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  cols?: number;
}) {
  return (
    <div className="c-seg" style={cols ? { gridTemplateColumns: `repeat(${cols}, 1fr)` } : { gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button key={o.v} type="button" title={o.title} className={value === o.v ? "on" : ""} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="c-toggle">
      <span>
        <b>{label}</b>
        {sub && <em>{sub}</em>}
      </span>
      <button type="button" className={`c-switch ${value ? "on" : ""}`} onClick={() => onChange(!value)} aria-pressed={value}>
        <i />
      </button>
    </label>
  );
}

function Slider({ value, min, max, step = 1, onChange, unit }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <div className="c-slider">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <input
        type="number"
        min={min}
        max={max}
        value={Math.round(value)}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
      />
      {unit && <em>{unit}</em>}
    </div>
  );
}

/* ------------------------------------------------------------------ panel */

export function Controls({
  cfg,
  set,
  screen,
  layout,
  rule,
  mediaW,
  onPlay,
  onOpen,
  open,
}: {
  cfg: Config;
  set: Set;
  screen: ScreenSpec;
  layout: ShareLayout;
  rule: ItemRule;
  mediaW?: number;
  onPlay: () => void;
  onOpen: () => void;
  open: boolean;
}) {
  const thumbs = { itinerary: mapImg, flight: nyc, hotel: room };
  return (
    <aside className="controls">
      <div className="c-brand">
        <img src={tripLogo} alt="Trip.com" />
        <div>
          <h1>Share 分享 · 交互 Demo</h1>
          <p>TDS 2026 · iPhone / iPhone DUO / Resizable</p>
        </div>
      </div>

      <div className="c-actions">
        <button type="button" className="c-btn primary" onClick={onPlay}>
          ▶ 播放分享流程
        </button>
        <button type="button" className="c-btn" onClick={onOpen}>
          {open ? "关闭分享面板" : "打开分享面板"}
        </button>
      </div>

      <Section title="设备 Device">
        <Seg
          value={cfg.device}
          onChange={(v) => set("device", v)}
          options={[
            { v: "iphone", label: "iPhone" },
            { v: "duo", label: "iPhone DUO" },
            { v: "custom", label: "自由尺寸" },
          ]}
        />
        {cfg.device === "iphone" && (
          <Field label="机型">
            <Seg
              value={cfg.iphone}
              onChange={(v) => set("iphone", v)}
              cols={1}
              options={(Object.keys(IPHONES) as (keyof typeof IPHONES)[]).map((k) => ({
                v: k,
                label: (
                  <span className="c-opt">
                    {IPHONES[k].name}
                    <em>
                      {IPHONES[k].w} × {IPHONES[k].h}
                    </em>
                  </span>
                ),
              }))}
            />
          </Field>
        )}
        {cfg.device === "duo" && (
          <>
            <Field label="形态 Posture" sub="切换形态保持当前步骤与滚动位置">
              <div className="c-postures">
                {(Object.keys(POSTURES) as Posture[]).map((p) => (
                  <button key={p} type="button" className={cfg.posture === p ? "on" : ""} onClick={() => set("posture", p)}>
                    <span className={`pg-glyph g-${p}`}>
                      <i />
                    </span>
                    <b>{POSTURES[p].title}</b>
                    <em>
                      {POSTURES[p].w} × {POSTURES[p].h}
                      {p === "D" && " · 待确认"}
                    </em>
                  </button>
                ))}
              </div>
            </Field>
            {cfg.posture === "D" && (
              <Field label="触发所在半区" sub="面板停靠触发所在半区，不跨折痕">
                <Seg
                  value={cfg.bookSide}
                  onChange={(v) => set("bookSide", v)}
                  options={[
                    { v: "left", label: "左半区" },
                    { v: "right", label: "右半区" },
                  ]}
                />
              </Field>
            )}
          </>
        )}
        {cfg.device === "custom" && (
          <>
            <Field label="宽 W" sub="也可在画布中拖拽设备边缘">
              <Slider value={cfg.customW} min={320} max={1366} onChange={(v) => set("customW", v)} unit="pt" />
            </Field>
            <Field label="高 H">
              <Slider value={cfg.customH} min={480} max={1366} onChange={(v) => set("customH", v)} unit="pt" />
            </Field>
            <div className="c-chips">
              {CUSTOM_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={cfg.customW === p.w && cfg.customH === p.h ? "on" : ""}
                  onClick={() => {
                    set("customW", p.w);
                    set("customH", p.h);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </>
        )}
      </Section>

      <Section title="场景 Scenario" hint="Trip.com 真实内容">
        <div className="c-scenes">
          {(Object.keys(SCENARIOS) as (keyof typeof SCENARIOS)[]).map((k) => (
            <button key={k} type="button" className={cfg.scenario === k ? "on" : ""} onClick={() => set("scenario", k)}>
              <img src={thumbs[k]} alt="" />
              <span>
                <b>{SCENARIOS[k].label}</b>
                <em>{SCENARIOS[k].sub}</em>
              </span>
            </button>
          ))}
        </div>
        <Field label="渠道区域">
          <Seg
            value={cfg.region}
            onChange={(v) => set("region", v)}
            options={[
              { v: "intl", label: "海外 International" },
              { v: "cn", label: "中国大陆" },
            ]}
          />
        </Field>
        <Field label="语言" sub="多语言适配：label 最多 2 行，超出省略">
          <Seg
            value={cfg.lang}
            onChange={(v) => set("lang", v)}
            options={[
              { v: "en", label: "English" },
              { v: "zh", label: "简体中文" },
              { v: "de", label: "Deutsch" },
            ]}
          />
        </Field>
      </Section>

      <Section title="Share">
        <Toggle label="hasMedia" sub="半弹层上方显示图片预览区（Share as image）" value={cfg.hasMedia} onChange={(v) => set("hasMedia", v)} />
      </Section>

      <Section title=".Share.Media" disabled={!cfg.hasMedia}>
        <Field label="type">
          <Seg
            value={cfg.mediaType}
            onChange={(v) => set("mediaType", v)}
            options={[
              { v: "fit", label: "fit 完整" },
              { v: "scroll", label: "scroll 长图" },
              { v: "carousel", label: "carousel 多图" },
            ]}
          />
        </Field>
        {cfg.mediaType !== "scroll" && (
          <Field label="ratio">
            <Seg
              value={cfg.ratio}
              onChange={(v) => set("ratio", v)}
              options={(["16:9", "4:3", "1:1", "3:4", "9:16"] as const).map((r) => ({ v: r, label: r }))}
            />
          </Field>
        )}
        {cfg.mediaType === "carousel" && <Toggle label="hasIndicator" sub="底部圆点" value={cfg.hasIndicator} onChange={(v) => set("hasIndicator", v)} />}
        <Field label="Image state" sub="生成中 / 失败均居中直接展示，不展示占位">
          <Seg
            value={cfg.imageState}
            onChange={(v) => set("imageState", v)}
            options={[
              { v: "ready", label: "ready" },
              { v: "loading", label: "loading" },
              { v: "error", label: "error" },
            ]}
          />
        </Field>
      </Section>

      <Section title="Share.Panel">
        <Field label="layout">
          <Seg
            value={cfg.layout}
            onChange={(v) => set("layout", v)}
            options={[
              { v: "singleRow", label: "singleRow 一行" },
              { v: "doubleRow", label: "doubleRow 双行" },
            ]}
          />
        </Field>
        <Field label="overflow">
          <Seg
            value={cfg.overflow}
            onChange={(v) => set("overflow", v)}
            options={[
              { v: "fixed", label: "fixed 平分" },
              { v: "scroll", label: "scroll 横滑" },
            ]}
          />
        </Field>
        <div className="c-toggles">
          <Toggle label="hasPromotion" sub="分享激励 Notice" value={cfg.hasPromotion} onChange={(v) => set("hasPromotion", v)} />
          <Toggle label="hasPreview" sub="分享内容预览" value={cfg.hasPreview} onChange={(v) => set("hasPreview", v)} />
          <Toggle label="hasPermission" sub="查看 / 编辑权限" value={cfg.hasPermission} onChange={(v) => set("hasPermission", v)} />
          <Toggle label="hasContacts" sub="站内联系人" value={cfg.hasContacts} onChange={(v) => set("hasContacts", v)} />
          <Toggle label="hasExtension" sub="隐私设置扩展" value={cfg.hasExtension} onChange={(v) => set("hasExtension", v)} />
          <Toggle label="Share.Item disabled" sub="演示渠道不可用：去色 + 40%" value={cfg.disabledDemo} onChange={(v) => set("disabledDemo", v)} />
        </div>
      </Section>

      <Section title="流程 Flow">
        <Toggle label="模拟生成 loading" sub="点击分享 → loading → 面板 → 图片 loading → 长图" value={cfg.flowLoading} onChange={(v) => set("flowLoading", v)} />
        <Field label="loading 时长">
          <Slider value={cfg.loadingMs} min={300} max={4000} step={100} onChange={(v) => set("loadingMs", v)} unit="ms" />
        </Field>
        <Toggle label="显示尺寸标注" sub="面板 / 分享图宽度与边距" value={cfg.annotate} onChange={(v) => set("annotate", v)} />
      </Section>

      <section className="c-readout">
        <h3>实时规范参数</h3>
        <dl>
          <dt>窗口</dt>
          <dd>
            {screen.w} × {screen.h} pt {screen.compact ? "· 手机规则" : "· 大屏规则"}
          </dd>
          <dt>面板</dt>
          <dd>
            {round(layout.panel.w)} {layout.panel.floating ? `· x = ${round(layout.panel.x)}，左右 ≥ 8，max 653` : "· 横向撑满"}
          </dd>
          {cfg.hasMedia && (
            <>
              <dt>分享图</dt>
              <dd>
                {round(mediaW ?? layout.media.w)} · {layout.media.inset}
              </dd>
              <dt>预览顶部</dt>
              <dd>{layout.media.top}（标题栏 {screen.navBar} + 16）</dd>
            </>
          )}
          <dt>Share.Item</dt>
          <dd>
            {round(rule.itemW)} · 露出 {round(rule.visible)} 个
          </dd>
          <dt>规则</dt>
          <dd>{rule.rule}</dd>
        </dl>
      </section>
      <p className="c-foot">
        内容来源：Figma Share 文件（Guideline / Media / iPhone Duo 适配）与 Mobbin 上的 Trip.com iOS 页面。
      </p>
    </aside>
  );
}
