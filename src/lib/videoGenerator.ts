/**
 * videoGenerator.ts
 * ------------------
 * Generates a .webm video from an array of image URLs using the browser's
 * Canvas API + MediaRecorder API.
 *
 * Features:
 *  - Ken Burns (slow pan + zoom) per image
 *  - Cross-fade transitions
 *  - Timed caption overlays (hook → body scenes → cta) burned onto canvas
 *  - Audio track injected from the Web Audio API synth
 */

export interface GenerationProgress {
  frame: number;
  total: number;
  label: string;
}

/** A timed caption segment */
export interface CaptionSegment {
  text: string;
  /** Which image index this caption appears on (0-based) */
  imageIndex: number;
  /** Sub-type controls styling */
  type: "hook" | "body" | "cta";
}

/**
 * Build a caption schedule from the raw Groq script JSON.
 * Falls back gracefully if the script is not valid JSON.
 */
export function buildCaptions(scriptJson: string, imageCount: number): CaptionSegment[] {
  const captions: CaptionSegment[] = [];
  if (!scriptJson || imageCount === 0) return captions;

  let parsed: Record<string, string> = {};
  try { parsed = JSON.parse(scriptJson); } catch { return captions; }

  // Hook always on first frame
  if (parsed.hook) captions.push({ text: parsed.hook, imageIndex: 0, type: "hook" });

  // Body: split by period or ". Scene" or "Scene N:"
  if (parsed.body) {
    const scenes = parsed.body
      .split(/Scene\s+\d+[:.]/i)
      .map((s) => s.trim())
      .filter(Boolean);
    scenes.forEach((scene, i) => {
      const imgIdx = Math.min(i + 1, imageCount - 1);
      captions.push({ text: scene, imageIndex: imgIdx, type: "body" });
    });
  }

  // CTA on last frame
  if (parsed.cta) {
    captions.push({ text: parsed.cta, imageIndex: imageCount - 1, type: "cta" });
  }

  return captions;
}

/* ------------------------------------------------------------------ */
/*  Canvas caption drawing helpers                                      */
/* ------------------------------------------------------------------ */

