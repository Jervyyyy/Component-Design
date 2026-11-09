# Share 分享 · 交互 Demo

Interactive demo of the TDS 2026 **Share** component for iPhone, iPhone DUO and resizable windows.
Properties on the left, live device preview on the right. The share content is real Trip.com
content: the London & Edinburgh itinerary and the AMS → LGA flight from the Figma Share file,
and the Cozrum Homes hotel from Trip.com iOS screens on Mobbin.

Source spec: Figma `Share` page (`Share · Overview`, `share` components, `Share 分享 · iPhone Duo 适配`, `Guideline`, `Media`).

## Run

```bash
npm ci
npm run dev
```

`npm run build` type-checks and writes `dist/`. The `.figma/make/*` scripts are the Figma Code Layer lifecycle
(install / dev / deploy-preview / deploy).

## What is covered

| Area | Controls |
| --- | --- |
| Device | iPhone 16 / 16 Pro Max / 13 mini · iPhone DUO A 外屏竖握, B 内屏竖握, C 内屏横握, D 内屏半折 (left/right half) · resizable (sliders, presets, drag handles) |
| Share | `hasMedia` |
| .Share.Media | `type` fit / scroll / carousel · `ratio` 16:9 4:3 1:1 3:4 9:16 · `hasIndicator` · image state ready / loading / error |
| Share.Panel | `layout` singleRow / doubleRow · `overflow` fixed / scroll · `hasPromotion` `hasPreview` `hasPermission` `hasContacts` `hasExtension` · disabled item |
| Content | itinerary / flight / hotel · International / 中国大陆 channel sets · English / 简体中文 / Deutsch |
| Flow | tap share → loading → sheet → image loading → preview; Share as image from the panel ("Preparing image…", back to "Share via"); toasts for copy / save / channels |

## Layout rules (src/lib/spec.ts)

- **Panel**: phones (W ≤ 440) full width; otherwise inset 8, max 653, centred. Book posture: left 8 → fold edge (455.5).
- **Preview**: top = title bar + 16; phones inset 32; otherwise ≥ 84 each side (symmetric, avoids the Vertical Bar), max 501.
  Book posture: inset 16 from the panel edges, centred on the panel.
- **Items** (`overflow=scroll`): W ≤ 440 → 4.5 visible, item = (W − 52) ÷ 4.5; W > 440 → 72 wide, gap 8.
  `fixed` → max 5 per row, equal width.
- **Posture switch** keeps the current step, the generated image and the preview's scroll position; it only re-lays out.
