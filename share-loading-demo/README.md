# Share loading demo

Interactive demo of the itinerary "Share" flow, based on the Figma design "分享 loading 路径" (Share page).

Flow:
1. Tap the share button in the top-right corner of the itinerary page.
2. A global loading overlay shows for **2s**.
3. The share sheet opens (`Share` with `hasMedia`, `type=scroll`); the media area shows a loading spinner for **1.5s**.
4. The long share image (Share Poster / Itinerary) appears and can be scrolled; the sheet's channel/action rows scroll horizontally.

Tap ✕ (in the loading box or the navigation bar) to go back and replay.

Static HTML/CSS/JS, no build step: open `index.html` or serve the folder.
Timings are at the top of `app.js` (`PAGE_LOADING_MS`, `MEDIA_LOADING_MS`).
All images and icons in `assets/` were exported from the Figma file.
