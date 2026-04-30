import { useCTStore } from "@/store/ctStore";
import { CanvasViewer } from "@/components/shared/CanvasViewer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Info, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { Waves } from "lucide-react";

export function SinogramStep() {
  const { sinogramData, numAngles, numDetectors, scanAngleRangeDeg } = useCTStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <span>
            <Waves className="h-8 w-8" />
          </span>{" "}
          Sinogram
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Visualize the raw projection data ({numAngles} angles × {numDetectors}{" "}
          detectors)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CanvasViewer
          data={sinogramData}
          width={numDetectors}
          height={numAngles}
          label={`Sinogram (${numAngles} × ${numDetectors})`}
          flipVertical
        />

        <div className="space-y-4">
          <div className="glass-panel p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase">
                  Angles (rows)
                </div>
                <div className="font-mono text-lg font-bold text-primary">
                  {numAngles}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase">
                  Detectors (cols)
                </div>
                <div className="font-mono text-lg font-bold text-primary">
                  {numDetectors}
                </div>
              </div>
            </div>
          </div>

          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
              <Info className="h-4 w-4" />
              <span>About sinograms</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="glass-panel p-4 text-sm text-muted-foreground space-y-2">
                <p>
                  Each row of the sinogram is one projection. The sinogram
                  encodes all the information needed to reconstruct the image.
                </p>
                <p>
                  Notice how point sources trace out{" "}
                  <strong className="text-foreground">sinusoidal paths</strong>{" "}
                  — giving the sinogram its name.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => {
            useCTStore.getState().setStepStatus(2, "done");
            useCTStore.getState().setStepStatus(3, "ready");
            useCTStore.getState().setActiveStep(3);
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Continue to Reconstruction →
        </button>
      </div>
    </motion.div>
  );
}
