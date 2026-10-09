/**
 * Utility functions for client-side image optimization and downscaling.
 * Downscales photos so the longest side does not exceed maxDim, preserving
 * aspect ratio and orientation. Never upscales.
 */

export async function scaleImageDataUrl(dataUrl: string, maxDim: number = 960): Promise<string> {
  if (typeof window === "undefined") return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Never upscale
      if (width <= maxDim && height <= maxDim) {
        return resolve(dataUrl);
      }

      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };

    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function scaleImageBlob(blob: Blob, maxDim: number = 960): Promise<Blob> {
  if (typeof window === "undefined") return blob;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Never upscale
      if (width <= maxDim && height <= maxDim && blob.type === "image/jpeg") {
        return resolve(blob);
      }

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(blob);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (scaledBlob) => {
          resolve(scaledBlob || blob);
        },
        "image/jpeg",
        0.9
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };

    img.src = url;
  });
}

export async function scaleImageFile(file: File, maxDim: number = 1280): Promise<File> {
  const scaledBlob = await scaleImageBlob(file, maxDim);
  return new File([scaledBlob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const byteString = atob(parts[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert Blob to Data URL"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const PENDING_FACE_KEY = "snapclass_pending_face";
export const PENDING_FACE_MAX_AGE_MS = 10 * 60 * 1000;

export interface PendingFaceData {
  dataUrl: string;
  savedAt: number;
}

export function savePendingFace(dataUrl: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      PENDING_FACE_KEY,
      JSON.stringify({
        dataUrl,
        savedAt: Date.now(),
      })
    );
  } catch (err) {
    console.warn("Failed to save pending face to sessionStorage:", err);
  }
}

export function getPendingFace(): Blob | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(PENDING_FACE_KEY);
    if (!stored) return null;
    sessionStorage.removeItem(PENDING_FACE_KEY);
    const parsed: PendingFaceData = JSON.parse(stored);
    if (
      parsed &&
      typeof parsed.dataUrl === "string" &&
      typeof parsed.savedAt === "number" &&
      Date.now() - parsed.savedAt < PENDING_FACE_MAX_AGE_MS
    ) {
      return dataUrlToBlob(parsed.dataUrl);
    }
  } catch (err) {
    console.warn("Failed to load pending face from sessionStorage:", err);
    try {
      sessionStorage.removeItem(PENDING_FACE_KEY);
    } catch {}
  }
  return null;
}

export function clearPendingFace(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PENDING_FACE_KEY);
  } catch {}
}

