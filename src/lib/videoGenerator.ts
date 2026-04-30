/**
 * videoGenerator.ts
 * ------------------
 * Canvas + MediaRecorder with offline-pre-rendered audio.
 *
 * Video duration strategy
 * -----------------------
 *   • When voice is ON:  duration = TTS audio duration (fetched first).
 *     Images cycle/repeat as needed to fill the full TTS duration.
 *     Video stops exactly when narration ends.
 *   • When voice is OFF: duration = msPerImage × imageCount (original behaviour).
 *
 * Audio pipeline:
 *   1. fetchTTSAudio()     → /api/tts → WAV ArrayBuffer  (server-side macOS `say`)
 *      decodeAudioData()   → TTS AudioBuffer  ← duration taken from here
 *   2. renderMusicOffline() → music AudioBuffer  (OfflineAudioContext, no gesture)
 *   3. mixAudioOffline()   → combined AudioBuffer  (music 35% + voice 92%)
 *   4. BufferSourceNode → MediaStreamDestination → MediaRecorder
 */

import { renderMusicOffline, fetchTTSAudio, mixAudioOffline } from "./audioSynth";

export interface GenerationProgress {
  /** Current elapsed seconds (0-based). */
  elapsed: number;
  /** Total target seconds. */
  total: number;
  /** Percentage 0–100. */
  pct: number;
  label: string;
}

export interface CaptionSegment {
  text: string;
  /** Index into the image array (wraps for cycling). */
  imageIndex: number;
  type: "hook" | "body" | "cta";
}

export interface AudioConfig {
  voicePersona: string;
  narrativeTheme: string;
  voiceGender: "male" | "female";
  /** If provided, this text is synthesised via TTS and sets the video duration. */
  ttsText?: string;
}

/* ------------------------------------------------------------------ */
/*  Caption helpers                                                     */
/* ------------------------------------------------------------------ */
function truncate(text: string, max: number): string {
  const w = text.trim().split(/\s+/);
  return w.length <= max ? text.trim() : w.slice(0, max).join(" ") + "…";
}

export function buildCaptions(scriptJson: string, imageCount: number): CaptionSegment[] {
  if (!scriptJson || imageCount === 0) return [];
  let p: Record<string, string> = {};
  try { p = JSON.parse(scriptJson); } catch { return []; }
  const slots = new Map<number, CaptionSegment>();
  if (p.hook) slots.set(0, { text: truncate(p.hook, 10), imageIndex: 0, type: "hook" });
  if (p.cta && imageCount > 1) slots.set(imageCount - 1, { text: truncate(p.cta, 8), imageIndex: imageCount - 1, type: "cta" });
  if (p.body && imageCount >= 3) {
    // Split on sentence endings — works with natural narration (no Scene X: labels)
    const sentences = p.body
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const take = Math.min(sentences.length, imageCount - 2);
    for (let i = 0; i < take; i++) {
      const f = i + 1;
      if (!slots.has(f)) slots.set(f, { text: truncate(sentences[i], 8), imageIndex: f, type: "body" });
    }
  }
  return Array.from(slots.values()).sort((a, b) => a.imageIndex - b.imageIndex);
}


