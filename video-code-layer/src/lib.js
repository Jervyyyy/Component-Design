export {
  h, html, render,
  useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback,
} from '../vendor/preact-htm.mjs';

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function fmtTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const s = Math.floor(sec);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

export const cx = (...a) => a.filter(Boolean).join(' ');
