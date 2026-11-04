import { useRef, type ReactNode } from "react";
import type { ScreenSpec } from "../lib/spec";
import duoOuter from "../assets/device/duo-outer.png";
import duoInner from "../assets/device/duo-inner-landscape.png";
import maskOuter from "../assets/device/mask-outer.png";
import maskInnerL from "../assets/device/mask-inner-landscape.png";
import maskInnerP from "../assets/device/mask-inner-portrait.png";
import duoCamera from "../assets/device/duo-camera.png";
import levelsGlyph from "../assets/device/levels-a.svg";

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

/**
 * iPhone DUO status UI, from the Figma "Pane controls" / "Reserved Region" components:
 * camera (Dynamic Island 36), "9:41" (SF Pro Rounded Bold 16, w48) and the round Levels glyph (46).
 */
function DuoLevels({ light }: { light: boolean }) {
  const url = `url("${levelsGlyph}")`;
  return (
    <span
      className="duo-levels"
      style={{ backgroundColor: light ? "#fff" : "#000", WebkitMaskImage: url, maskImage: url }}
    />
  );
}

/** Vertical Bar (A outer portrait, C/D inner landscape): pt 29.33, pl 12, pr 24, gap 14 */
function PaneControls({ light }: { light: boolean }) {
  return (
    <div className="pane">
      <div className="pane-status">
        <img className="duo-cam" src={duoCamera} alt="" width={36} height={36} />
        <div className="pane-sb">
          <span className="pane-pill" />
          <span className="duo-time" style={{ color: light ? "#fff" : "#000" }}>
            9:41
          </span>
          <DuoLevels light={light} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ chrome inside the screen */

export function ScreenChrome({ s, light, dim }: { s: ScreenSpec; light: boolean; posture?: string; dim?: boolean }) {
  return (
    <div className={`chrome ${dim ? "is-dim" : ""}`} aria-hidden>
      {s.kind !== "duo" && <StatusBar h={s.statusBar} light={light} />}
      {s.island && <div className="island" />}
      {s.notch && <div className="notch" />}
      {s.verticalBar && (
        <div className="vbar" style={{ width: s.verticalBar.width, height: s.h }}>
          <PaneControls light={light} />
        </div>
      )}
      {s.reserved && (
        <div
          className="reserved"
          style={{ left: s.reserved.x, top: s.reserved.y, width: s.reserved.w, height: s.reserved.h }}
        >
          <div className="reserved-sb">
            <span className="duo-time" style={{ color: light ? "#fff" : "#000" }}>
              9:41
            </span>
            <DuoLevels light={light} />
          </div>
        </div>
      )}
      {s.crease && <div className={`crease is-${s.crease}`} />}
      {s.fold && (
        <div className="fold" style={{ left: s.fold.x, width: s.fold.w }} />
      )}
      <div className="home-ind" />
    </div>
  );
}

/* ------------------------------------------------------------------ frame */

export const FRAME_PAD = { iphone: 14, custom: 10 } as const;

/**
 * iPhone DUO mockups exported from the Figma "Share 分享 · iPhone Duo 适配" frame
 * (outer 524.67 × 731.33 around a 466 × 678 screen; inner 1031 × 749 around 951 × 669).
 * The screen is clipped with a mask traced from the mockup's own screen cut-out.
 */
const DUO_MOCK = {
  A: { img: duoOuter, w: 524.67, h: 731.33, x: 29, y: 27, mask: maskOuter, rotate: false },
  B: { img: duoInner, w: 749, h: 1031, x: 40, y: 40, mask: maskInnerP, rotate: true },
  C: { img: duoInner, w: 1031, h: 749, x: 40, y: 40, mask: maskInnerL, rotate: false },
  D: { img: duoInner, w: 1031, h: 749, x: 40, y: 40, mask: maskInnerL, rotate: false },
} as const;

export function frameSize(s: ScreenSpec, posture?: string) {
  if (s.kind === "duo" && posture) {
    const m = DUO_MOCK[posture as keyof typeof DUO_MOCK];
    return { w: m.w, h: m.h };
  }
  const pad = FRAME_PAD[s.kind as "iphone" | "custom"];
  return { w: s.w + pad * 2, h: s.h + pad * 2 };
}

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

  if (s.kind === "duo" && posture) {
    const m = DUO_MOCK[posture as keyof typeof DUO_MOCK];
    const mask = `url("${m.mask}")`;
    return (
      <div className={`frame-mock posture-${posture}`} style={{ width: m.w, height: m.h }}>
        <div
          className="screen"
          style={{
            position: "absolute",
            left: m.x,
            top: m.y,
            width: s.w,
            height: s.h,
            WebkitMaskImage: mask,
            maskImage: mask,
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
          }}
        >
          {children}
        </div>
        <img
          className="mock-img"
          src={m.img}
          alt=""
          draggable={false}
          style={
            m.rotate
              ? { width: m.h, height: m.w, left: (m.w - m.h) / 2, top: (m.h - m.w) / 2, transform: "rotate(90deg)" }
              : { width: m.w, height: m.h, left: 0, top: 0 }
          }
        />
      </div>
    );
  }

  const pad = FRAME_PAD[s.kind as "iphone" | "custom"];
  return (
    <div
      className={`frame kind-${s.kind}`}
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
