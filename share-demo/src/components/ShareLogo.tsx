import type { Platform } from "../data/channels";
import whatsappGlyph from "../assets/logos/whatsapp-glyph.svg";
import messengerGlyph from "../assets/logos/messenger-glyph.svg";
import instagramFrame from "../assets/logos/instagram-frame.svg";
import instagram from "../assets/logos/instagram.svg";
import line from "../assets/logos/line.svg";
import sms from "../assets/logos/sms.svg";
import telegram from "../assets/logos/telegram.svg";
import kakaotalk from "../assets/logos/kakaotalk.svg";
import viber from "../assets/logos/viber.svg";
import zalo from "../assets/logos/zalo.svg";
import facebook from "../assets/logos/facebook.svg";
import x from "../assets/logos/x.svg";
import threads from "../assets/logos/threads.svg";
import tiktok from "../assets/logos/tiktok.svg";
import snapchat from "../assets/logos/snapchat.svg";
import reddit from "../assets/logos/reddit.svg";
import pinterest from "../assets/logos/pinterest.svg";
import wechat from "../assets/logos/wechat.svg";
import moments from "../assets/logos/moments.svg";
import qq from "../assets/logos/qq.svg";
import qzone from "../assets/logos/qzone.svg";
import weibo from "../assets/logos/weibo.svg";
import xiaohongshu from "../assets/logos/xiaohongshu.svg";

const FULL: Partial<Record<Platform, string>> = {
  line,
  sms,
  telegram,
  kakaotalk,
  viber,
  zalo,
  facebook,
  x,
  threads,
  tiktok,
  snapchat,
  reddit,
  pinterest,
  wechat,
  moments,
  qq,
  qzone,
  weibo,
  xiaohongshu,
};

/** .Share.Logo — 56×56 full-bleed brand icon (platform colours are official, not DS tokens). */
export function ShareLogo({ platform }: { platform: Platform }) {
  if (platform === "whatsapp") {
    return (
      <div className="logo">
        <div style={{ position: "absolute", inset: 0, borderRadius: 28, background: "#1eba62" }} />
        <img
          alt=""
          src={whatsappGlyph}
          width={38}
          height={38.97}
          style={{ position: "absolute", left: "16.07%", top: "calc(50% + 0.49px)", transform: "translateY(-50%)" }}
        />
      </div>
    );
  }
  if (platform === "messenger") {
    return (
      <div className="logo logo-messenger">
        <img
          alt=""
          src={messengerGlyph}
          width={38}
          height={37.99}
          style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
        />
      </div>
    );
  }
  if (platform === "instagram") {
    return (
      <div className="logo" style={{ borderRadius: 999, overflow: "hidden" }}>
        <img alt="" src={instagramFrame} width={56} height={56} style={{ position: "absolute", inset: 0 }} />
        <img alt="" src={instagram} width={56} height={56} style={{ position: "absolute", inset: 0 }} />
      </div>
    );
  }
  return (
    <div className="logo">
      <img alt="" src={FULL[platform]} width={56} height={56} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}
