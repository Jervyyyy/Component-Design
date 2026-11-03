import type { ReactNode } from "react";
import type { ScenarioId } from "../lib/types";
import { FLIGHT, HOTEL, ITINERARY } from "../data/scenarios";
import mapImg from "../assets/img/itinerary-map.jpg";
import avatar from "../assets/img/avatar-giangian.png";
import nyc from "../assets/img/new-york.jpg";
import room from "../assets/img/hotel-room.jpg";
import tripLogo from "../assets/img/trip-logo.png";
import qrItin from "../assets/img/qr-itinerary.svg";
import qrFlight from "../assets/img/qr-flight.png";
import mu from "../assets/img/china-eastern.png";

/* ---------------------------------------------------------------- shared bits */

function Qr({ src, size = 40 }: { src: string; size?: number }) {
  return <img className="art-qr" src={src} width={size} height={size} alt="" />;
}

function TripMark({ h = 14, light = false }: { h?: number; light?: boolean }) {
  return (
    <img
      src={tripLogo}
      alt="Trip.com"
      height={h}
      style={{ height: h, width: "auto", filter: light ? "brightness(0) invert(1)" : undefined }}
    />
  );
}

function Stars({ n = 3 }: { n?: number }) {
  return (
    <span className="art-stars" aria-hidden>
      {Array.from({ length: n }).map((_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}

function Score({ dark = false }: { dark?: boolean }) {
  return (
    <span className={`art-score ${dark ? "is-dark" : ""}`}>
      <b>{HOTEL.score}</b>
      <span>/5</span>
    </span>
  );
}

/* ---------------------------------------------------------------- long images (type=scroll) */

function ItineraryLong() {
  return (
    <div className="long">
      <div className="long-map">
        <img src={mapImg} alt="" />
      </div>
      <div className="long-body">
        <div className="long-author">
          <img src={avatar} alt="" />
          {ITINERARY.author}
        </div>
        <h3 className="long-title">{ITINERARY.title}</h3>
        <div className="long-meta">{ITINERARY.meta}</div>
        <ul className="long-days">
          {ITINERARY.days.map((d) => (
            <li key={d.date}>
              <div className="long-day">
                {d.date} · {d.title}
              </div>
              {(d.route.length > 0 || d.stay) && (
                <div className="long-route">
                  {d.route.map((r, i) => (
                    <span key={r}>
                      {i > 0 && <em>→</em>}
                      {r}
                    </span>
                  ))}
                  {d.stay && (
                    <span>
                      {d.route.length > 0 && <em>→</em>}
                      <i className="hotel-dot" />
                      {d.stay}
                    </span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="long-qr">
        <Qr src={qrItin} size={56} />
        <div>
          <b>{ITINERARY.qrTitle}</b>
          <span>{ITINERARY.qrSub}</span>
        </div>
      </div>
    </div>
  );
}

const MORE_FLIGHTS = [
  { dep: "07:05", arr: "09:20", al: "KLM", no: "KL641", d: "8h 15m", p: "548" },
  { dep: "10:40", arr: "12:45", al: "Delta Air Lines", no: "DL47", d: "8h 05m", p: "573" },
  { dep: "13:25", arr: "15:40", al: "United Airlines", no: "UA71", d: "8h 15m", p: "592" },
  { dep: "18:30", arr: "20:55", al: "Air France", no: "AF6731", d: "8h 25m", p: "611" },
];

function FlightCardBody({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`fc ${compact ? "is-compact" : ""}`}>
      <div className="fc-head">
        <b>{FLIGHT.trip}</b> · {FLIGHT.date} · {FLIGHT.duration}
      </div>
      <div className="fc-times">
        <div>
          <strong>{FLIGHT.dep.time}</strong>
          <span>
            {FLIGHT.dep.city}({FLIGHT.dep.code})
          </span>
        </div>
        <i className="fc-line" />
        <div className="r">
          <strong>{FLIGHT.arr.time}</strong>
          <span>
            {FLIGHT.arr.city}({FLIGHT.arr.code})
          </span>
        </div>
      </div>
      <div className="fc-airline">
        <img src={mu} alt="" />
        {FLIGHT.airline} {FLIGHT.flightNo} {FLIGHT.aircraft}
      </div>
    </div>
  );
}

function FlightLong() {
  return (
    <div className="long">
      <div className="long-hero" style={{ backgroundImage: `url(${nyc})` }}>
        <span className="pill">{FLIGHT.support}</span>
        <h3>Amsterdam → New York</h3>
        <p>
          {FLIGHT.trip} · {FLIGHT.date} · 1 adult
        </p>
      </div>
      <div className="long-body">
        <div className="long-section">Cheapest on {FLIGHT.date}</div>
        <div className="long-card">
          <FlightCardBody />
          <div className="fc-foot">
            <span>✓ {FLIGHT.noFee}</span>
            <span>
              From <b>${FLIGHT.price}</b>
            </span>
          </div>
        </div>
        <div className="long-section">More flights</div>
        {MORE_FLIGHTS.map((f) => (
          <div className="long-row" key={f.no}>
            <div>
              <b>
                {f.dep} → {f.arr}
              </b>
              <span>
                {f.al} {f.no} · {f.d}
              </span>
            </div>
            <strong>${f.p}</strong>
          </div>
        ))}
      </div>
      <div className="long-qr">
        <Qr src={qrFlight} size={56} />
        <div>
          <b>{FLIGHT.qr}</b>
          <span>Prices shown are per adult, incl. taxes &amp; fees</span>
        </div>
      </div>
    </div>
  );
}

function HotelLong() {
  return (
    <div className="long">
      <div className="long-photo">
        <img src={room} alt="" />
      </div>
      <div className="long-body">
        <h3 className="long-title">
          {HOTEL.name} <Stars />
        </h3>
        <div className="long-scoreline">
          <Score /> <b>{HOTEL.scoreText}</b> <span>{HOTEL.reviews}</span>
        </div>
        <div className="long-addr">{HOTEL.address}</div>
        <div className="long-addr">{HOTEL.distance}</div>
        <div className="long-tags">
          {HOTEL.amenities.map((a) => (
            <span key={a}>{a}</span>
          ))}
        </div>
        <div className="long-card">
          <div className="hc-dates">
            <div>
              <span>Check-in &amp; Check-out</span>
              <b>{HOTEL.dates}</b>
            </div>
            <em>{HOTEL.nights}</em>
          </div>
        </div>
        <div className="long-card">
          <b className="hc-room">{HOTEL.room}</b>
          <span className="hc-meta">{HOTEL.roomMeta}</span>
          <span className="hc-free">✓ {HOTEL.cancel}</span>
          <div className="hc-price">
            <s>${HOTEL.was}</s> <strong>${HOTEL.price}</strong> <em>{HOTEL.off}</em>
          </div>
        </div>
        <p className="long-quote">{HOTEL.review}</p>
      </div>
      <div className="long-qr">
        <Qr src={qrFlight} size={56} />
        <div>
          <b>Scan the QR code to book this hotel</b>
          <span>Today's Deal · price may change</span>
        </div>
      </div>
    </div>
  );
}

export function LongImage({ scenario }: { scenario: ScenarioId }) {
  if (scenario === "flight") return <FlightLong />;
  if (scenario === "hotel") return <HotelLong />;
  return <ItineraryLong />;
}

/* ---------------------------------------------------------------- posters (type=fit / carousel) */

export interface PosterBox {
  baseW: number;
  baseH: number;
  landscape: boolean;
}

/** Posters are composed at a base size for the ratio and scaled into the box, like a generated bitmap. */
export function posterBase(ratio: number): PosterBox {
  if (ratio > 1.05) return { baseW: Math.round(300 * ratio), baseH: 300, landscape: true };
  return { baseW: 320, baseH: Math.round(320 / ratio), landscape: false };
}

function Footer({ qr, text, light = false }: { qr: string; text: ReactNode; light?: boolean }) {
  return (
    <div className={`pf ${light ? "is-light" : ""}`}>
      <Qr src={qr} size={34} />
      <span className="pf-text">{text}</span>
      <TripMark h={13} light={light} />
    </div>
  );
}

function PosterShell({
  box,
  media,
  mediaFrac = 0.5,
  className = "",
  children,
}: {
  box: PosterBox;
  media: ReactNode;
  mediaFrac?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`poster ${box.landscape ? "is-land" : "is-port"} ${className}`}
      style={{ width: box.baseW, height: box.baseH, ["--mf" as string]: mediaFrac }}
    >
      <div className="poster-media">{media}</div>
      <div className="poster-body">{children}</div>
    </div>
  );
}

function ItineraryPoster({ v, box }: { v: number; box: PosterBox }) {
  if (v === 1) {
    return (
      <PosterShell box={box} className="pv-white" mediaFrac={0.34} media={<img src={mapImg} alt="" />}>
        <div className="p-eyebrow">7 days · London &amp; Edinburgh</div>
        <ul className="p-days">
          {ITINERARY.days.slice(0, Math.max(2, Math.floor(((box.landscape ? box.baseH : box.baseH * 0.66) - 110) / 30))).map((d) => (
            <li key={d.date}>
              <b>{d.date}</b>
              <span>{d.title}</span>
            </li>
          ))}
        </ul>
        <Footer qr={qrItin} text={ITINERARY.qrTitle} />
      </PosterShell>
    );
  }
  if (v === 2) {
    return (
      <PosterShell
        box={box}
        className="pv-photo"
        mediaFrac={1}
        media={
          <>
            <img src={mapImg} alt="" />
            <div className="p-grad" />
          </>
        }
      >
        <div className="p-chips">
          <span>London · Day 1–4</span>
          <span>Edinburgh · Day 4–7</span>
        </div>
        <h4 className="p-title-xl">London &amp; Edinburgh in 7 days</h4>
        <div className="p-sub">{ITINERARY.meta}</div>
        <Footer qr={qrItin} text="Copy this itinerary on Trip.com" light />
      </PosterShell>
    );
  }
  const frac = box.landscape ? 0.44 : 0.42;
  const free = box.landscape ? box.baseH - 28 - 22 - 66 - 18 - 56 : box.baseH * (1 - frac) - 26 - 22 - 66 - 18 - 56;
  const days = Math.max(0, Math.min(ITINERARY.days.length, Math.floor(free / 30)));
  return (
    <PosterShell box={box} className="pv-white" mediaFrac={frac} media={<img src={mapImg} alt="" />}>
      <div className="long-author">
        <img src={avatar} alt="" />
        {ITINERARY.author}
      </div>
      <h4 className="p-title">{ITINERARY.title}</h4>
      <div className="p-sub dark">{ITINERARY.meta}</div>
      {days > 0 && (
        <ul className="p-days">
          {ITINERARY.days.slice(0, days).map((d) => (
            <li key={d.date}>
              <b>{d.date}</b>
              <span>{d.title}</span>
            </li>
          ))}
        </ul>
      )}
      <Footer qr={qrItin} text={ITINERARY.qrTitle} />
    </PosterShell>
  );
}

function FlightPoster({ v, box }: { v: number; box: PosterBox }) {
  if (v === 1) {
    return (
      <div className={`poster pv-plain ${box.landscape ? "is-land" : "is-port"}`} style={{ width: box.baseW, height: box.baseH }}>
        <div className="plain-card">
          <FlightCardBody compact={box.landscape} />
          <div className="fc-foot">
            <span>✓ {FLIGHT.noFee}</span>
            <span>
              From <b>${FLIGHT.price}</b>
            </span>
          </div>
        </div>
        <Footer qr={qrFlight} text={FLIGHT.qr} />
      </div>
    );
  }
  if (v === 2) {
    return (
      <PosterShell box={box} className="pv-white" mediaFrac={0.5} media={<img src={nyc} alt="" />}>
        <div className="p-eyebrow">
          {FLIGHT.dep.city} → {FLIGHT.arr.city}
        </div>
        <div className="p-price">
          <span>From</span> <b>${FLIGHT.price}</b>
        </div>
        <div className="p-sub dark">
          {FLIGHT.date} · {FLIGHT.flightNo} · {FLIGHT.noFee}
        </div>
        <Footer qr={qrFlight} text={FLIGHT.qr} />
      </PosterShell>
    );
  }
  return (
    <PosterShell
      box={box}
      className="pv-photo"
      mediaFrac={1}
      media={
        <>
          <img src={nyc} alt="" />
          <div className="p-grad soft" />
        </>
      }
    >
      <span className="pill glass">{FLIGHT.support}</span>
      <h4 className="p-title-xl">{FLIGHT.posterTitle}</h4>
      <div className="p-sub">{FLIGHT.passenger}</div>
      <div className="glass-card">
        <FlightCardBody compact />
      </div>
      <Footer qr={qrFlight} text={FLIGHT.qr} light />
    </PosterShell>
  );
}

function HotelPoster({ v, box }: { v: number; box: PosterBox }) {
  if (v === 1) {
    return (
      <PosterShell
        box={box}
        className="pv-photo"
        mediaFrac={1}
        media={
          <>
            <img src={room} alt="" />
            <div className="p-grad" />
          </>
        }
      >
        <div className="p-scorebig">
          <Score dark /> <b>{HOTEL.scoreText}</b> <span>{HOTEL.reviews}</span>
        </div>
        <p className="p-quote">{HOTEL.review}</p>
        <div className="p-sub">{HOTEL.name}</div>
        <Footer qr={qrFlight} text="Scan to see this hotel on Trip.com" light />
      </PosterShell>
    );
  }
  if (v === 2) {
    return (
      <PosterShell box={box} className="pv-white" mediaFrac={0.52} media={<img src={room} alt="" />}>
        <div className="p-eyebrow">Today's Deal</div>
        <div className="p-price">
          <b>${HOTEL.price}</b> <s>${HOTEL.was}</s> <em>{HOTEL.off}</em>
        </div>
        <div className="p-sub dark">
          {HOTEL.name} · {HOTEL.dates}
        </div>
        <Footer qr={qrFlight} text="Scan to book · Free cancellation" />
      </PosterShell>
    );
  }
  return (
    <div className={`poster pv-brand ${box.landscape ? "is-land" : "is-port"}`} style={{ width: box.baseW, height: box.baseH }}>
      <div className="brand-hello">Hi, let's start our journey~</div>
      <div className="brand-card">
        <div className="brand-photo">
          <img src={room} alt="" />
          <div className="brand-photo-cap">
            <b>{HOTEL.name}</b>
            <span>
              <Score dark /> {HOTEL.address}
            </span>
          </div>
        </div>
        <div className="brand-info">
          <div>
            <b>{HOTEL.dates}</b> · Check-in after 14:00 · {HOTEL.nights}
          </div>
          <strong>{HOTEL.room}</strong>
          <span>
            {HOTEL.roomMeta} · {HOTEL.cancel}
          </span>
        </div>
      </div>
      <Footer qr={qrFlight} text="Trip.com · Long-press to book" light />
    </div>
  );
}

export function Poster({ scenario, v, ratio }: { scenario: ScenarioId; v: number; ratio: number }) {
  const box = posterBase(ratio);
  if (scenario === "flight") return <FlightPoster v={v} box={box} />;
  if (scenario === "hotel") return <HotelPoster v={v} box={box} />;
  return <ItineraryPoster v={v} box={box} />;
}
