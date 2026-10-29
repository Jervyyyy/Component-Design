# TDS Video · Code Layer

Interactive reconstruction of the **Video 视频** component from the TDS Figma file
(`Video` › Component, node `40078683:1251`), built to run as a Figma **Code Layer** next to the spec.

- **Left — control panel.** Every control is a TDS component property with its Figma name:
  `Video` (orientation, state, hasTopBar, hasControls, hasSideRail), `Media › ratio`,
  `Video.State` (CenterState auto / loading / error), `Video.ControlBar` (type, state, hasSpeed, hasRotate,
  hasPreview, hasCounter), `Video.ProgressBar` (hasChapters), `Video.TopBar` (centerSlot),
  `Video.SideRail` (6 items, 3 counts + values). A **Rules** block shows which window rule changed a prop.
- **Right — live demo.** Real playback (Singapore footage, see `CREDITS.md`), tap to play/pause,
  ±10 s seek, drag the progress bar (scrubbing readout, brand-colour played segment, frame preview),
  speed cycle 1.0X › 1.25X › 1.5X › 2.0X › 0.75X with toast, mute toast, Rotate-for-fullscreen / Shrink,
  counter filmstrip, SegmentedControl groups.
- **Devices.** iPhone (portrait / landscape), **iPhone Duo** postures A–E from the
  "Video · iPhone Duo 适配" page (outer 466×678 with Vertical Bar, inner portrait with reserved area,
  inner landscape, tabletop, book), and **Resizable** — drag the window edges; orientation,
  control-bar type, margins (16 / 32 / 40) and large/small-window rules follow the Foldable guideline.

The video element is created once and re-parented between layouts, so rotating, folding or resizing
keeps progress, speed and mute (TDS: 视频不重新加载).

## Run locally

Plain static files, no build step:

```bash
cd video-code-layer && python3 -m http.server 4173
```

Open http://localhost:4173.

## Files

- `src/video.js` — the TDS Video component and its parts (TopBar, ControlBar, ProgressBar, State, SideRail, Counter, Media, Toast)
- `src/rules.js` — window classes (手机 / 大屏 / 小窗口), margins, iPhone Duo postures
- `src/app.js` — device frames and stage; `src/panel.js` — property panel
- `src/player.js` — shared `<video>` engine; `src/icons.js` — SVG glyphs exported from Figma
