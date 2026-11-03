import type { Lang } from "../lib/types";

type Dict = Record<Lang, string>;

export const T = {
  shareAsImage: { en: "Share as image", zh: "分享为图片", de: "Als Bild teilen" },
  shareVia: { en: "Share via", zh: "分享至", de: "Teilen über" },
  scrollHint: {
    en: "Scroll down to see full image",
    zh: "向下滑动查看完整图片",
    de: "Nach unten scrollen für das ganze Bild",
  },
  loading: { en: "Loading...", zh: "加载中...", de: "Wird geladen..." },
  preparing: { en: "Preparing image...", zh: "正在生成图片...", de: "Bild wird erstellt..." },
  linkCopied: { en: "Link copied", zh: "链接已复制", de: "Link kopiert" },
  saved: { en: "Saved to album", zh: "已保存到相册", de: "Im Album gespeichert" },
  opening: { en: "Opening {x}…", zh: "正在打开{x}…", de: "{x} wird geöffnet…" },
  moreOptions: { en: "System share sheet", zh: "调起系统分享", de: "System-Teilen" },
  retry: { en: "Tap to retry", zh: "点击重试", de: "Erneut versuchen" },
  promo: {
    en: "Share with friends — earn up to 500 Trip Coins when they book",
    zh: "分享给好友，好友预订后你最高可得 500 Trip Coins",
    de: "Mit Freunden teilen – bis zu 500 Trip Coins verdienen",
  },
  canView: { en: "Can view", zh: "仅查看", de: "Ansehen" },
  canEdit: { en: "Can edit", zh: "可编辑", de: "Bearbeiten" },
  sendToFriends: { en: "Send to Trip.com friends", zh: "发给 Trip.com 好友", de: "An Trip.com-Freunde senden" },
  hidePrice: { en: "Hide prices in shared content", zh: "分享内容中隐藏价格", de: "Preise im geteilten Inhalt ausblenden" },
  hidePriceSub: {
    en: "Friends will still see dates and places",
    zh: "好友仍可看到日期与地点",
    de: "Freunde sehen weiterhin Daten und Orte",
  },
} satisfies Record<string, Dict>;

export const t = (k: keyof typeof T, lang: Lang, x?: string) => T[k][lang].replace("{x}", x ?? "");
