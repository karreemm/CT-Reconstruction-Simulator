import { useCallback, useRef, useState } from "react";
import { useCTStore } from "@/store/ctStore";
import { CanvasViewer } from "@/components/shared/CanvasViewer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  generateSheppLogan,
  generateGeometric,
  generateResolution,
  createBlankCanvas,
} from "@/lib/phantoms";
import {
  ChevronDown,
  Paintbrush,
  Eraser,
  Trash2,
  Undo2,
  Info,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import type { PhantomType } from "@/types";
import { Box } from "lucide-react";

export function PhantomStep() {
  const {
    phantomType,
    setPhantomType,
    phantomData,
    phantomSize,
    setPhantomData,
    setStepStatus,
  } = useCTStore();

  const [brushSize, setBrushSize] = useState(10);
  const [isEraser, setIsEraser] = useState(false);
  const customData = useRef<Float32Array>(createBlankCanvas(256));
  const historyRef = useRef<Float32Array[]>([]);
  const isDrawing = useRef(false);

  const generatePhantom = useCallback(
    (type: PhantomType) => {
      setPhantomType(type);
      let data: Float32Array;
      switch (type) {
        case "shepp-logan":
          data = generateSheppLogan(256);
          break;
        case "geometric":
          data = generateGeometric(256);
          break;
        case "resolution":
          data = generateResolution(256);
          break;
        case "custom":
          data = new Float32Array(customData.current);
          break;
      }
      setPhantomData(data, 256);
      setStepStatus(0, "done");
      setStepStatus(1, "ready");
    },
    [setPhantomType, setPhantomData, setStepStatus],
  );

  const handleDraw = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return;
      e.preventDefault();
      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const scaleX = 256 / rect.width;
      const scaleY = 256 / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);
      const val = isEraser ? 0 : 1;
      const r = brushSize;

      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy <= r * r) {
            const px = x + dx,
              py = y + dy;
            if (px >= 0 && px < 256 && py >= 0 && py < 256) {
              customData.current[py * 256 + px] = val;
            }
          }
        }
      }
      setPhantomData(new Float32Array(customData.current), 256);
    },
    [brushSize, isEraser, setPhantomData],
  );

  const startDraw = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      historyRef.current.push(new Float32Array(customData.current));
      if (historyRef.current.length > 20) historyRef.current.shift();
      isDrawing.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      handleDraw(e);
    },
    [handleDraw],
  );

  const stopDraw = useCallback(
    (e?: React.PointerEvent<HTMLCanvasElement>) => {
      if (e?.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      isDrawing.current = false;
      setStepStatus(0, "done");
      setStepStatus(1, "ready");
    },
    [setStepStatus],
  );

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (prev) {
      customData.current = prev;
      setPhantomData(new Float32Array(prev), 256);
    }
  }, [setPhantomData]);

  const clearCustom = useCallback(() => {
    customData.current = createBlankCanvas(256);
    setPhantomData(new Float32Array(customData.current), 256);
  }, [setPhantomData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <span>
            <Box className="h-8 w-8" />
          </span>{" "}
          Define the Phantom
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose or draw the object to be scanned
        </p>
      </div>

      <Tabs
        value={phantomType}
        onValueChange={(v) => generatePhantom(v as PhantomType)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4 bg-muted/30">
          <TabsTrigger value="shepp-logan" className="text-xs">
            Shepp-Logan
          </TabsTrigger>
          <TabsTrigger value="geometric" className="text-xs">
            Geometric
          </TabsTrigger>
          <TabsTrigger value="resolution" className="text-xs">
            Resolution
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-xs">
            Custom Draw
          </TabsTrigger>
        </TabsList>

        <TabsContent value="custom" className="mt-4">
          <div className="glass-panel p-4 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Paintbrush className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Brush: {brushSize}px
                </span>
                <Slider
                  value={[brushSize]}
                  onValueChange={([v]) => setBrushSize(v)}
                  min={1}
                  max={30}
                  step={1}
                  className="w-24"
                />
              </div>
              <div className="flex items-center gap-2">
                <Eraser className="h-4 w-4 text-muted-foreground" />
                <Switch checked={isEraser} onCheckedChange={setIsEraser} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={undo}
                className="text-xs gap-1"
              >
                <Undo2 className="h-3.5 w-3.5" /> Undo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCustom}
                className="text-xs gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CanvasViewer
          data={phantomData}
          width={phantomSize}
          height={phantomSize}
          label="Phantom Image"
          interactive={phantomType === "custom"}
          onPointerDown={phantomType === "custom" ? startDraw : undefined}
          onPointerMove={phantomType === "custom" ? handleDraw : undefined}
          onPointerUp={phantomType === "custom" ? stopDraw : undefined}
          onPointerCancel={phantomType === "custom" ? stopDraw : undefined}
        />

        <div className="space-y-4">
          {!phantomData && (
            <div className="glass-panel p-6 text-center">
              <p className="text-muted-foreground text-sm">
                Select a phantom type above to generate
              </p>
              <Button
                className="mt-3"
                onClick={() => generatePhantom("shepp-logan")}
              >
                Generate Shepp-Logan
              </Button>
            </div>
          )}

          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
              <Info className="h-4 w-4" />
              <span>What is a phantom?</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="glass-panel p-4 text-sm text-muted-foreground space-y-2">
                <p>
                  In a real CT scanner, the "phantom" is a patient's
                  cross-section. Each pixel value represents tissue density
                  measured in{" "}
                  <strong className="text-foreground">
                    Hounsfield Units (HU)
                  </strong>
                  .
                </p>
                <p className="font-mono text-xs text-primary/80 bg-primary/5 p-2 rounded">
                  μ(x,y) = linear attenuation coefficient
                </p>
                <p>
                  Air = −1000 HU, Water = 0 HU, Bone = +1000 HU. The Shepp-Logan
                  phantom is the standard test image for CT algorithms,
                  consisting of 10 overlapping ellipses.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </motion.div>
  );
}
