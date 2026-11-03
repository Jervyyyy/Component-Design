import { useRef, type ReactNode } from "react";
import type { ScreenSpec, ShareLayout } from "../lib/spec";
import { round } from "../lib/spec";

/* ------------------------------------------------------------------ status glyphs */

function Signal({ c }: { c: string }) {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" fill={c} aria-hidden>
      <rect x="0" y="8" width="3" height="4" rx="1" />
      <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
      <rect x="10" y="3" width="3" height="9" rx="1" />
      <rect x="15" y="0" width="3" height="12" rx="1" />
    </svg>
  );
}
function Wifi({ c, size = 16 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={(size * 12) / 16} viewBox="0 0 16 12" fill={c} aria-hidden>
      <path d="M8 2.2c2.4 0 4.6.9 6.3 2.4l1.2-1.3A11 11 0 0 0 8 .5 11 11 0 0 0 .5 3.3l1.2 1.3A9.3 9.3 0 0 1 8 2.2Z" />
      <path d="M8 5.6c1.5 0 2.9.5 3.9 1.4l1.2-1.3A7.6 7.6 0 0 0 8 3.9c-2 0-3.7.7-5.1 1.8L4.1 7C5.1 6.1 6.5 5.6 8 5.6Z" />
      <path d="M8 9a2 2 0 0 1 1.5.6L8 11.3 6.5 9.6A2 2 0 0 1 8 9Z" />
    </svg>
  );
}
function Battery({ c }: { c: string }) {
  return (
    <svg width="27" height="13" viewBox="0 0 27 13" fill="none" aria-hidden>
      <rect x="0.5" y="0.5" width="23" height="12" rx="3.8" stroke={c} strokeOpacity=".4" />
      <rect x="2" y="2" width="20" height="9" rx="2.5" fill={c} />
      <path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" fill={c} fillOpacity=".45" />
    </svg>
  );
}

export function StatusBar({ h, light }: { h: number; light: boolean }) {
  const c = light ? "#fff" : "#121826";
  return (
    <div className="statusbar" style={{ height: h, color: c }}>
      <span className="sb-time">9:41</span>
      <span className="sb-icons">
        <Signal c={c} />
        <Wifi c={c} />
        <Battery c={c} />
      </span>
    </div>
  );
}

