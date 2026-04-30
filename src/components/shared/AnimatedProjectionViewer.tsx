import { useRef, useEffect } from "react";
import { applyColormap } from "@/lib/colormap";
import { useCTStore } from "@/store/ctStore";
import type { ColormapName } from "@/types";

interface AnimatedProjectionViewerProps {
  phantomData: Float32Array | null;
  phantomSize: number;
  currentProjection: Float32Array | null;
  numDetectors: number;
  currentAngleDeg: number;
  colormap?: ColormapName;
}

export function AnimatedProjectionViewer({
  phantomData,
  phantomSize,
  currentProjection,
  numDetectors,
  currentAngleDeg,
  colormap: colormapOverride,
}: AnimatedProjectionViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globalColormap = useCTStore((s) => s.colormap);
  const colormap = colormapOverride ?? globalColormap;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = phantomSize;
    const padding = 60;
    const totalSize = size + padding * 2;

    canvas.width = totalSize;
    canvas.height = totalSize;

    ctx.fillStyle =
      getComputedStyle(document.body).getPropertyValue("--background").trim() ||
      "#000";
    ctx.fillRect(0, 0, totalSize, totalSize);

    const cx = totalSize / 2;
    const cy = totalSize / 2;

    if (phantomData) {
      const phantomCanvas = document.createElement("canvas");
      phantomCanvas.width = phantomSize;
      phantomCanvas.height = phantomSize;
      const pCtx = phantomCanvas.getContext("2d");
      if (pCtx) {
        const imageData = applyColormap(
          phantomData,
          phantomSize,
          phantomSize,
          colormap,
        );
        pCtx.putImageData(imageData, 0, 0);

        ctx.drawImage(
          phantomCanvas,
          cx - phantomSize / 2,
          cy - phantomSize / 2,
        );
      }
    }

    ctx.save();

    ctx.translate(cx, cy);
    ctx.rotate(((currentAngleDeg - 90) * Math.PI) / 180);
    ctx.translate(-cx, -cy);

    const sourceY = padding / 2;
    const detectorY = totalSize - padding / 2;

    ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();

    const raySteps = Math.max(1, Math.floor(numDetectors / 5));
    const scale = phantomSize / numDetectors;
    const detHalf = numDetectors / 2;

    for (let di = 0; di < numDetectors; di += raySteps) {
      const s = Math.round((di - detHalf + 0.5) * scale);
      ctx.moveTo(cx + s, sourceY);
      ctx.lineTo(cx + s, detectorY);
    }
    ctx.stroke();

    ctx.strokeStyle = "rgba(56, 189, 248, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - phantomSize / 2, sourceY);
    ctx.lineTo(cx + phantomSize / 2, sourceY);
    ctx.stroke();

    ctx.strokeStyle = "rgba(234, 179, 8, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - phantomSize / 2, detectorY);
    ctx.lineTo(cx + phantomSize / 2, detectorY);
    ctx.stroke();

    if (currentProjection) {
      ctx.fillStyle = "rgba(234, 179, 8, 0.8)";

      const assumedMax = phantomSize * 0.8;
      const profileHeight = padding * 1.5;

      ctx.beginPath();
      ctx.moveTo(Math.round(cx - phantomSize / 2), detectorY);

      for (let di = 0; di < numDetectors; di++) {
        const s = Math.round((di - detHalf + 0.5) * scale);
        const val = currentProjection[di] || 0;
        const yOffset = (val / assumedMax) * profileHeight;
        ctx.lineTo(cx + s, detectorY + Math.min(yOffset, profileHeight));
      }

      ctx.lineTo(Math.round(cx + phantomSize / 2), detectorY);
      ctx.fill();
    }

    ctx.restore();
  }, [
    phantomData,
    phantomSize,
    currentProjection,
    numDetectors,
    currentAngleDeg,
    colormap,
  ]);

  return (
    <div className="glass-panel p-3">
      <div className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">
        Animated Projection Viewer
      </div>
      <div className="relative overflow-hidden rounded-md bg-black w-full flex items-center justify-center aspect-square">
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
          }}
          className="block"
        />
      </div>
    </div>
  );
}
