import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_CONFIG, type BookSide, type Config, type ImageState } from "./lib/types";
import { getItemRule, getScreen, getShareLayout } from "./lib/spec";
import { useSize } from "./lib/hooks";
import { getRows, isAction, LABELS, type TargetId } from "./data/channels";
import { t } from "./data/i18n";
import { Controls } from "./components/Controls";
import { DeviceFrame, frameSize, ScreenChrome } from "./components/Device";
import { Share } from "./components/Share";
import { Icon } from "./components/Icon";
import { TripPage, type PageInsets } from "./scenes/Pages";

const SHARE_KEYS: (keyof Config)[] = [
  "hasMedia",
  "mediaType",
  "ratio",
  "hasIndicator",
  "imageState",
  "layout",
  "overflow",
  "hasPromotion",
  "hasPreview",
  "hasPermission",
  "hasContacts",
  "hasExtension",
  "disabledDemo",
  "region",
  "lang",
];

export default function App() {
  const [cfg, setCfg] = useState<Config>(DEFAULT_CONFIG);
  const [open, setOpen] = useState(true);
  const [preparing, setPreparing] = useState<null | "page" | "image">(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [fromPanel, setFromPanel] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [side, setSide] = useState<BookSide>("left");
  const [mediaW, setMediaW] = useState<number | undefined>(undefined);
  const timers = useRef<number[]>([]);
  const panelLayout = useRef<Config["layout"]>(DEFAULT_CONFIG.layout);
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach((x) => clearTimeout(x));
    timers.current = [];
  };

  const set = useCallback(
    <K extends keyof Config>(k: K, v: Config[K]) => {
      setCfg((p) => ({ ...p, [k]: v }));
      if (k === "hasMedia") setFromPanel(false);
      if (SHARE_KEYS.includes(k) && !open && !preparing) setOpen(true);
    },
    [open, preparing],
  );

  const showToast = (text: string) => {
    const id = Date.now();
    setToast({ id, text });
    window.setTimeout(() => setToast((x) => (x?.id === id ? null : x)), 1600);
  };

  const openShare = (from: BookSide) => {
    clearTimers();
    setSide(from);
    if (cfgRef.current.device === "duo" && cfgRef.current.posture === "D") setCfg((p) => ({ ...p, bookSide: from }));
    const c = cfgRef.current;
    if (!c.flowLoading) {
      setOpen(true);
      return;
    }
    setPreparing("page");
    later(() => {
      setPreparing(null);
      setOpen(true);
      if (c.hasMedia) {
        setMediaLoading(true);
        later(() => setMediaLoading(false), c.loadingMs);
      }
    }, c.loadingMs);
  };

  const close = () => {
    clearTimers();
    setOpen(false);
    setPreparing(null);
    setMediaLoading(false);
    setFromPanel(false);
  };

  const play = () => {
    close();
    later(() => setPulse(true), 450);
    later(() => {
      setPulse(false);
      openShare(cfgRef.current.device === "duo" && cfgRef.current.posture === "D" ? cfgRef.current.bookSide : "left");
    }, 1250);
  };

  const onTarget = (id: TargetId) => {
    const c = cfgRef.current;
    const label = LABELS[id][c.lang];
    if (id === "shareImage") {
      clearTimers();
      panelLayout.current = c.layout;
      setOpen(false);
      if (c.flowLoading) {
        setPreparing("image");
        later(() => {
          // Behavior · 分享为图片：面板只保留一行渠道
          setCfg((p) => ({ ...p, hasMedia: true, layout: "singleRow" }));
          setFromPanel(true);
          setPreparing(null);
          setOpen(true);
        }, c.loadingMs);
      } else {
        setCfg((p) => ({ ...p, hasMedia: true, layout: "singleRow" }));
        setFromPanel(true);
        setOpen(true);
      }
      return;
    }
    if (id === "copyLink") return showToast(t("linkCopied", c.lang));
    if (id === "save") return showToast(t("saved", c.lang));
    if (id === "more") return showToast(t("moreOptions", c.lang));
    showToast(t("opening", c.lang, isAction(id) ? label : label));
  };

  const cancelPreparing = () => {
    const kind = preparing;
    clearTimers();
    setPreparing(null);
    if (kind === "image") {
      setFromPanel(false);
      setOpen(true);
    }
  };

  const onRetry = () => {
    setCfg((p) => ({ ...p, imageState: "loading" }));
    later(() => setCfg((p) => ({ ...p, imageState: "ready" })), cfgRef.current.loadingMs);
  };

  useEffect(() => () => clearTimers(), []);

  /* ---------------------------------------------------------------- derived layout */

  const screen = getScreen(cfg);
  const layout = getShareLayout(screen, cfg.bookSide);
  const rows = getRows(cfg.scenario, cfg.region, cfg.layout, cfg.hasMedia).rows;
  const firstRowCount = cfg.overflow === "fixed" ? Math.min(5, rows[0].length) : rows[0].length;
  const rule = getItemRule(layout.panel.w, cfg.overflow, firstRowCount);
  const imageState: ImageState = cfg.imageState !== "ready" ? cfg.imageState : mediaLoading ? "loading" : "ready";

  const insets: PageInsets = useMemo(() => {
    if (screen.kind === "iphone") return { top: screen.statusBar, right: 0, reservedRight: 0, bottom: 34 };
    if (screen.kind === "duo")
      return {
        top: 24,
        right: screen.verticalBar ? screen.verticalBar.width : 0,
        reservedRight: screen.reserved ? screen.reserved.w : 0,
        bottom: 34,
      };
    return { top: screen.statusBar, right: 0, reservedRight: 0, bottom: screen.homeIndicator };
  }, [screen.kind, screen.statusBar, screen.verticalBar, screen.reserved, screen.homeIndicator]);

  const contentW = screen.w - insets.right;
  const split = screen.fold
    ? { left: screen.fold.x, gap: screen.fold.w }
    : contentW >= 760
      ? { left: screen.crease === "vertical" ? Math.round(screen.w / 2) : Math.round(contentW * 0.46), gap: 0 }
      : undefined;
  const triggerCenter = split
    ? side === "left"
      ? split.left / 2
      : split.left + split.gap + (contentW - split.left - split.gap) / 2
    : contentW / 2;

  const statusLight = open || !!preparing || (cfg.scenario === "hotel" && !split);

  /* ---------------------------------------------------------------- stage scale */

  const [stageRef, stage] = useSize<HTMLDivElement>();
  const posture = cfg.device === "duo" ? cfg.posture : undefined;
  const { w: frameW, h: frameH } = frameSize(screen, posture);
  const outerH = frameH;
  const fit = Math.min(1, (stage.w - 64) / frameW, (stage.h - 48) / outerH);
  const scale = cfg.zoom === "100" ? 1 : Math.max(0.2, fit || 1);

  const onResize = (w: number, h: number) => {
    setCfg((p) => ({ ...p, customW: Math.round(Math.min(1366, Math.max(320, w))), customH: Math.round(Math.min(1366, Math.max(480, h))) }));
  };

  return (
    <div className="app">
      <Controls
        cfg={cfg}
        set={set}
        screen={screen}
        layout={layout}
        rule={rule}
        mediaW={mediaW}
        open={open}
        onPlay={play}
        onOpen={() => (open || preparing ? close() : openShare(cfg.device === "duo" && cfg.posture === "D" ? cfg.bookSide : "left"))}
      />
      <main className="stage">
        <div className="stage-bar">
          <div>
            <b>{screen.name}</b>
            <span>{screen.sub}</span>
          </div>
          <div className="stage-tools">
            <button type="button" className={cfg.zoom === "fit" ? "on" : ""} onClick={() => set("zoom", "fit")}>
              适应
            </button>
            <button type="button" className={cfg.zoom === "100" ? "on" : ""} onClick={() => set("zoom", "100")}>
              100%
            </button>
          </div>
        </div>
        <div ref={stageRef} className={`stage-canvas ${cfg.zoom === "100" ? "is-scroll" : ""}`}>
          <div className="stage-sizer" style={{ width: frameW * scale, height: outerH * scale }}>
          <div className="stage-scaler" style={{ transform: `scale(${scale})`, width: frameW, height: outerH }}>
            <DeviceFrame
              s={screen}
              posture={posture}
              scale={scale}
              onResize={cfg.device === "custom" ? onResize : undefined}
            >
              <div className="app-window" style={{ right: insets.right }}>
                <TripPage scenario={cfg.scenario} insets={insets} split={split} pulse={pulse} onShare={openShare} />
              </div>
              <Share
                screen={screen}
                layout={layout}
                cfg={cfg}
                open={open}
                imageState={imageState}
                showBack={fromPanel}
                onClose={close}
                onBack={() => {
                  setCfg((p) => ({ ...p, hasMedia: false, layout: panelLayout.current }));
                  setFromPanel(false);
                }}
                onTarget={onTarget}
                onContact={(n) => showToast(t("opening", cfg.lang, n))}
                onRetry={onRetry}
                onMediaW={setMediaW}
              />
              <div className={`prep ${preparing ? "is-on" : ""}`}>
                <div className="prep-card" style={{ left: triggerCenter }}>
                  <div className="prep-box">
                    <button type="button" className="prep-x" onClick={cancelPreparing} aria-label="Cancel">
                      <Icon name="close" size={12} color="#8592a6" />
                    </button>
                    <span className="trip-loader" />
                  </div>
                  <span className="prep-text">{preparing === "image" ? t("preparing", cfg.lang) : t("loading", cfg.lang)}</span>
                </div>
              </div>
              {toast && (
                <div key={toast.id} className="toast" style={{ left: layout.region.x + layout.region.w / 2 }}>
                  {toast.text}
                </div>
              )}
              <ScreenChrome s={screen} light={statusLight} posture={posture} />
            </DeviceFrame>
          </div>
          </div>
        </div>
      </main>
    </div>
  );
}