/** iPhone DUO status cluster: time + wifi ring (lives in the Vertical Bar or the Reserved Region) */
function DuoStatus({ light }: { light: boolean }) {
  const c = light ? "#fff" : "#121826";
  return (
    <div className="duo-status" style={{ color: c }}>
      <span className="duo-time">9:41</span>
      <span className="duo-ring" style={{ borderColor: light ? "rgba(255,255,255,.55)" : "rgba(18,24,38,.35)" }}>
        <Wifi c={c} size={15} />
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ chrome inside the screen */

export function ScreenChrome({
  s,
  light,
  annotate,
}: {
  s: ScreenSpec;
  light: boolean;
  annotate: boolean;
}) {
  return (
    <div className="chrome" aria-hidden>
      {s.kind !== "duo" && <StatusBar h={s.statusBar} light={light} />}
      {s.island && <div className="island" />}
      {s.notch && <div className="notch" />}
      {s.verticalBar && (
        <div
          className={`vbar ${annotate ? "is-annot" : ""}`}
          style={{ width: s.verticalBar.width, height: s.verticalBar.height }}
        >
          <span className="cam" />
          <DuoStatus light={light} />
          <span className="pane-ctl" style={{ top: s.verticalBar.height - 86 }}>
            <i />
            <i />
            <i />
          </span>
          {annotate && <span className="annot-tag">Vertical Bar · {s.verticalBar.width}</span>}
        </div>
      )}
      {s.reserved && (
        <div
          className={`reserved ${annotate ? "is-annot" : ""}`}
          style={{ left: s.reserved.x, top: s.reserved.y, width: s.reserved.w, height: s.reserved.h }}
        >
          <DuoStatus light={light} />
          {annotate && <span className="annot-tag">Reserved Region</span>}
        </div>
      )}
      {s.crease && <div className={`crease is-${s.crease}`} />}
      {s.fold && (
        <div className="fold" style={{ left: s.fold.x, width: s.fold.w }}>
          {annotate && <span className="fold-tag">Folding region · reservedRegions(kind: .division) · 示意 {s.fold.w}pt</span>}
        </div>
      )}
      <div className="home-ind" />
    </div>
  );
}

/* ------------------------------------------------------------------ dimension annotations */

function DimRow({ segs, total }: { segs: { w: number; label: string; strong?: boolean }[]; total: number }) {
  return (
    <div className="dimrow" style={{ width: total }}>
      {segs.map((sg, i) =>
        sg.w > 0.5 ? (
          <div key={i} className={`dim ${sg.strong ? "is-strong" : ""}`} style={{ width: sg.w }}>
            <span className="dim-label">{sg.label}</span>
            <span className="dim-line" />
          </div>
        ) : null,
      )}
    </div>
  );
}

export function Dimensions({ s, layout, hasMedia, mediaW }: { s: ScreenSpec; layout: ShareLayout; hasMedia: boolean; mediaW?: number }) {
  const { panel, media } = layout;
  const mw = mediaW ?? media.w;
  const mx = media.x + (media.w - mw) / 2;
  const rows = [];
  if (hasMedia) {
    rows.push(
      <DimRow
        key="m"
        total={s.w}
        segs={[
          { w: mx, label: `${round(mx)}` },
          { w: mw, label: `分享图 ${round(mw)}`, strong: true },
          { w: s.w - mx - mw, label: `${round(s.w - mx - mw)}` },
        ]}
      />,
    );
  }
  rows.push(
    <DimRow
      key="p"
      total={s.w}
      segs={[
        { w: panel.x, label: `${round(panel.x)}` },
        { w: panel.w, label: `面板 ${round(panel.w)}`, strong: true },
        { w: s.w - panel.x - panel.w, label: `${round(s.w - panel.x - panel.w)}` },
      ]}
    />,
  );
  return <div className="dims">{rows}</div>;
}

/* ------------------------------------------------------------------ frame */

export const FRAME_PAD = { iphone: 14, duo: 14, custom: 10 } as const;

export function DeviceFrame({
  s,
  posture,
  children,
  onResize,
  scale,
}: {
  s: ScreenSpec;
  posture?: string;
  children: ReactNode;
  onResize?: (w: number, h: number) => void;
  scale: number;
}) {
  const pad = FRAME_PAD[s.kind];
  const drag = useRef<{ x: number; y: number; w: number; h: number; mode: string } | null>(null);

  const start = (mode: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, w: s.w, h: s.h, mode };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !onResize) return;
    const dx = (e.clientX - d.x) / scale;
    const dy = (e.clientY - d.y) / scale;
    // the frame is centred in the stage, so a handle drag grows both sides: 2× delta
    onResize(d.mode.includes("x") ? d.w + dx * 2 : d.w, d.mode.includes("y") ? d.h + dy * 2 : d.h);
  };
  const end = () => (drag.current = null);

  return (
    <div
      className={`frame kind-${s.kind} ${posture ? `posture-${posture}` : ""}`}
      style={{
        width: s.w + pad * 2,
        height: s.h + pad * 2,
        padding: pad,
        borderRadius: s.radius + pad,
      }}
    >
      <span className="btn btn-a" />
      <span className="btn btn-b" />
      <span className="btn btn-c" />
      {s.kind === "duo" && <span className="hinge" />}
      <div className="screen" style={{ width: s.w, height: s.h, borderRadius: s.radius }}>
        {children}
      </div>
      {onResize && (
        <>
          <span className="rz rz-x" onPointerDown={start("x")} onPointerMove={move} onPointerUp={end} title="拖拽调整宽度" />
          <span className="rz rz-y" onPointerDown={start("y")} onPointerMove={move} onPointerUp={end} title="拖拽调整高度" />
          <span className="rz rz-xy" onPointerDown={start("xy")} onPointerMove={move} onPointerUp={end} title="拖拽调整尺寸" />
        </>
      )}
    </div>
  );
}
