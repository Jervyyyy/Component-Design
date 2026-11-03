import type { Lang, PanelLayout, Region, ScenarioId } from "../lib/types";

export type Platform =
  | "whatsapp"
  | "messenger"
  | "line"
  | "sms"
  | "telegram"
  | "kakaotalk"
  | "viber"
  | "zalo"
  | "facebook"
  | "x"
  | "instagram"
  | "threads"
  | "tiktok"
  | "snapchat"
  | "reddit"
  | "pinterest"
  | "wechat"
  | "moments"
  | "qq"
  | "qzone"
  | "weibo"
  | "xiaohongshu";

export type ActionId = "save" | "shareImage" | "copyLink" | "editFriends" | "message" | "email" | "more";

export type TargetId = Platform | ActionId;

const ACTIONS: ActionId[] = ["save", "shareImage", "copyLink", "editFriends", "message", "email", "more"];
export const isAction = (id: TargetId): id is ActionId => (ACTIONS as string[]).includes(id);

const L = (en: string, zh: string, de?: string) => ({ en, zh, de: de ?? en });

export const LABELS: Record<TargetId, Record<Lang, string>> = {
  whatsapp: L("WhatsApp", "WhatsApp"),
  messenger: L("Facebook Messenger", "Messenger"),
  line: L("Line", "LINE"),
  sms: L("Messages", "信息", "Nachrichten"),
  telegram: L("Telegram", "Telegram"),
  kakaotalk: L("KakaoTalk", "KakaoTalk"),
  viber: L("Viber", "Viber"),
  zalo: L("Zalo", "Zalo"),
  facebook: L("Facebook", "Facebook"),
  x: L("X", "X"),
  instagram: L("Instagram", "Instagram"),
  threads: L("Threads", "Threads"),
  tiktok: L("TikTok", "抖音 TikTok"),
  snapchat: L("Snapchat", "Snapchat"),
  reddit: L("Reddit", "Reddit"),
  pinterest: L("Pinterest", "Pinterest"),
  wechat: L("WeChat", "微信"),
  moments: L("Moments", "微信朋友圈", "WeChat Moments"),
  qq: L("QQ", "QQ"),
  qzone: L("Qzone", "QQ 空间"),
  weibo: L("Weibo", "微博"),
  xiaohongshu: L("Xiaohongshu", "小红书"),
  save: L("Save to album", "保存到相册", "Im Album speichern"),
  shareImage: L("Share as image", "分享为图片", "Als Bild teilen"),
  copyLink: L("Copy link", "复制链接", "Link in die Zwischenablage kopieren"),
  editFriends: L("Edit with friends", "邀请好友编辑", "Mit Freunden bearbeiten"),
  message: L("Message", "短信", "Nachricht"),
  email: L("Email", "邮件", "E-Mail"),
  more: L("More", "更多", "Weitere Optionen"),
};

export interface PanelRows {
  rows: TargetId[][];
}

/**
 * Channel sets — taken from the real Trip.com cases in the Figma file:
 * itinerary (Guideline · Share this itinerary), flight (Media=fit · Share this flight),
 * hotel (iPhone DUO · Hotel-Share), mainland China (携程 · 分享给朋友).
 */
export function getRows(
  scenario: ScenarioId,
  region: Region,
  layout: PanelLayout,
  hasMedia: boolean,
): PanelRows {
  if (region === "cn") {
    const ch: TargetId[] = ["wechat", "moments", "qq", "qzone", "weibo", "xiaohongshu"];
    const ac: TargetId[] = ["shareImage", "copyLink", "message", "more"];
    if (hasMedia) {
      // Share as image keeps only the channel row (Behavior · 分享为图片)
      return layout === "singleRow"
        ? { rows: [["save", "wechat", "moments", "qq", "weibo", "xiaohongshu"]] }
        : { rows: [ch, ["save", "copyLink", "more"]] };
    }
    return layout === "singleRow"
      ? { rows: [["wechat", "moments", "qq", "copyLink", "shareImage", "more"]] }
      : { rows: [ch, ac] };
  }

  const channels: Record<ScenarioId, TargetId[]> = {
    itinerary: ["whatsapp", "instagram", "telegram", "snapchat", "messenger", "kakaotalk"],
    flight: ["facebook", "whatsapp", "instagram", "x", "line", "messenger"],
    hotel: ["whatsapp", "line", "messenger", "instagram", "facebook", "telegram"],
  };
  const actions: Record<ScenarioId, TargetId[]> = {
    itinerary: ["shareImage", "copyLink", "editFriends", "message", "email", "more"],
    flight: ["shareImage", "message", "email", "copyLink", "more"],
    hotel: ["shareImage", "copyLink", "message", "email", "more"],
  };

  if (hasMedia) {
    if (layout === "singleRow") {
      return { rows: [["save", "whatsapp", "instagram", "telegram", "kakaotalk", "snapchat", "messenger"]] };
    }
    // Guideline · 分享 loading 路径: image mode keeps the same two rows as the panel
    return { rows: [channels[scenario], actions[scenario]] };
  }
  if (layout === "singleRow") {
    // spec default single-row order: WhatsApp › Messenger › Text Message › Copy link › (Save) › More
    return { rows: [["whatsapp", "messenger", "message", "copyLink", "shareImage", "more"]] };
  }
  return { rows: [channels[scenario], actions[scenario]] };
}
