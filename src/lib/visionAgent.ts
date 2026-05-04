import { MediaItem } from "@/store/orchestrationStore";

interface AnalysisResult {
  blurVariance: number;
  exposureScore: number;
  faceCount: number;
  hash: string;
  finalScore: number;
}

/** 1. Extract 8x8 average hash (aHash) for deduplication */
function getAHash(img: HTMLImageElement): string {
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 8;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(img, 0, 0, 8, 8);
  const data = ctx.getImageData(0, 0, 8, 8).data;
  let sum = 0;
  const grays = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    const g = data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114;
    grays[i] = g;
    sum += g;
  }
  const mean = sum / 64;
  let hash = "";
  for (let i = 0; i < 64; i++) {
    hash += grays[i] >= mean ? "1" : "0";
  }
  return hash;
}

function hammingDistance(h1: string, h2: string): number {
  if (h1.length !== h2.length) return 64;
  let dist = 0;
  for (let i = 0; i < h1.length; i++) {
    if (h1[i] !== h2[i]) dist++;
  }
  return dist;
}

/** 2. Evaluate Exposure (Brightness) */
function getExposureScore(data: Uint8ClampedArray): number {
  let brightness = 0;
  const count = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    brightness += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }
  const meanBrightness = brightness / count;
  // 128 is perfectly exposed. 0 is pitch black, 255 is pure white.
  return 1 - Math.abs(meanBrightness - 128) / 128;
}

/** 3. Evaluate Blur (Laplacian Variance) */
function getLaplacianVariance(data: Uint8ClampedArray, width: number, height: number): number {
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    gray[i] = data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114;
  }

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      // kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0]
      const val =
        gray[i - width] +
        gray[i - 1] -
        4 * gray[i] +
        gray[i + 1] +
        gray[i + width];

      sum += val;
      sumSq += val * val;
      count++;
    }
  }

  const mean = sum / count;
  return sumSq / count - mean * mean;
}

/** Single image full analysis */
async function analyzeImage(url: string): Promise<AnalysisResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      const hash = getAHash(img);

      // Face detection (using browser's experimental FaceDetector if available)
      let faceCount = 0;
      try {
        if ("FaceDetector" in window) {
          // @ts-ignore
          const detector = new window.FaceDetector();
          const faces = await detector.detect(img);
          faceCount = faces.length;
        }
      } catch (e) {
        // Fallback or ignore if not supported/permitted
      }

      // Draw downscaled to fast-process pixel math
      const scale = Math.min(1, 400 / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) {
        return resolve({ blurVariance: 0, exposureScore: 0, faceCount, hash, finalScore: 0 });
      }
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;

      const exposureScore = getExposureScore(data);
      const blurVariance = getLaplacianVariance(data, w, h);

      // Final scoring heuristic:
      // normalizedBlur: typically 0 (very blurry) to 1 (sharp, variance > 1000)
      const normalizedBlur = Math.min(1, blurVariance / 1000);
      
      // Weights: 50% sharp, 30% exposure, 20% faces
      const finalScore = normalizedBlur * 0.5 + exposureScore * 0.3 + (faceCount > 0 ? 0.2 : 0);

      resolve({ blurVariance, exposureScore, faceCount, hash, finalScore });
    };
    img.onerror = () => {
      resolve({ blurVariance: 0, exposureScore: 0, faceCount: 0, hash: "", finalScore: 0 });
    };
    img.src = url;
  });
}

/** Main Entry: Takes user media, scores it, deduplicates, and picks top N */
export async function processMediaOnDevice(
  items: MediaItem[],
  onProgress: (msg: string) => void,
  maxOutput = 30
): Promise<MediaItem[]> {
  const videos = items.filter((i) => i.type === "video");
  const photos = items.filter((i) => i.type === "photo");

  if (photos.length === 0) return items.slice(0, maxOutput);

  // 1. Analyze all photos
  const analyzed = await Promise.all(
    photos.map(async (p, idx) => {
      if (idx % 5 === 0) {
        onProgress(`Scoring quality & faces... ${Math.round((idx / photos.length) * 100)}%`);
      }
      const res = await analyzeImage(p.url);
      return { item: p, ...res };
    })
  );

  onProgress("Clustering & removing duplicates...");
  
  // 2. Deduplication (Group by aHash distance <= 10)
  const uniqueGroups: (typeof analyzed)[] = [];
  for (const a of analyzed) {
    let foundGroup = false;
    for (const group of uniqueGroups) {
      const rep = group[0]; // Compare against the cluster representative
      if (hammingDistance(a.hash, rep.hash) <= 10) {
        group.push(a);
        foundGroup = true;
        break;
      }
    }
    if (!foundGroup) uniqueGroups.push([a]);
  }

  // Pick the absolute best (highest finalScore) from each identical cluster
  const deduplicated = uniqueGroups.map((group) => {
    group.sort((a, b) => b.finalScore - a.finalScore);
    return group[0];
  });

  onProgress("Ranking best moments...");
  
  // 3. Select top N based on quality score
  deduplicated.sort((a, b) => b.finalScore - a.finalScore);
  
  const maxPhotos = Math.max(0, maxOutput - videos.length);
  const bestPhotos = deduplicated.slice(0, maxPhotos);

  // 4. Restore original chronological/user-selection order
  const originalIndexMap = new Map(items.map((it, idx) => [it.id, idx]));
  const finalItems = [...bestPhotos.map((p) => p.item), ...videos];
  finalItems.sort((a, b) => (originalIndexMap.get(a.id) || 0) - (originalIndexMap.get(b.id) || 0));

  return finalItems;
}
