/**
 * imageCompressor.ts
 * -------------------
 * Client-side image compression using Canvas API.
 * Resizes images to max 1200px on the longer side and encodes as JPEG @ 80%.
 * Target: each photo ≤ ~300 KB, total 5 MB budget across all uploads.
 */

export const TOTAL_SIZE_LIMIT = 5 * 1024 * 1024; // 5 MB in bytes
export const PER_FILE_SIZE_LIMIT = 2 * 1024 * 1024; // 2 MB per photo
const MAX_DIMENSION = 1200; // px
const JPEG_QUALITY  = 0.80;

/**
 * Compress a single image File to a JPEG Blob.
 * Videos are returned as-is (no compression).
 */
export async function compressImage(file: File): Promise<File> {
  // Only compress images, not videos
  if (!file.type.startsWith("image/")) return file;

  return new Promise<File>((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Scale down if needed
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width  = Math.round(width  * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas unavailable")); return; }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Compression failed")); return; }
          // Keep original name, change type to jpeg
          const compressed = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, ".jpg"),
            { type: "image/jpeg", lastModified: Date.now() }
          );
          resolve(compressed);
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error(`Failed to load ${file.name}`)); };
    img.src = objectUrl;
  });
}

/**
 * Compress all image files in a list.
 * Returns an array of (possibly compressed) Files.
 */
export async function compressAll(files: File[]): Promise<File[]> {
  return Promise.all(files.map(compressImage));
}
