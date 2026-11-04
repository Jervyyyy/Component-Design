import { useEffect, useRef, useState } from "react";
import type { Config, ImageState, Lang } from "../lib/types";
import { RATIO_VALUE } from "../lib/types";
import type { ScreenSpec, ShareLayout } from "../lib/spec";
import { getItemRule } from "../lib/spec";
import { useDragScroll, useSize } from "../lib/hooks";
import { getRows, isAction, LABELS, type ActionId, type TargetId } from "../data/channels";
import { SCENARIOS } from "../data/scenarios";
import { t } from "../data/i18n";
import { Icon, type IconName } from "./Icon";
import { ShareLogo } from "./ShareLogo";
import { LongImage, Poster, posterBase } from "../scenes/Artworks";
import avatar from "../assets/img/avatar-giangian.png";
import mapImg from "../assets/img/itinerary-map.jpg";
import nyc from "../assets/img/new-york.jpg";
import room from "../assets/img/hotel-room.jpg";

const ACTION_ICON: Record<ActionId, IconName> = {
  save: "download",
  shareImage: "image",
  copyLink: "link",
  editFriends: "userAdd",
  message: "message",
  email: "email",
  more: "more",
};

/* ================================================================ Share.Item */

function ShareItem({
  id,
  lang,
  width,
  disabled,
  onClick,
}: {
  id: TargetId;
  lang: Lang;
  width?: number;
  disabled?: boolean;
  onClick: (id: TargetId) => void;
}) {
  const action = isAction(id);
  return (
    <button
      type="button"
      className={`item ${action ? "is-action" : "is-channel"} ${disabled ? "is-disabled" : ""}`}
      style={width ? { width, flex: "none" } : undefined}
      onClick={() => !disabled && onClick(id)}
      aria-disabled={disabled}
      title={LABELS[id][lang]}
    >
      <span className="item-icon">
        {action ? (
          <Icon name={ACTION_ICON[id as ActionId]} size={28} color={disabled ? "var(--text-disable)" : "var(--text-primary)"} />
        ) : (
          <ShareLogo platform={id as Exclude<TargetId, ActionId>} />
        )}
      </span>
      <span className="item-label">{LABELS[id][lang]}</span>
    </button>
  );
}

function Row({
  ids,
  lang,
  panelW,
  count,
  overflow,
  disabledIds,
  onClick,
}: {
  ids: TargetId[];
  lang: Lang;
  panelW: number;
  /** longest row: every row follows the same rule so the columns line up */
  count: number;
  overflow: Config["overflow"];
  disabledIds?: TargetId[];
  onClick: (id: TargetId) => void;
}) {
  const ref = useDragScroll<HTMLDivElement>("x");
  let list = ids;
  if (overflow === "fixed" && ids.length > 5) {
    // fixed: max 5 per row — extra channels are removed from the slot (never hidden with opacity)
    list = ids.includes("more") ? [...ids.filter((i) => i !== "more").slice(0, 4), "more"] : ids.slice(0, 5);
  }
  const rule = getItemRule(panelW, overflow, overflow === "fixed" ? list.length : count);
  // spread rows share one item width (from the longest row) so the columns of both rows line up
  const mode = overflow === "fixed" ? "fixed" : rule.mode === "spread" ? "spread" : "scroll";
  return (
    <div ref={ref} className={`row is-${mode}`}>
      {list.map((id) => (
        <ShareItem
          key={id}
          id={id}
          lang={lang}
          width={mode === "fixed" ? undefined : rule.itemW}
          disabled={!!disabledIds?.includes(id)}
          onClick={onClick}
        />
      ))}
    </div>
  );
}

/* ================================================================ Panel modules */

function Promotion({ lang }: { lang: Lang }) {
  return (
    <div className="mod mod-promo">
      <span className="coin">T</span>
      <p>{t("promo", lang)}</p>
      <span className="chev">›</span>
    </div>
  );
}

function Preview({ cfg }: { cfg: Config }) {
  const thumb = cfg.scenario === "flight" ? nyc : cfg.scenario === "hotel" ? room : mapImg;
  const title =
    cfg.scenario === "flight"
      ? "Amsterdam → New York · From $515"
      : cfg.scenario === "hotel"
        ? "Cozrum Homes - Charming Corner 2"
        : "London & Edinburgh 7-Day Tour";
  const desc =
    cfg.scenario === "flight"
      ? "Fri, Sep 19 · China Eastern MU1580"
      : cfg.scenario === "hotel"
        ? "4.1/5 Very Good · Ho Chi Minh City"
        : "Jul 30 – Aug 5 · 2 cities · 17 places";
  return (
    <div className="mod mod-preview">
      <img src={thumb} alt="" />
      <div>
        <b>{title}</b>
        <span>{desc}</span>
      </div>
    </div>
  );
}

