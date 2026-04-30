import { useRef, useEffect, useCallback, useState } from "react";
import { applyColormap } from "@/lib/colormap";
import { useCTStore } from "@/store/ctStore";
import { Download, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ColormapName } from "@/types";

interface CanvasViewerProps {
  data: Float32Array | null;
  width: number;
  height: number;
  label?: string;
  className?: string;
  colormap?: ColormapName;
  borderColor?: string;
  showControls?: boolean;
  interactive?: boolean;
  flipVertical?: boolean;
  onMouseDown?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

export function CanvasViewer({
  data,
  width,
  height,
  label,
  className = "",
  colormap: colormapOverride,
  borderColor,
  showControls = true,
  interactive = false,
  flipVertical = false,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
}: CanvasViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globalColormap = useCTStore((s) => s.colormap);
  const colormap = colormapOverride ?? globalColormap;
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const imageData = applyColormap(
      data,
      width,
      height,
      colormap,
      flipVertical,
    );
    ctx.putImageData(imageData, 0, 0);
  }, [data, width, height, colormap, flipVertical]);

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${label || "canvas"}.png`;
    a.click();
  }, [label]);

  const borderStyle = borderColor ? { borderColor } : {};

  return (
    <div className={`glass-panel p-3 ${className}`}>
      {label && (
        <div className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">
          {label}
        </div>
      )}
      <div
        className="relative overflow-hidden rounded-md bg-background/50"
        style={borderStyle}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "auto",
            imageRendering: "pixelated",
            transform: `scale(${zoom})`,
            transformOrigin: "center",
            cursor: interactive ? "crosshair" : "default",
          }}
          className={`block ${interactive ? "touch-none" : ""}`}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
        />
        {!data && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            No data
          </div>
        )}
      </div>
      {showControls && data && (
        <div className="flex items-center gap-1 mt-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setZoom((z) => Math.min(z * 1.5, 4))}
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setZoom((z) => Math.max(z / 1.5, 0.5))}
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setZoom(1)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleExport}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
