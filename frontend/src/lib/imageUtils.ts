/**
 * Utility functions for client-side image optimization and downscaling.
 * Downscales photos so the longest side does not exceed maxDim, preserving
 * aspect ratio and orientation. Never upscales.
 */

export async function scaleImageDataUrl(dataUrl: string, maxDim: number = 960): Promise<string> {
  if (typeof window === "undefined") return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;

    const cleanupAndResolve = (result: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      cleanupAndResolve(dataUrl);
    }, 5000);

    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Never upscale
      if (width <= maxDim && height <= maxDim) {
        return cleanupAndResolve(dataUrl);
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
      if (!ctx) return cleanupAndResolve(dataUrl);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      cleanupAndResolve(canvas.toDataURL("image/jpeg", 0.9));
    };

    img.onerror = () => cleanupAndResolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function scaleImageBlob(blob: Blob, maxDim: number = 960): Promise<Blob> {
  if (typeof window === "undefined") return blob;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    let settled = false;

    const cleanupAndResolve = (result: Blob) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        URL.revokeObjectURL(url);
      } catch {}
      resolve(result);
    };

    // Safari safety timeout: resolve unscaled blob if image decode hangs
    const timer = setTimeout(() => {
      cleanupAndResolve(blob);
    }, 5000);

    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Never upscale
      if (width <= maxDim && height <= maxDim && blob.type === "image/jpeg") {
        return cleanupAndResolve(blob);
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
      if (!ctx) return cleanupAndResolve(blob);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Safari-safe conversion: toDataURL is 100% synchronous and avoids WebKit toBlob null drops
      try {
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        cleanupAndResolve(dataUrlToBlob(dataUrl));
      } catch {
        canvas.toBlob(
          (scaledBlob) => {
            cleanupAndResolve(scaledBlob || blob);
          },
          "image/jpeg",
          0.9
        );
      }
    };

    img.onerror = () => {
      cleanupAndResolve(blob);
    };

    img.src = url;
  });
}

export async function scaleImageFile(file: File | Blob, maxDim: number = 1280): Promise<File | Blob> {
  const scaledBlob = await scaleImageBlob(file, maxDim);
  const origName = (file as File).name || `classroom_photo_${Date.now()}.jpg`;
  const newName = origName.replace(/\.[^/.]+$/, ".jpg");
  try {
    return new File([scaledBlob], newName, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    // Safari fallback if new File() is restricted
    (scaledBlob as any).name = newName;
    return scaledBlob;
  }
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

