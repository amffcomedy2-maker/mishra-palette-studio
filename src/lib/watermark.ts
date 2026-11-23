// Browser-only: draws the site watermark into the bottom-left corner of a photo.

const cache = new Map<string, Promise<Blob>>();

async function loadBitmap(
  blob: Blob,
): Promise<CanvasImageSource & { width: number; height: number }> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(blob);
    } catch {
      /* fall back to <img> */
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return Object.assign(img, { width: img.naturalWidth, height: img.naturalHeight });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

async function render(imageUrl: string, text: string): Promise<Blob> {
  const res = await fetch(imageUrl, { mode: "cors" });
  if (!res.ok) throw new Error(`Image HTTP ${res.status}`);
  const bmp = await loadBitmap(await res.blob());
  const w = bmp.width;
  const h = bmp.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bmp, 0, 0, w, h);

  const size = Math.max(14, Math.round(Math.min(w, h) * 0.045));
  const margin = Math.round(Math.min(w, h) * 0.035);
  ctx.font = `700 ${size}px Inter, "Noto Sans Devanagari", Arial, sans-serif`;
  ctx.textBaseline = "alphabetic";
  const x = margin;
  const y = h - margin;
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(2, size * 0.14);
  ctx.strokeStyle = "rgba(11, 17, 32, 0.75)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.fillText(text, x, y);

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.95));
  if (!blob) throw new Error("Could not create image");
  return blob;
}

/** Watermarked JPEG of the photo; cached so a prepared download is instant. */
export function watermarkedPhoto(imageUrl: string, text: string): Promise<Blob> {
  const key = `${imageUrl}|${text}`;
  let p = cache.get(key);
  if (!p) {
    p = render(imageUrl, text);
    cache.set(key, p);
    p.catch(() => cache.delete(key));
  }
  return p;
}