/* ------------------------------------------------------------------ */
/*  Caption drawing                                                     */
/* ------------------------------------------------------------------ */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(" "); const lines: string[] = []; let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function drawCaption(ctx: CanvasRenderingContext2D, cap: CaptionSegment, W: number, H: number, alpha: number) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  const isHook = cap.type === "hook", isCta = cap.type === "cta";
  const fs = isHook ? 72 : isCta ? 68 : 60;
  ctx.font = `${isHook || isCta ? 800 : 700} ${fs}px Arial,sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  const lines = wrapText(ctx, cap.text, W * 0.82);
  const lineH = fs * 1.22;
  const baseY = isHook ? H * 0.22 : isCta ? H * 0.88 : H * 0.82;
  const startY = isHook ? baseY : baseY - lines.length * lineH + lineH;
  lines.forEach((ln, i) => {
    const y = startY + i * lineH, x = W / 2;
    const m = ctx.measureText(ln);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath(); ctx.roundRect(x - m.width / 2 - 32, y - fs - 8, m.width + 64, lineH + 16, 20); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 3;
    ctx.fillText(ln, x, y); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    if (isHook) { ctx.fillStyle = "rgba(99,102,241,0.85)"; ctx.fillRect(x - m.width / 2, y + 4, m.width, 4); }
    if (isCta)  { ctx.fillStyle = "rgba(34,211,238,0.85)"; ctx.fillRect(x - m.width / 2, y + 4, m.width, 4); }
  });
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  MIME                                                                */
/* ------------------------------------------------------------------ */
function chooseMime(): string {
  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (iOS) return MediaRecorder.isTypeSupported("video/mp4;codecs=avc1") ? "video/mp4;codecs=avc1" : "video/mp4";
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) return "video/webm;codecs=vp9,opus";
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) return "video/webm;codecs=vp8,opus";
  if (MediaRecorder.isTypeSupported("video/webm"))                 return "video/webm";
  return "video/mp4";
}

/* ------------------------------------------------------------------ */
/*  Main export                                                         */
/* ------------------------------------------------------------------ */
export async function generateVideoFromImages(
  urls: string[],
  onProgress?: (p: GenerationProgress) => void,
  msPerImage = 2500,
  width  = 1080,
  height = 1920,
  captions: CaptionSegment[] = [],
  audioConfig?: AudioConfig,
): Promise<string> {
  if (urls.length === 0) throw new Error("No images provided");

  /* ── 1. Pre-load images ── */
  const images = (await Promise.all(
    urls.map((url) => new Promise<HTMLImageElement | null>((res) => {
      const img = new Image(); img.crossOrigin = "anonymous";
      img.onload = () => res(img); img.onerror = () => res(null); img.src = url;
    }))
  )).filter(Boolean) as HTMLImageElement[];
  if (images.length === 0) throw new Error("No images could be loaded");

  /* ── 2. Audio pipeline ──
   *
   * Step A: Fetch TTS FIRST → decode → read actual audio duration.
   *         Video duration is set to TTS duration (voice-driven length).
   * Step B: Render music for that exact duration (OfflineAudioContext).
   * Step C: Mix both offline.
   * Step D: Play mixed buffer via BufferSourceNode during recording.
   */
  let finalAudioBuf: AudioBuffer | null = null;
  let liveCtx: AudioContext | null      = null;
  let audioTrack: MediaStreamTrack | null = null;

  // Default duration: fixed per-image timing (used when no TTS)
  let totalSec = (msPerImage * images.length) / 1000 + 1.0;
  let ttsBuf: AudioBuffer | null = null;

  if (audioConfig) {
    try {
      /* A. Fetch & decode TTS — duration comes from this buffer */
      if (audioConfig.ttsText) {
        onProgress?.({ elapsed: 0, total: totalSec, pct: 2, label: "🎙 Fetching persona voice…" });
        const ttsRaw = await fetchTTSAudio(
          audioConfig.ttsText,
          audioConfig.voicePersona,
          audioConfig.voiceGender,
        );
        if (ttsRaw) {
          const decodeCtx = new AudioContext();
          try   { ttsBuf = await decodeCtx.decodeAudioData(ttsRaw); }
          finally { await decodeCtx.close(); }

          // ← video duration is driven by TTS length
          totalSec = ttsBuf.duration + 0.6; // small tail-out
        }
      }

      /* B. Render music bed for exactly totalSec */
      onProgress?.({ elapsed: 0, total: totalSec, pct: 5, label: "🎵 Rendering music bed…" });
      const musicBuf = await renderMusicOffline(
        audioConfig.voicePersona,
        audioConfig.narrativeTheme,
        totalSec,
      );

      /* C. Mix music + TTS */
      onProgress?.({ elapsed: 0, total: totalSec, pct: 10, label: ttsBuf ? "🎚 Mixing music + voice…" : "🎚 Finalising audio…" });
      finalAudioBuf = await mixAudioOffline(musicBuf, ttsBuf, totalSec);

      /* D. Live playback context for MediaRecorder capture */
      liveCtx = new AudioContext({ sampleRate: 44100 });
      try { await liveCtx.resume(); } catch { /* ok on iOS */ }
      const dest   = liveCtx.createMediaStreamDestination();
      const source = liveCtx.createBufferSource();
      source.buffer = finalAudioBuf;
      source.connect(dest);
      source.start(0);
      audioTrack = dest.stream.getAudioTracks()[0] ?? null;

    } catch (e) {
      console.warn("[videoGenerator] Audio pipeline failed — video will be silent:", e);
      liveCtx?.close().catch(() => {});
      liveCtx = null; audioTrack = null;
    }
  }

  /* ── 3. Canvas + combined MediaStream ── */
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  if (!ctx) { liveCtx?.close().catch(() => {}); throw new Error("Canvas unavailable"); }

  const canvasStream = canvas.captureStream(30);
  const combined     = audioTrack
    ? new MediaStream([...canvasStream.getVideoTracks(), audioTrack])
    : canvasStream;

  /* ── 4. MediaRecorder ── */
  const mime = chooseMime();
  let recorder: MediaRecorder;
  try { recorder = new MediaRecorder(combined, { mimeType: mime, videoBitsPerSecond: 4_000_000, audioBitsPerSecond: 128_000 }); }
  catch  { recorder = new MediaRecorder(combined); }

  /* ── 5. Frame render loop ──
   *
   * Images cycle (idx % images.length) until totalSec is reached.
   * Progress is time-based: elapsed / totalSec.
   * The loop ends when elapsed >= totalSec (not when images are exhausted).
   */
  const totalMs   = totalSec * 1000;
  const FADE      = 400; // cross-fade window in ms

  return new Promise<string>((resolve, reject) => {
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      liveCtx?.close().catch(() => {});
      resolve(URL.createObjectURL(new Blob(chunks, { type: mime.split(";")[0] })));
    };
    recorder.onerror = (e) => { liveCtx?.close().catch(() => {}); reject(e); };

    recorder.start(50);

    // Image-slot state (independent of total time)
    let imgStep  = 0;          // which image slot we're on (unbounded counter)
    let imgStart = performance.now(); // when current image slot started
    let renderStart = performance.now(); // when recording started
    let raf = 0;
    let stopping = false;

    const draw = (now: number) => {
      const totalElapsed = now - renderStart; // ms since record start

      /* ── Stop condition: audio is done ── */
      if (totalElapsed >= totalMs && !stopping) {
        stopping = true;
        cancelAnimationFrame(raf);
        // Fade to black on the last frame
        ctx.fillStyle = "rgba(2,6,23,1)";
        ctx.fillRect(0, 0, width, height);
        try { recorder.requestData(); } catch { /* ok */ }
        setTimeout(() => { try { recorder.stop(); } catch { /* ok */ } }, 300);
        return;
      }

      /* ── Report progress ── */
      const elapsedSec = totalElapsed / 1000;
      const pct = Math.min(99, Math.round(10 + (totalElapsed / totalMs) * 89));
      onProgress?.({
        elapsed: elapsedSec,
        total: totalSec,
        pct,
        label: `Rendering… ${elapsedSec.toFixed(1)}s / ${totalSec.toFixed(1)}s`,
      });

      /* ── Which image to show (cycling) ── */
      const imgElapsed = now - imgStart;
      const progress   = Math.min(imgElapsed / msPerImage, 1);
      const actualIdx  = imgStep % images.length;
      const img        = images[actualIdx];

      /* Ken Burns pan */
      const zoom = 1 + progress * 0.06;
      const imgR = img.naturalWidth / img.naturalHeight;
      const canR = width / height;
      let dw: number, dh: number, dx: number, dy: number;
      if (imgR > canR) { dh = height * zoom; dw = dh * imgR; }
      else             { dw = width  * zoom; dh = dw / imgR; }
      dx = (width - dw) / 2; dy = (height - dh) / 2;
      if (imgStep % 2 === 0) dy -= height * 0.03 * progress;
      else                   dy += height * 0.03 * progress;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#020617"; ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, dx, dy, dw, dh);

      /* Gradients */
      const tg = ctx.createLinearGradient(0, 0, 0, height * 0.3);
      tg.addColorStop(0, "rgba(2,6,23,0.75)"); tg.addColorStop(1, "rgba(2,6,23,0)");
      ctx.fillStyle = tg; ctx.fillRect(0, 0, width, height * 0.3);
      const bg = ctx.createLinearGradient(0, height * 0.6, 0, height);
      bg.addColorStop(0, "rgba(2,6,23,0)"); bg.addColorStop(1, "rgba(2,6,23,0.9)");
      ctx.fillStyle = bg; ctx.fillRect(0, height * 0.6, width, height * 0.4);

      /* Cross-fade at image transitions */
      const fi = Math.min(1, imgElapsed / FADE);
      const fo = imgElapsed > msPerImage - FADE ? Math.max(0, (msPerImage - imgElapsed) / FADE) : 1;
      const ba = 1 - fi * fo;
      if (ba > 0) { ctx.fillStyle = `rgba(2,6,23,${ba.toFixed(3)})`; ctx.fillRect(0, 0, width, height); }

      /* Final 1s global fade-out */
      const remainMs = totalMs - totalElapsed;
      if (remainMs < 1000) {
        const fadeAlpha = 1 - remainMs / 1000;
        ctx.fillStyle = `rgba(2,6,23,${fadeAlpha.toFixed(3)})`; ctx.fillRect(0, 0, width, height);
      }

      /* Vignette */
      const vg = ctx.createRadialGradient(width/2, height/2, height*0.3, width/2, height/2, height*0.75);
      vg.addColorStop(0, "rgba(99,102,241,0)"); vg.addColorStop(1, "rgba(99,102,241,0.12)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, width, height);

      /* Captions — tied to cycling image slot */
      const captionAlpha = Math.min(fi, fo) * 0.95;
      for (const cap of captions.filter((c) => c.imageIndex === actualIdx)) {
        drawCaption(ctx, cap, width, height, captionAlpha);
      }

      /* Advance image slot */
      if (progress >= 1) { imgStep++; imgStart = now; }

      raf = requestAnimationFrame(draw);
    };

    renderStart = performance.now();
    imgStart    = renderStart;
    raf = requestAnimationFrame(draw);
  });
}
