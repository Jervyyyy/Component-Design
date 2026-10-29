// One shared <video> engine for every layout. The element is created once and re-parented into
// whichever Media frame is mounted, so rotating / folding / resizing never reloads the video
// (TDS Foldable: 「播放进度、倍速、静音状态全部保留，视频不重新加载」).
import { useEffect, useState } from './lib.js';
import { CLIPS } from './media.js';

const SPEEDS = [1, 1.25, 1.5, 2, 0.75]; // TDS Playback Speed: 1.0X › 1.25X › 1.5X › 2.0X › 0.75X › 1.0X

class Player {
  constructor() {
    const mk = () => {
      const v = document.createElement('video');
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.preload = 'auto';
      v.loop = true;
      v.disablePictureInPicture = true;
      return v;
    };
    this.video = mk();
    this.preview = mk(); // scrubbing thumbnail (hasPreview)
    this.preview.muted = true;
    this.blobs = new Map();
    this.token = 0;
    this.listeners = new Set();
    this.timeListeners = new Set();
    this.s = {
      clipId: CLIPS[0].id,
      playing: false,     // TDS Video.state: playing | paused (intent)
      loading: true,      // Video.State loading (fetching / waiting for data)
      error: false,       // Video.State error
      muted: false,
      rate: 1,
      duration: CLIPS[0].duration,
    };
    this.t = 0;
    const v = this.video;
    v.addEventListener('waiting', () => this.set({ loading: true }));
    v.addEventListener('playing', () => this.set({ loading: false }));
    v.addEventListener('canplay', () => this.s.loading && !this.fetching && this.set({ loading: false }));
    v.addEventListener('durationchange', () => isFinite(v.duration) && this.set({ duration: v.duration }));
    v.addEventListener('pause', () => { if (this.s.playing && !v.ended && !this.fetching && !this.scrubbing) this.set({ playing: false }); });
    v.addEventListener('error', () => { if (!this.fetching) this.set({ error: true, loading: false }); });
    const tick = () => {
      if (!this.scrubbing && Math.abs(v.currentTime - this.t) > 0.01) { this.t = v.currentTime; this.emitTime(); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // --- subscription -------------------------------------------------------------------------
  set(patch) { Object.assign(this.s, patch); this.listeners.forEach((f) => f()); }
  emitTime() { this.timeListeners.forEach((f) => f()); }
  get clip() { return CLIPS.find((c) => c.id === this.s.clipId) || CLIPS[0]; }

  // --- loading ------------------------------------------------------------------------------
  // Clips are fetched as blobs so seeking/scrubbing works on any static host (no range requests needed).
  async load(id, { keepPlaying = true } = {}) {
    const clip = CLIPS.find((c) => c.id === id) || CLIPS[0];
    const token = ++this.token;
    this.fetching = true;
    this.video.pause();
    this.t = 0; this.emitTime();
    this.set({ clipId: clip.id, loading: true, error: false, duration: clip.duration, playing: keepPlaying ? this.s.playing : false });
    try {
      let url = this.blobs.get(clip.id);
      if (!url) {
        const res = await fetch(clip.src);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        url = URL.createObjectURL(await res.blob());
        this.blobs.set(clip.id, url);
      }
      if (token !== this.token) return;
      this.video.src = url;
      this.preview.src = url;
      this.video.playbackRate = this.s.rate;
      this.video.muted = this.s.muted;
      await new Promise((ok, ko) => {
        const done = () => { this.video.removeEventListener('loadeddata', done); this.video.removeEventListener('error', fail); ok(); };
        const fail = () => { this.video.removeEventListener('loadeddata', done); this.video.removeEventListener('error', fail); ko(new Error('decode')); };
        this.video.addEventListener('loadeddata', done);
        this.video.addEventListener('error', fail);
      });
      if (token !== this.token) return;
      this.fetching = false;
      this.set({ loading: false, duration: this.video.duration || clip.duration });
      if (this.s.playing) this._play();
    } catch (e) {
      if (token !== this.token) return;
      this.fetching = false;
      this.set({ loading: false, error: true, playing: false });
    }
  }

  retry() { this.blobs.delete(this.s.clipId); this.load(this.s.clipId); }

  // --- transport ----------------------------------------------------------------------------
  _play() {
    const p = this.video.play();
    if (p && p.catch) {
      p.catch((err) => {
        // Autoplay policy: retry muted (keeps the TDS "Muted" feedback consistent).
        if (err && err.name === 'NotAllowedError' && !this.video.muted) {
          this.video.muted = true;
          this.set({ muted: true });
          this.video.play().catch(() => this.set({ playing: false }));
        }
      });
    }
  }
  play() { this.set({ playing: true }); if (!this.fetching && !this.s.error) this._play(); }
  pause() { this.set({ playing: false }); this.video.pause(); }
  toggle() { this.s.playing ? this.pause() : this.play(); }
  setPlaying(on) { on ? this.play() : this.pause(); }

  seek(t) {
    const d = this.s.duration || 0;
    t = Math.max(0, Math.min(d - 0.05, t));
    this.video.currentTime = t;
    this.t = t; this.emitTime();
  }
  skip(delta) { this.seek(this.video.currentTime + delta); }

  // Scrubbing: readout + preview follow the finger; the frame under the playhead updates live.
  scrubStart() { this.scrubbing = true; this.wasPlaying = this.s.playing; this.video.pause(); }
  scrubTo(t) {
    const d = this.s.duration || 0;
    this.t = Math.max(0, Math.min(d, t));
    if (this.video.fastSeek) this.video.fastSeek(this.t); else this.video.currentTime = this.t;
    this.preview.currentTime = this.t;
    this.emitTime();
  }
  scrubEnd() {
    this.scrubbing = false;
    this.video.currentTime = this.t;
    if (this.wasPlaying) this._play();
  }

  toggleMute() { const m = !this.s.muted; this.video.muted = m; this.set({ muted: m }); return m; }
  cycleSpeed() {
    const i = SPEEDS.indexOf(this.s.rate);
    const r = SPEEDS[(i + 1) % SPEEDS.length];
    this.video.playbackRate = r;
    this.set({ rate: r });
    return r;
  }

  get bufferedEnd() {
    // Clips are fully fetched (blob) so the real buffer is always 100%. To keep the TDS
    // "Buffered" layer meaningful we show a rolling read-ahead window like a streaming player.
    const d = this.s.duration || 0;
    if (!d || this.s.loading) return 0;
    return Math.min(d, this.t + Math.max(4, d * 0.3));
  }
}

export const player = new Player();

export function usePlayer() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((n) => n + 1); player.listeners.add(f); return () => player.listeners.delete(f); }, []);
  return player.s;
}

export function usePlayerTime() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((n) => n + 1); player.timeListeners.add(f); return () => player.timeListeners.delete(f); }, []);
  return player.t;
}

export const speedLabel = (r) => (Number.isInteger(r) ? r.toFixed(1) : String(r)) + 'X';
