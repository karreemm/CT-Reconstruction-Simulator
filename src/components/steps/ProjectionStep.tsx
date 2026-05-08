import { useCallback, useState, useRef } from "react";
import { useCTStore } from "@/store/ctStore";
import { CanvasViewer } from "@/components/shared/CanvasViewer";
import { AnimatedProjectionViewer } from "@/components/shared/AnimatedProjectionViewer";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { radonTransformSingleAngle, addGaussianNoise } from "@/lib/radon";
import { buildProjectionAnglesDeg, degToRad } from "@/lib/angles";
import { Play, Square, Info, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { Scan } from "lucide-react";

// Resolves jittery 5ms timers by falling back to rAF for near-zero delays
const sleep = (ms: number): Promise<void> =>
  ms <= 8
    ? new Promise((r) => requestAnimationFrame(() => r()))
    : new Promise((r) => setTimeout(r, ms));

export function ProjectionStep() {
  const {
    phantomData,
    phantomSize,
    numAngles,
    setNumAngles,
    scanAngleRangeDeg,
    setScanAngleRangeDeg,
    numDetectors,
    setNumDetectors,
    useNonUniformAngularSampling,
    setUseNonUniformAngularSampling,
    noiseEnabled,
    setNoiseEnabled,
    noiseSNR,
    setNoiseSNR,
    sinogramData,
    setSinogramData,
    setStepStatus,
    scanProgress,
    setScanProgress,
    setCurrentAngle,
    currentAngle,
    liveSinogramData,
    setLiveSinogramData,
    currentProjection,
    setCurrentProjection,
    setProjectionAnglesDeg,
    animationSpeed,
  } = useCTStore();

  const [isScanning, setIsScanning] = useState(false);

  // cancelRef: signals the loop to stop
  const cancelRef = useRef(false);

  // scanParamsRef: freezes all scan parameters at the moment Scan is pressed.
  // This means scroll-triggered re-renders cannot stale-close or interfere with
  // the running loop — it reads exclusively from this snapshot.
  const scanParamsRef = useRef<{
    numAngles: number;
    numDetectors: number;
    scanAngleRangeDeg: number;
    useNonUniformAngularSampling: boolean;
    noiseEnabled: boolean;
    noiseSNR: number;
    phantomData: Float32Array;
    phantomSize: number;
    animationSpeed: string;
  } | null>(null);

  const runProjection = useCallback(async () => {
    if (!phantomData) return;

    // Freeze all params at scan start — immune to any re-renders during the scan
    scanParamsRef.current = {
      numAngles,
      numDetectors,
      scanAngleRangeDeg,
      useNonUniformAngularSampling,
      noiseEnabled,
      noiseSNR,
      phantomData,
      phantomSize,
      animationSpeed,
    };

    setIsScanning(true);
    cancelRef.current = false;
    setStepStatus(1, "running");

    const {
      numAngles: na,
      numDetectors: nd,
      scanAngleRangeDeg: sar,
      useNonUniformAngularSampling: nuas,
      noiseEnabled: ne,
      noiseSNR: snr,
      phantomData: pd,
      phantomSize: ps,
      animationSpeed: as,
    } = scanParamsRef.current;

    const sinogram = new Float32Array(na * nd);
    const projectionAngles = buildProjectionAnglesDeg(na, sar, nuas);
    setLiveSinogramData(sinogram);

    const delay = as === "fast" ? 0 : as === "medium" ? 20 : 50;

    for (let ai = 0; ai <= na; ai++) {
      if (cancelRef.current) break;

      if (ai < na) {
        const theta = degToRad(projectionAngles[ai]);
        const projection = radonTransformSingleAngle(pd, ps, nd, theta);

        if (ne) {
          addGaussianNoise(projection, snr);
        }

        for (let di = 0; di < nd; di++) {
          sinogram[ai * nd + di] = projection[di];
        }

        setLiveSinogramData(new Float32Array(sinogram));
        setCurrentProjection(projection);
        setCurrentAngle(projectionAngles[ai]);
      } else {
        setCurrentAngle(sar);
      }

      setScanProgress((ai / na) * 100);

      // Use rAF-based sleep for fast mode to avoid jittery setTimeout(0) behaviour
      await sleep(delay);
    }

    if (!cancelRef.current) {
      setSinogramData(sinogram);
      setProjectionAnglesDeg(projectionAngles);
      setStepStatus(1, "done");
      setStepStatus(2, "ready");
    }

    setIsScanning(false);
  }, [
    // Only phantomData as a trigger guard — everything else is snapshotted in the ref
    phantomData,
    numAngles,
    numDetectors,
    scanAngleRangeDeg,
    useNonUniformAngularSampling,
    noiseEnabled,
    noiseSNR,
    phantomSize,
    animationSpeed,
    setSinogramData,
    setStepStatus,
    setScanProgress,
    setCurrentAngle,
    setLiveSinogramData,
    setCurrentProjection,
    setProjectionAnglesDeg,
  ]);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    setIsScanning(false);
    setStepStatus(1, "ready");
  }, [setStepStatus]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <span>
            <Scan className="h-8 w-8" />
          </span>{" "}
          Simulate X-ray Scanning
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure projection parameters and scan the phantom
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="glass-panel p-4 space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Number of Angles</span>
                  <span className="font-mono text-primary">{numAngles}</span>
                </div>
                <Slider
                  value={[numAngles]}
                  onValueChange={([v]) => setNumAngles(v)}
                  min={1}
                  max={720}
                  step={1}
                  disabled={isScanning}
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Angle Range</span>
                  <span className="font-mono text-primary">{scanAngleRangeDeg}°</span>
                </div>
                <Slider
                  value={[scanAngleRangeDeg]}
                  onValueChange={([v]) => setScanAngleRangeDeg(v)}
                  min={1}
                  max={360}
                  step={1}
                  disabled={isScanning}
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Detectors</span>
                  <span className="font-mono text-primary">{numDetectors}</span>
                </div>
                <Slider
                  value={[numDetectors]}
                  onValueChange={([v]) => setNumDetectors(v)}
                  min={64}
                  max={512}
                  step={1}
                  disabled={isScanning}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Non-Uniform Angular Sampling
                </span>
                <Switch
                  checked={useNonUniformAngularSampling}
                  onCheckedChange={setUseNonUniformAngularSampling}
                  disabled={isScanning}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Gaussian Noise
                </span>
                <Switch
                  checked={noiseEnabled}
                  onCheckedChange={setNoiseEnabled}
                  disabled={isScanning}
                />
              </div>

              {noiseEnabled && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">SNR</span>
                    <span className="font-mono text-primary">
                      {noiseSNR} dB
                    </span>
                  </div>
                  <Slider
                    value={[noiseSNR]}
                    onValueChange={([v]) => setNoiseSNR(v)}
                    min={10}
                    max={60}
                    step={1}
                    disabled={isScanning}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {!isScanning ? (
                <Button
                  onClick={runProjection}
                  className="flex-1 gap-1.5"
                  disabled={!phantomData}
                >
                  <Play className="h-4 w-4" /> Scan
                </Button>
              ) : (
                <Button
                  onClick={cancel}
                  variant="destructive"
                  className="flex-1 gap-1.5"
                >
                  <Square className="h-4 w-4" /> Stop
                </Button>
              )}
            </div>

            {isScanning && (
              <div className="space-y-2">
                <Progress value={scanProgress} className="h-2" />
                <div className="text-xs font-mono text-center text-muted-foreground">
                  Scanning angle: {currentAngle.toFixed(1)}°
                </div>
              </div>
            )}
          </div>

          <div>
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
                <Info className="h-4 w-4" />
                <span>How projections work</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="glass-panel p-4 text-sm text-muted-foreground space-y-2">
                  <p>
                    X-rays pass through the object at many angles. At each
                    angle, detectors measure the total attenuation along each
                    ray path.
                  </p>
                  <p className="font-mono text-xs text-primary/80 bg-primary/5 p-2 rounded break-all">
                    p(s,θ) = ∫∫ f(x,y)·δ(x·cosθ + y·sinθ − s) dx dy
                  </p>
                  <p>
                    This is the{" "}
                    <strong className="text-foreground">Radon transform</strong>{" "}
                    — the mathematical foundation of CT.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/*
            contain: "layout paint" — isolates this subtree from scroll-triggered
            repaints in the rest of the page.
            will-change: "transform" — promotes to its own GPU compositing layer
            so scroll events in sibling elements never cause a repaint here.
          */}
          <div
            className="flex flex-col"
            style={{ contain: "layout paint", willChange: "transform" }}
          >
            <AnimatedProjectionViewer
              phantomData={phantomData}
              phantomSize={phantomSize}
              currentProjection={currentProjection}
              numDetectors={numDetectors}
              currentAngleDeg={currentAngle}
            />
          </div>

          <div
            className="flex flex-col"
            style={{ contain: "layout paint", willChange: "transform" }}
          >
            {(isScanning ? liveSinogramData : sinogramData) ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1"
              >
                <CanvasViewer
                  data={
                    (isScanning
                      ? liveSinogramData
                      : sinogramData) as Float32Array
                  }
                  width={numDetectors}
                  height={numAngles}
                  label={isScanning ? "Live Sinogram" : "Generated Sinogram"}
                  showControls={false}
                  flipVertical
                />
              </motion.div>
            ) : (
              <div className="glass-panel flex items-center justify-center text-muted-foreground text-sm min-h-75">
                No sinogram data yet
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}