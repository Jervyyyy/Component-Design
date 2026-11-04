import type { ReactNode } from "react";
import type { BookSide, ScenarioId } from "../lib/types";
import { Icon } from "../components/Icon";
import { FLIGHT, HOTEL, ITINERARY } from "../data/scenarios";
import mapImg from "../assets/img/itinerary-map.jpg";
import avatar from "../assets/img/avatar-giangian.png";
import nyc from "../assets/img/new-york.jpg";
import room from "../assets/img/hotel-room.jpg";
import mu from "../assets/img/china-eastern.png";

export interface PageInsets {
  top: number;
  /** right inset of the app window (iPhone DUO vertical bar) */
  right: number;
  /** width of a top-right reserved region the header must avoid */
  reservedRight: number;
  bottom: number;
}

export interface PageProps {
  scenario: ScenarioId;
  insets: PageInsets;
  /** two-pane layout: left pane width and gap (fold) — undefined = single column */
  split?: { left: number; gap: number };
  pulse: boolean;
  onShare: (side: BookSide) => void;
}

function IconBtn({
  icon,
  onClick,
  dark = true,
  pulse = false,
  label,
}: {
  icon: "share" | "arrowLeft" | "close";
  onClick?: () => void;
  dark?: boolean;
  pulse?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`pg-iconbtn ${dark ? "is-dark" : "is-light"} ${pulse ? "is-pulse" : ""}`}
      onClick={onClick}
    >
      <Icon name={icon} size={icon === "share" ? 18 : 20} color={dark ? "#fff" : "#121826"} />
    </button>
  );
}

