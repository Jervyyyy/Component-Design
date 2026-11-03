export type DeviceKind = "iphone" | "duo" | "custom";
export type IphoneModel = "iphone16" | "iphone16promax" | "iphone13mini";
export type Posture = "A" | "B" | "C" | "D";
export type BookSide = "left" | "right";

export type ScenarioId = "itinerary" | "flight" | "hotel";
export type Region = "intl" | "cn";
export type Lang = "en" | "zh" | "de";

export type MediaType = "fit" | "scroll" | "carousel";
export type Ratio = "16:9" | "4:3" | "1:1" | "3:4" | "9:16";
export type ImageState = "ready" | "loading" | "error";

export type PanelLayout = "singleRow" | "doubleRow";
export type Overflow = "fixed" | "scroll";

export interface Config {
  device: DeviceKind;
  iphone: IphoneModel;
  posture: Posture;
  bookSide: BookSide;
  customW: number;
  customH: number;

  scenario: ScenarioId;
  region: Region;
  lang: Lang;

  hasMedia: boolean;
  mediaType: MediaType;
  ratio: Ratio;
  hasIndicator: boolean;
  imageState: ImageState;

  layout: PanelLayout;
  overflow: Overflow;
  hasPromotion: boolean;
  hasPreview: boolean;
  hasPermission: boolean;
  hasContacts: boolean;
  hasExtension: boolean;
  disabledDemo: boolean;

  flowLoading: boolean;
  loadingMs: number;
  zoom: "fit" | "100";
}

export const RATIO_VALUE: Record<Ratio, number> = {
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "1:1": 1,
  "3:4": 3 / 4,
  "9:16": 9 / 16,
};

export const DEFAULT_CONFIG: Config = {
  device: "iphone",
  iphone: "iphone16",
  posture: "A",
  bookSide: "left",
  customW: 744,
  customH: 1133,

  scenario: "itinerary",
  region: "intl",
  lang: "en",

  hasMedia: true,
  mediaType: "scroll",
  ratio: "3:4",
  hasIndicator: true,
  imageState: "ready",

  layout: "doubleRow",
  overflow: "scroll",
  hasPromotion: false,
  hasPreview: false,
  hasPermission: false,
  hasContacts: false,
  hasExtension: false,
  disabledDemo: false,

  flowLoading: true,
  loadingMs: 2000,
  zoom: "fit",
};