/** Wrap text into lines ≤ maxWidth, return array of lines */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  caption: CaptionSegment,
  canvasWidth: number,
  canvasHeight: number,
  alpha: number,           // 0-1 opacity for fade
) {
  if (alpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  const isHook = caption.type === "hook";
  const isCta  = caption.type === "cta";

  const maxW   = canvasWidth * 0.82;
  const fontSize = isHook ? 72 : isCta ? 68 : 60;
  const fontWeight = isHook || isCta ? 800 : 700;

  ctx.font = `${fontWeight} ${fontSize}px 'Arial', sans-serif`;
  ctx.textAlign    = "center";
  ctx.textBaseline = "bottom";

  const lines = wrapText(ctx, caption.text, maxW);
  const lineH  = fontSize * 1.22;
  const totalH = lines.length * lineH;

  // Vertical position
  const baseY = isHook
    ? canvasHeight * 0.22
    : isCta
    ? canvasHeight * 0.88
    : canvasHeight * 0.82;

  const startY = isHook ? baseY : baseY - totalH + lineH;

  lines.forEach((line, li) => {
    const y = startY + li * lineH;
    const x = canvasWidth / 2;

    // Semi-transparent pill background for readability
    const metrics   = ctx.measureText(line);
    const padX      = 32;
    const padY      = 16;
    const rectW     = metrics.width + padX * 2;
    const rectH     = lineH + padY;
    const rectX     = x - rectW / 2;
    const rectY     = y - fontSize - padY / 2;
    const radius    = 20;

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.roundRect(rectX, rectY, rectW, rectH, radius);
    ctx.fill();

    // White text
    ctx.fillStyle   = "#FFFFFF";
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur  = 18;
    ctx.shadowOffsetY = 3;
    ctx.fillText(line, x, y);
    ctx.shadowBlur  = 0;
    ctx.shadowOffsetY = 0;

    // Coloured accent underline for hook
    if (isHook) {
      ctx.fillStyle = "rgba(99,102,241,0.85)";
      ctx.fillRect(x - metrics.width / 2, y + 4, metrics.width, 4);
    }
    if (isCta) {
      ctx.fillStyle = "rgba(34,211,238,0.85)";
      ctx.fillRect(x - metrics.width / 2, y + 4, metrics.width, 4);
    }
  });

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  Main export                                                         */
/* ------------------------------------------------------------------ */

export async function generateVideoFromImages(
  urls: string[],
  onProgress?: (p: GenerationProgress) => void,
  /** milliseconds each image is shown (default 2.5 s) */
  msPerImage = 2500,
  /** 9:16 portrait resolution */
  width  = 1080,
  height = 1920,
  /** Optional captions to burn onto frames */
  captions: CaptionSegment[] = [],
  /** Optional audio track from Web Audio API synth */
  audioTrack?: MediaStreamTrack,
): Promise<string> {
  if (urls.length === 0) throw new Error("No images provided");

  return new Promise((resolve, reject) => {
    /* ── Canvas setup ── */
    const canvas = document.createElement("canvas");
    canvas.width  = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) { reject(new Error("Canvas 2D context unavailable")); return; }

    /* ── MediaRecorder setup ── */
    const videoStream = canvas.captureStream(30);

    // Inject audio track if available
    if (audioTrack) {
      videoStream.addTrack(audioTrack);
    }

    const mimeType =
      MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(videoStream, { mimeType, videoBitsPerSecond: 4_000_000 });
    } catch {
      recorder = new MediaRecorder(videoStream);
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType.split(";")[0] });
      resolve(URL.createObjectURL(blob));
    };
    recorder.onerror = (e) => reject(e);

    /* ── Pre-load images ── */
    Promise.all(
      urls.map(
        (url) =>
          new Promise<HTMLImageElement | null>((res) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload  = () => res(img);
            img.onerror = () => res(null);
            img.src = url;
          })
      )
    ).then((rawImages) => {
      const images = rawImages.filter(Boolean) as HTMLImageElement[];
      if (images.length === 0) { reject(new Error("No images loaded")); return; }

      const totalFrames = images.length;
      recorder.start(100);

      let imgIdx  = 0;
      let startMs = performance.now();
      let rafId   = 0;

      const FADE_MS = 450;

      /* ── Per-frame draw ── */
      const drawFrame = (now: number) => {
        const elapsed  = now - startMs;
        const progress = Math.min(elapsed / msPerImage, 1);

        if (imgIdx >= images.length) {
          recorder.stop();
          cancelAnimationFrame(rafId);
          return;
        }

        onProgress?.({
          frame: imgIdx + 1,
          total: totalFrames,
          label: `Compositing frame ${imgIdx + 1} of ${totalFrames}…`,
        });

        const img = images[imgIdx];

        /* ── Cover-fit with Ken Burns zoom ── */
        const zoom = 1 + progress * 0.06;
        const imgR = img.naturalWidth / img.naturalHeight;
        const canR = width / height;
        let dw: number, dh: number, dx: number, dy: number;

        if (imgR > canR) {
          dh = height * zoom;
          dw = dh * imgR;
        } else {
          dw = width * zoom;
          dh = dw / imgR;
        }
        dx = (width  - dw) / 2;
        dy = (height - dh) / 2;

        /* Slow pan alternates per image */
        const panAmt = height * 0.03 * progress;
        if (imgIdx % 2 === 0) { dy -= panAmt; } else { dy += panAmt; }

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#020617";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, dx, dy, dw, dh);

        /* ── Cinematic letterbox gradient ── */
        const topGrad = ctx.createLinearGradient(0, 0, 0, height * 0.3);
        topGrad.addColorStop(0, "rgba(2,6,23,0.75)");
        topGrad.addColorStop(1, "rgba(2,6,23,0)");
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, width, height * 0.3);

        const botGrad = ctx.createLinearGradient(0, height * 0.6, 0, height);
        botGrad.addColorStop(0, "rgba(2,6,23,0)");
        botGrad.addColorStop(1, "rgba(2,6,23,0.9)");
        ctx.fillStyle = botGrad;
        ctx.fillRect(0, height * 0.6, width, height * 0.4);

        /* ── Frame fade-in / fade-out ── */
        const fadeIn  = Math.min(1, elapsed / FADE_MS);
        const fadeOut = elapsed > msPerImage - FADE_MS
          ? Math.max(0, (msPerImage - elapsed) / FADE_MS)
          : 1;
        const blackAlpha = 1 - fadeIn * fadeOut;
        if (blackAlpha > 0) {
          ctx.fillStyle = `rgba(2,6,23,${blackAlpha.toFixed(3)})`;
          ctx.fillRect(0, 0, width, height);
        }

        /* ── Indigo vignette ── */
        const vigGrad = ctx.createRadialGradient(
          width / 2, height / 2, height * 0.3,
          width / 2, height / 2, height * 0.75
        );
        vigGrad.addColorStop(0, "rgba(99,102,241,0)");
        vigGrad.addColorStop(1, "rgba(99,102,241,0.12)");
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, width, height);

        /* ── Captions ── */
        const captionAlpha = Math.min(fadeIn, fadeOut) * 0.95; // fade with frame
        const frameCaptions = captions.filter((c) => c.imageIndex === imgIdx);
        for (const cap of frameCaptions) {
          drawCaption(ctx, cap, width, height, captionAlpha);
        }

        if (progress >= 1) {
          imgIdx++;
          startMs = now;
        }

        rafId = requestAnimationFrame(drawFrame);
      };

      rafId = requestAnimationFrame(drawFrame);
    }).catch(reject);
  });
}