function Heart({ dark = true }: { dark?: boolean }) {
  return (
    <span className={`pg-iconbtn ${dark ? "is-dark" : "is-light"}`} aria-hidden>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.6 4.5 7.1 4.5c2 0 3.4 1 4.9 2.8 1.5-1.8 2.9-2.8 4.9-2.8 3.5 0 5.7 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z"
          stroke={dark ? "#fff" : "#121826"}
          strokeWidth="2"
        />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------ itinerary */

function ItineraryList({ withMap, insets, pulse, onShare }: { withMap: boolean; insets: PageInsets; pulse: boolean; onShare: () => void }) {
  return (
    <div className="pg-scroll">
      {withMap ? (
        <div className="pg-map" style={{ height: 176 + insets.top }}>
          <img src={mapImg} alt="" />
          <div className="pg-topbtns" style={{ top: insets.top + 10, right: 16 + insets.reservedRight }}>
            <IconBtn icon="arrowLeft" label="Back" />
            <span className="grow" />
            <IconBtn icon="share" label="Share" pulse={pulse} onClick={onShare} />
          </div>
        </div>
      ) : (
        <div className="pg-plainbar" style={{ paddingTop: insets.top + 10, paddingRight: 16 + insets.reservedRight }}>
          <IconBtn icon="arrowLeft" dark={false} label="Back" />
          <span className="grow" />
          <IconBtn icon="share" dark={false} label="Share" pulse={pulse} onClick={onShare} />
        </div>
      )}
      <div className="pg-it-head">
        <h1>
          {ITINERARY.title} <span className="pg-pen">✎</span>
        </h1>
        <div className="pg-it-dep">
          <span>▦ {ITINERARY.departure}</span>
          <span className="pg-avs">
            <img src={avatar} alt="" />
            <i>+</i>
          </span>
        </div>
      </div>
      <div className="pg-tabs">
        <span className="on">Itinerary</span>
        <span>Ideas</span>
        <span>Bookings</span>
      </div>
      <div className="pg-chips">
        <span className="ghost">Overview</span>
        <span>To be planned</span>
        <span>Jul 30</span>
        <span>Jul 31</span>
        <span>Aug 1</span>
      </div>
      <div className="pg-cards">
        <div className="pg-card">
          <b>To be planned</b>
        </div>
        {ITINERARY.days.slice(0, 5).map((d) => (
          <div className="pg-card" key={d.date}>
            <b>
              {d.date} · {d.title}
            </b>
            {(d.route.length > 0 || d.stay) && (
              <span className="pg-route">
                {[...d.route, d.stay].filter(Boolean).join("  →  ")}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="pg-ask" style={{ bottom: insets.bottom + 8 }}>
        <span>Ask anything about the trip</span>
        <i>+</i>
      </div>
    </div>
  );
}

function ItineraryPage({ insets, split, pulse, onShare }: PageProps) {
  if (!split) {
    return <ItineraryList withMap insets={insets} pulse={pulse} onShare={() => onShare("left")} />;
  }
  return (
    <div className="pg-split">
      <div className="pg-pane" style={{ width: split.left }}>
        <ItineraryList withMap={false} insets={insets} pulse={pulse} onShare={() => onShare("left")} />
      </div>
      <div className="pg-pane pg-mappane" style={{ marginLeft: split.gap }}>
        <img src={mapImg} alt="" />
        <div className="pg-topbtns" style={{ top: insets.top + 10, right: 16 + insets.reservedRight }}>
          <span className="grow" />
          <IconBtn icon="share" label="Share map" onClick={() => onShare("right")} />
        </div>
        <div className="pg-mapcard">
          <b>Day 1–4 · London</b>
          <span>Bloomsbury · British Museum · Tower Bridge · London Eye</span>
          <b>Day 4–7 · Edinburgh</b>
          <span>Old Town · Holyroodhouse · Arthur’s Seat · Calton Hill</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ flight */

const DATES = [
  { d: "Wed, Sep 17", p: "560" },
  { d: "Thu, Sep 18", p: "538" },
  { d: "Fri, Sep 19", p: "515", on: true },
  { d: "Sat, Sep 20", p: "529" },
  { d: "Sun, Sep 21", p: "577" },
];

function FlightList({ insets, pulse, onShare }: { insets: PageInsets; pulse: boolean; onShare: () => void }) {
  return (
    <div className="pg-scroll pg-gray">
      <div className="pg-fl-head" style={{ paddingTop: insets.top + 8, paddingRight: 12 + insets.reservedRight }}>
        <IconBtn icon="arrowLeft" dark={false} label="Back" />
        <div className="pg-fl-title">
          <b>
            {FLIGHT.dep.city} → {FLIGHT.arr.city}
          </b>
          <span>
            {FLIGHT.trip} · {FLIGHT.date} · 1 adult
          </span>
        </div>
        <IconBtn icon="share" dark={false} label="Share" pulse={pulse} onClick={onShare} />
      </div>
      <div className="pg-dates">
        {DATES.map((x) => (
          <span key={x.d} className={x.on ? "on" : ""}>
            {x.d.split(", ")[1]}
            <b>${x.p}</b>
          </span>
        ))}
      </div>
      <div className="pg-chips">
        <span>Nonstop</span>
        <span>Price ↑</span>
        <span>Departure time</span>
        <span>Airlines</span>
      </div>
      <div className="pg-cards">
        <div className="pg-card pg-fcard best">
          <span className="tag">Cheapest</span>
          <div className="pg-ft">
            <strong>{FLIGHT.dep.time}</strong>
            <i>{FLIGHT.duration}</i>
            <strong>{FLIGHT.arr.time}</strong>
            <b className="price">${FLIGHT.price}</b>
          </div>
          <div className="pg-fsub">
            <img src={mu} alt="" /> {FLIGHT.airline} {FLIGHT.flightNo} · {FLIGHT.dep.code}–{FLIGHT.arr.code}
          </div>
        </div>
        {[
          ["07:05", "09:20", "KLM KL641", "548", "8h 15m"],
          ["10:40", "12:45", "Delta Air Lines DL47", "573", "8h 05m"],
          ["13:25", "15:40", "United Airlines UA71", "592", "8h 15m"],
          ["18:30", "20:55", "Air France AF6731", "611", "8h 25m"],
        ].map(([a, b, c, p, d]) => (
          <div className="pg-card pg-fcard" key={c}>
            <div className="pg-ft">
              <strong>{a}</strong>
              <i>{d}</i>
              <strong>{b}</strong>
              <b className="price">${p}</b>
            </div>
            <div className="pg-fsub">{c} · AMS–JFK</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlightPage({ insets, split, pulse, onShare }: PageProps) {
  if (!split) return <FlightList insets={insets} pulse={pulse} onShare={() => onShare("left")} />;
  return (
    <div className="pg-split">
      <div className="pg-pane" style={{ width: split.left }}>
        <FlightList insets={insets} pulse={pulse} onShare={() => onShare("left")} />
      </div>
      <div className="pg-pane pg-photopane" style={{ marginLeft: split.gap }}>
        <img src={nyc} alt="" />
        <div className="pg-topbtns" style={{ top: insets.top + 10, right: 16 + insets.reservedRight }}>
          <span className="grow" />
          <IconBtn icon="share" label="Share" onClick={() => onShare("right")} />
        </div>
        <div className="pg-photocap">
          <b>{FLIGHT.posterTitle}</b>
          <span>
            {FLIGHT.date} · from ${FLIGHT.price} · {FLIGHT.noFee}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ hotel */

function HotelInfo({ insets, pulse, onShare, hero = true }: { insets: PageInsets; pulse: boolean; onShare: () => void; hero?: boolean }) {
  return (
    <div className="pg-scroll pg-gray">
      {hero ? (
        <div className="pg-hero" style={{ height: 230 + insets.top }}>
          <img src={room} alt="" />
          <div className="pg-topbtns" style={{ top: insets.top + 10, right: 16 + insets.reservedRight }}>
            <IconBtn icon="arrowLeft" label="Back" />
            <span className="grow" />
            <Heart />
            <IconBtn icon="share" label="Share" pulse={pulse} onClick={onShare} />
          </div>
          <span className="pg-count">1/58</span>
        </div>
      ) : (
        <div className="pg-plainbar" style={{ paddingTop: insets.top + 10, paddingRight: 16 + insets.reservedRight }}>
          <IconBtn icon="arrowLeft" dark={false} label="Back" />
          <span className="grow" />
          <Heart dark={false} />
          <IconBtn icon="share" dark={false} label="Share" pulse={pulse} onClick={onShare} />
        </div>
      )}
      <div className="pg-hcard">
        <h1>
          {HOTEL.name} <span className="pg-dia">◆◆◆</span>
        </h1>
        <div className="pg-score">
          <span className="sc">
            <b>{HOTEL.score}</b>/5
          </span>
          <b>{HOTEL.scoreText}</b> <span className="mut">{HOTEL.reviews} ›</span>
        </div>
        <div className="pg-addr">📍 {HOTEL.address}</div>
        <div className="pg-addr">🚆 {HOTEL.distance}</div>
        <div className="pg-amen">
          {HOTEL.amenities.map((a) => (
            <span key={a}>{a}</span>
          ))}
        </div>
      </div>
      <div className="pg-hcard pg-dates2">
        <div>
          <span className="mut">Check-in &amp; Check-out</span>
          <b>{HOTEL.dates}</b>
        </div>
        <span className="mut">{HOTEL.nights}</span>
      </div>
      <div className="pg-hcard">
        <b>{HOTEL.room}</b>
        <span className="mut">{HOTEL.roomMeta}</span>
        <span className="pg-free">✓ {HOTEL.cancel}</span>
      </div>
      <div className="pg-deal" style={{ paddingBottom: insets.bottom + 8 }}>
        <div>
          <span className="mut">Today's Deal</span>
          <div>
            <b className="price">${HOTEL.price}</b> <s>${HOTEL.was}</s> <em>{HOTEL.off}</em>
          </div>
        </div>
        <span className="pg-cta">Select Rooms</span>
      </div>
    </div>
  );
}

function HotelPage({ insets, split, pulse, onShare }: PageProps) {
  if (!split) return <HotelInfo insets={insets} pulse={pulse} onShare={() => onShare("left")} />;
  return (
    <div className="pg-split">
      <div className="pg-pane pg-photopane" style={{ width: split.left }}>
        <img src={room} alt="" />
        <div className="pg-topbtns" style={{ top: insets.top + 10, right: 16 }}>
          <IconBtn icon="arrowLeft" label="Back" />
          <span className="grow" />
          <Heart />
          <IconBtn icon="share" label="Share" pulse={pulse} onClick={() => onShare("left")} />
        </div>
        <div className="pg-photocap">
          <b>{HOTEL.name}</b>
          <span>
            {HOTEL.score}/5 {HOTEL.scoreText} · {HOTEL.reviews}
          </span>
        </div>
      </div>
      <div className="pg-pane" style={{ marginLeft: split.gap }}>
        <HotelInfo insets={insets} hero={false} pulse={false} onShare={() => onShare("right")} />
      </div>
    </div>
  );
}

export function TripPage(p: PageProps): ReactNode {
  if (p.scenario === "flight") return <FlightPage {...p} />;
  if (p.scenario === "hotel") return <HotelPage {...p} />;
  return <ItineraryPage {...p} />;
}
