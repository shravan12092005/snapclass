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
