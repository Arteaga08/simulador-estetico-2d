"use client";

import { useCallback, useRef } from "react";
import type {
  SelfieSegmentation as SelfieSegmentationType,
  Results,
} from "@mediapipe/selfie_segmentation";

const CDN_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation";

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export function useBackgroundRemoval() {
  const segmenterRef = useRef<SelfieSegmentationType | null>(null);

  const ensureSegmenter = useCallback(async () => {
    if (segmenterRef.current) return segmenterRef.current;
    const mod = await import("@mediapipe/selfie_segmentation");
    const seg = new mod.SelfieSegmentation({
      locateFile: (file) => `${CDN_BASE}/${file}`,
    });
    seg.setOptions({ modelSelection: 1, selfieMode: false });
    await seg.initialize();
    segmenterRef.current = seg;
    return seg;
  }, []);

  const removeBackground = useCallback(
    async (imageUrl: string, bgColor = "#F3F4F6"): Promise<string> => {
      const seg = await ensureSegmenter();
      const img = await loadImage(imageUrl);
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      const result: Results = await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Selfie segmentation timed out")),
          8000,
        );
        seg.onResults((r) => {
          clearTimeout(timeout);
          resolve(r);
        });
        seg.send({ image: img }).catch((err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("2D context unavailable");

      // 1. Solid background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);

      // 2. Draw the mask with a small blur for anti-aliasing, then push grays
      //    to near-binary via high contrast so the hair edges don't leave a
      //    gray fringe when composited onto solid colors (especially black).
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = w;
      maskCanvas.height = h;
      const mctx = maskCanvas.getContext("2d");
      if (!mctx) throw new Error("2D context unavailable for mask");
      mctx.filter = "blur(0.6px) contrast(2.8) brightness(1.05)";
      mctx.drawImage(result.segmentationMask as CanvasImageSource, 0, 0, w, h);
      mctx.filter = "none";

      // Use mask as alpha source for the original image
      const subjectCanvas = document.createElement("canvas");
      subjectCanvas.width = w;
      subjectCanvas.height = h;
      const sctx = subjectCanvas.getContext("2d");
      if (!sctx) throw new Error("2D context unavailable for subject");
      sctx.drawImage(img, 0, 0, w, h);
      sctx.globalCompositeOperation = "destination-in";
      sctx.drawImage(maskCanvas, 0, 0, w, h);
      sctx.globalCompositeOperation = "source-over";

      // 3. Composite subject on top of solid bg
      ctx.drawImage(subjectCanvas, 0, 0, w, h);

      return canvas.toDataURL("image/png");
    },
    [ensureSegmenter],
  );

  return { removeBackground };
}