function Permission({ lang }: { lang: Lang }) {
  const [v, setV] = useState(0);
  return (
    <div className="mod mod-seg" role="tablist">
      <span className="seg-thumb" style={{ transform: `translateX(${v * 100}%)` }} />
      {[t("canView", lang), t("canEdit", lang)].map((x, i) => (
        <button key={x} type="button" className={v === i ? "on" : ""} onClick={() => setV(i)}>
          {x}
        </button>
      ))}
    </div>
  );
}

const FRIENDS = [
  { n: "GianGian", img: avatar },
  { n: "Mia Chen", c: "#ff7d45" },
  { n: "Leo Wang", c: "#3264ff" },
  { n: "Yuki", c: "#00b87a" },
  { n: "Sam Lee", c: "#8b5cf6" },
  { n: "Ana", c: "#f5a623" },
];

function Contacts({ lang, onClick }: { lang: Lang; onClick: (n: string) => void }) {
  const ref = useDragScroll<HTMLDivElement>("x");
  return (
    <div className="mod-contacts">
      <div className="mod-caption">{t("sendToFriends", lang)}</div>
      <div ref={ref} className="row is-scroll">
        {FRIENDS.map((f) => (
          <button key={f.n} type="button" className="item is-contact" style={{ width: 72, flex: "none" }} onClick={() => onClick(f.n)}>
            <span className="item-icon">
              {f.img ? (
                <img src={f.img} alt="" className="avatar" />
              ) : (
                <span className="avatar" style={{ background: f.c }}>
                  {f.n[0]}
                </span>
              )}
            </span>
            <span className="item-label">{f.n}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Extension({ lang }: { lang: Lang }) {
  const [on, setOn] = useState(true);
  return (
    <div className="mod mod-ext">
      <div>
        <b>{t("hidePrice", lang)}</b>
        <span>{t("hidePriceSub", lang)}</span>
      </div>
      <button type="button" className={`switch ${on ? "on" : ""}`} onClick={() => setOn(!on)} aria-pressed={on}>
        <i />
      </button>
    </div>
  );
}

/* ================================================================ .Share.Media */

function MediaStatus({ state, lang, onRetry }: { state: ImageState; lang: Lang; onRetry: () => void }) {
  if (state === "loading") {
    return (
      <div className="media-status">
        <span className="petals" aria-hidden>
          {Array.from({ length: 8 }).map((_, i) => (
            <i key={i} style={{ transform: `rotate(${i * 45}deg)`, animationDelay: `${(i - 8) * 0.1}s` }} />
          ))}
        </span>
        <span>{t("loading", lang)}</span>
      </div>
    );
  }
  return (
    <button type="button" className="media-status is-error" onClick={onRetry} title={t("retry", lang)}>
      <Icon name="imageFailed" size={24} color="rgba(255,255,255,0.64)" />
    </button>
  );
}

function ScrollMedia({ cfg, layout, lang }: { cfg: Config; layout: ShareLayout; lang: Lang }) {
  const ref = useDragScroll<HTMLDivElement>("y");
  const content = useRef<HTMLDivElement | null>(null);
  const progress = useRef(0);
  const lastResize = useRef(0);
  const [scrolled, setScrolled] = useState(false);
  // Large windows: when the whole long image fits above the sheet, centre it and drop the scroll hint.
  const [fits, setFits] = useState(false);
  useEffect(() => {
    setScrolled(false);
    progress.current = 0;
  }, [cfg.scenario]);
  // Posture switch: keep the preview's scroll position (relative), only relayout — never regenerate.
  useEffect(() => {
    const el = ref.current;
    const c = content.current;
    if (!el || !c) return;
    const ro = new ResizeObserver(() => {
      lastResize.current = performance.now();
      const img = c.firstElementChild as HTMLElement | null;
      // visible height = viewport minus the 20 tucked under the sheet; keep 16 clear above the sheet
      setFits(!!img && img.offsetHeight + 16 + 20 <= el.clientHeight);
      el.scrollTop = progress.current * Math.max(0, el.scrollHeight - el.clientHeight);
    });
    ro.observe(c);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return (
    <div
      className={`media-scroll ${fits ? "is-fit" : ""}`}
      style={{ left: layout.media.x - layout.region.x, width: layout.media.w }}
    >
      <div
        ref={ref}
        className="media-scroll-inner"
        onScroll={(e) => {
          const el = e.currentTarget;
          setScrolled(el.scrollTop > 6);
          // ignore scroll events caused by relayout (width animating between postures)
          if (performance.now() - lastResize.current < 600) return;
          progress.current = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
        }}
      >
        <div ref={content} className="media-scroll-content">
          <LongImage scenario={cfg.scenario} />
        </div>
      </div>
      <div className={`media-fade ${scrolled || fits ? "is-hidden" : ""}`}>
        <span>{t("scrollHint", lang)}</span>
      </div>
    </div>
  );
}

type Report = { onMediaW?: (w: number) => void };

function FitMedia({ cfg, layout, area, onMediaW }: { cfg: Config; layout: ShareLayout; area: { w: number; h: number } } & Report) {
  const r = RATIO_VALUE[cfg.ratio];
  const maxW = layout.media.w;
  const bw = Math.max(0, Math.min(maxW, area.h * r));
  useEffect(() => onMediaW?.(bw), [bw, onMediaW]);
  const bh = bw / r;
  const base = posterBase(r);
  const scale = bw / base.baseW;
  const cx = layout.media.x - layout.region.x + layout.media.w / 2;
  return (
    <div className="media-fit" style={{ width: bw, height: bh, left: cx - bw / 2, top: (area.h - bh) / 2 }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }}>
        <Poster scenario={cfg.scenario} v={0} ratio={r} />
      </div>
    </div>
  );
}

function CarouselMedia({ cfg, layout, area, onMediaW }: { cfg: Config; layout: ShareLayout; area: { w: number; h: number } } & Report) {
  const r = RATIO_VALUE[cfg.ratio];
  const dots = cfg.hasIndicator ? 22 : 0;
  const ch = Math.max(0, Math.min(area.h - dots, layout.media.carouselMaxW / r));
  const cw = ch * r;
  useEffect(() => onMediaW?.(cw), [cw, onMediaW]);
  const base = posterBase(r);
  const scale = cw / base.baseW;
  const [active, setActive] = useState(0);
  const snap = (el: HTMLDivElement) => {
    const i = Math.round(el.scrollLeft / (cw + 12));
    el.scrollTo({ left: i * (cw + 12), behavior: "smooth" });
  };
  const ref = useDragScroll<HTMLDivElement>("x", { onEnd: snap });
  const go = (i: number) => ref.current?.scrollTo({ left: i * (cw + 12), behavior: "smooth" });
  // keep the current card centred when the window size changes (posture switch keeps the step)
  const activeRef = useRef(0);
  activeRef.current = active;
  useEffect(() => {
    ref.current?.scrollTo({ left: activeRef.current * (cw + 12) });
  }, [cw, ref]);
  const pad = (area.w - cw) / 2;
  return (
    <div className="media-carousel" style={{ height: ch + dots, top: (area.h - ch - dots) / 2 }}>
      <div
        ref={ref}
        className="carousel-track"
        style={{ paddingLeft: pad, paddingRight: pad, height: ch }}
        onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / (cw + 12)))}
      >
        {[0, 1, 2].map((v) => (
          <div key={v} className={`carousel-card ${active === v ? "is-active" : ""}`} style={{ width: cw, height: ch }} onClick={() => go(v)}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }}>
              <Poster scenario={cfg.scenario} v={v} ratio={r} />
            </div>
          </div>
        ))}
      </div>
      {cfg.hasIndicator && (
        <div className="dots">
          {[0, 1, 2].map((i) => (
            <button key={i} type="button" className={i === active ? "on" : ""} onClick={() => go(i)} aria-label={`Poster ${i + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function Media({
  cfg,
  layout,
  imageState,
  lang,
  onRetry,
  onMediaW,
}: {
  cfg: Config;
  layout: ShareLayout;
  imageState: ImageState;
  lang: Lang;
  onRetry: () => void;
} & Report) {
  const [ref, area] = useSize<HTMLDivElement>();
  const scrollLike = imageState !== "ready" || cfg.mediaType === "scroll";
  useEffect(() => {
    if (scrollLike) onMediaW?.(layout.media.w);
  }, [scrollLike, layout.media.w, onMediaW]);
  return (
    <div className="media" data-type={cfg.mediaType}>
      <div ref={ref} className="media-area">
        {imageState !== "ready" ? (
          <div className="media-statuswrap" style={{ left: layout.media.x - layout.region.x, width: layout.media.w }}>
            <MediaStatus state={imageState} lang={lang} onRetry={onRetry} />
          </div>
        ) : cfg.mediaType === "scroll" ? (
          <ScrollMedia cfg={cfg} layout={layout} lang={lang} />
        ) : area.h > 0 && cfg.mediaType === "fit" ? (
          <FitMedia cfg={cfg} layout={layout} area={area} onMediaW={onMediaW} />
        ) : area.h > 0 ? (
          <CarouselMedia cfg={cfg} layout={layout} area={area} onMediaW={onMediaW} />
        ) : null}
      </div>
    </div>
  );
}

/* ================================================================ Share */

export interface ShareProps {
  screen: ScreenSpec;
  layout: ShareLayout;
  cfg: Config;
  open: boolean;
  imageState: ImageState;
  showBack: boolean;
  onClose: () => void;
  onBack: () => void;
  onTarget: (id: TargetId) => void;
  onContact: (name: string) => void;
  onRetry: () => void;
  onMediaW?: (w: number) => void;
  handoff?: boolean;
}

export function Share({ screen, layout, cfg, open, imageState, showBack, onClose, onBack, onTarget, onContact, onRetry, onMediaW, handoff }: ShareProps) {
  const lang = cfg.lang;
  const { rows } = getRows(cfg.scenario, cfg.region, cfg.layout, cfg.hasMedia);
  const firstChannelIdx = rows[0].findIndex((id) => !isAction(id));
  // disabled demo: one channel and one action (action bar too), never "Share as image" / "More" so the flows stay usable
  const allIds = rows.flat();
  const actionIds = allIds.filter((id) => isAction(id) && id !== "shareImage" && id !== "more");
  const disabledAction = actionIds.includes("editFriends") ? "editFriends" : actionIds[Math.min(1, actionIds.length - 1)];
  const disabledIds: TargetId[] = cfg.disabledDemo
    ? [rows[0][Math.min(rows[0].length - 2, firstChannelIdx + 2)], ...(disabledAction ? [disabledAction] : [])]
    : [];
  const title = SCENARIOS[cfg.scenario].shareTitle[lang];
  const { panel, region } = layout;

  return (
    <div className={`share ${open ? "is-open" : ""} ${cfg.hasMedia ? "has-media" : ""} ${handoff ? "is-handoff" : ""}`} aria-hidden={!open}>
      <div className="share-scrim" onClick={cfg.hasMedia ? undefined : onClose} />
      <div className="share-col" style={{ left: region.x, width: region.w }}>
        {cfg.hasMedia && (
          <div className="share-nav" style={{ height: screen.navBar }}>
            <div
              className="share-navrow"
              style={{ top: screen.kind === "duo" ? 20 : screen.navBar - 44, paddingLeft: layout.navPadLeft }}
            >
              <button type="button" className="navbtn" onClick={showBack ? onBack : onClose} aria-label={showBack ? "Back" : "Close"}>
                <Icon name={showBack ? "arrowLeft" : "close"} size={24} color="#fff" />
              </button>
              <span className="navtitle">{showBack ? t("shareVia", lang) : t("shareAsImage", lang)}</span>
            </div>
          </div>
        )}
        {cfg.hasMedia ? (
          <Media cfg={cfg} layout={layout} imageState={imageState} lang={lang} onRetry={onRetry} onMediaW={onMediaW} />
        ) : (
          <div className="share-spacer" onClick={onClose} />
        )}
        <div className="surface-wrap" style={{ marginLeft: panel.x - region.x, width: panel.w }}>
          <div
            className={`surface ${panel.floating ? "is-floating" : ""}`}
            style={{
              borderRadius: `20px 20px ${panel.bottomRadius}px ${panel.bottomRadius}px`,
              paddingBottom: screen.homeIndicator,
              paddingTop: cfg.hasMedia ? 24 : 0,
            }}
          >
            {!cfg.hasMedia && (
              <div className="head">
                <button type="button" className="head-close" onClick={onClose} aria-label="Close">
                  <Icon name="close" size={24} color="var(--text-primary)" />
                </button>
                <span className="head-title">{title}</span>
              </div>
            )}
            <div className="panel">
              {cfg.hasPromotion && <Promotion lang={lang} />}
              {cfg.hasPreview && <Preview cfg={cfg} />}
              {cfg.hasPermission && <Permission lang={lang} />}
              {cfg.hasContacts && <Contacts lang={lang} onClick={onContact} />}
              {rows.map((ids, i) => (
                <Row
                  key={`${cfg.layout}-${i}`}
                  ids={ids}
                  lang={lang}
                  panelW={panel.w}
                  count={Math.max(...rows.map((r) => r.length))}
                  overflow={cfg.overflow}
                  disabledIds={disabledIds}
                  onClick={onTarget}
                />
              ))}
              {cfg.hasExtension && <Extension lang={lang} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
