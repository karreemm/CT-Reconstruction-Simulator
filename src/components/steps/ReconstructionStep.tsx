import { useCallback, useState, useRef } from 'react';
import { useCTStore } from '@/store/ctStore';
import { CanvasViewer } from '@/components/shared/CanvasViewer';
import { AnimatedReconstructionViewer, type AnimatedReconViewerRef } from '@/components/shared/AnimatedReconstructionViewer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { simpleBackProjection, filteredBackProjection } from '@/lib/backproject';
import { fourierReconstruction } from '@/lib/fft2d';
import { artReconstruction } from '@/lib/art';
import { Play, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import type { FilterType, ReconMethod } from '@/types';
import { Rotate3D } from 'lucide-react';
import { sartReconstruction } from '@/lib/sart';

export function ReconstructionStep() {
  const {
    sinogramData, projectionAnglesDeg, numAngles, numDetectors, phantomSize, scanAngleRangeDeg,
    filterType, setFilterType, artIterations, setArtIterations,
    artLambda, setArtLambda, sartIterations, setSartIterations,
    sartLambda, setSartLambda, setReconstruction, reconstructions,
    setStepStatus,
  } = useCTStore();

  const [activeTab, setActiveTab] = useState<ReconMethod>('bp');
  const [isRunning, setIsRunning] = useState<Record<string, boolean>>({});

  const bpViewerRef = useRef<AnimatedReconViewerRef>(null);
  const fbpViewerRef = useRef<AnimatedReconViewerRef>(null);

  // For BP/FBP: compute immediately (so store is populated) then play animation
  const runAnimated = useCallback(async (method: 'bp' | 'fbp') => {
    if (!sinogramData) return;
    setIsRunning(prev => ({ ...prev, [method]: true }));
    await new Promise(r => setTimeout(r, 50));
    const start = performance.now();
    const data = method === 'bp'
      ? simpleBackProjection(sinogramData, numAngles, numDetectors, phantomSize, scanAngleRangeDeg, projectionAnglesDeg)
      : filteredBackProjection(sinogramData, numAngles, numDetectors, phantomSize, filterType, scanAngleRangeDeg, projectionAnglesDeg);
    const timeMs = performance.now() - start;
    setReconstruction(method, { data, size: phantomSize, timeMs, method });
    setStepStatus(3, 'done');
    setStepStatus(4, 'ready');
    setIsRunning(prev => ({ ...prev, [method]: false }));
    // Play animation separately (visual only)
    if (method === 'bp') bpViewerRef.current?.play();
    else fbpViewerRef.current?.play();
  }, [sinogramData, projectionAnglesDeg, numAngles, numDetectors, phantomSize, filterType, scanAngleRangeDeg,
      setReconstruction, setStepStatus]);

  const runReconstruction = useCallback(async (method: ReconMethod) => {
    if (!sinogramData) return;
    setIsRunning(prev => ({ ...prev, [method]: true }));

    await new Promise(r => setTimeout(r, 50));

    const start = performance.now();
    let data: Float32Array;

    switch (method) {
      case 'bp':
        data = simpleBackProjection(sinogramData, numAngles, numDetectors, phantomSize, scanAngleRangeDeg, projectionAnglesDeg);
        break;
      case 'fbp':
        data = filteredBackProjection(sinogramData, numAngles, numDetectors, phantomSize, filterType, scanAngleRangeDeg, projectionAnglesDeg);
        break;
      case 'fourier':
        data = fourierReconstruction(sinogramData, numAngles, numDetectors, phantomSize, scanAngleRangeDeg, projectionAnglesDeg);
        break;
      case 'art':
        data = artReconstruction(sinogramData, numAngles, numDetectors, phantomSize, artIterations, artLambda, scanAngleRangeDeg, projectionAnglesDeg);
        break;
      case 'sart':
        data = sartReconstruction(sinogramData, numAngles, numDetectors, phantomSize, sartIterations, sartLambda, scanAngleRangeDeg, projectionAnglesDeg);
        break;
      default:
        data = new Float32Array(phantomSize * phantomSize);
    }

    const timeMs = performance.now() - start;

    setReconstruction(method, { data, size: phantomSize, timeMs, method });
    setIsRunning(prev => ({ ...prev, [method]: false }));
    setStepStatus(3, 'done');
    setStepStatus(4, 'ready');
  }, [sinogramData, projectionAnglesDeg, numAngles, numDetectors, phantomSize, filterType, artIterations, artLambda, scanAngleRangeDeg,
      setReconstruction, setStepStatus]);

  const resetMethod = useCallback((method: string) => {
    const store = useCTStore.getState();
    const newRecons = { ...store.reconstructions };
    delete newRecons[method];
    useCTStore.setState({ reconstructions: newRecons });
  }, []);

  const algoStyles: Record<ReconMethod, { border: string; badge: string }> = {
    bp: { border: 'hsl(38, 92%, 50%)', badge: 'bg-algo-bp' },
    fbp: { border: 'hsl(187, 94%, 43%)', badge: 'bg-algo-fbp' },
    fourier: { border: 'hsl(263, 70%, 58%)', badge: 'bg-algo-fourier' },
    art: { border: 'hsl(152, 69%, 43%)', badge: 'bg-algo-art' },
    sart: { border: 'hsl(200, 70%, 50%)', badge: 'bg-algo-sart' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <span>
            <Rotate3D className="h-8 w-8" />
          </span> Reconstruction
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Apply different algorithms to reconstruct the image from projections
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReconMethod)}>
        <TabsList className="grid w-full grid-cols-5 bg-muted/30">
          <TabsTrigger value="bp" className="text-xs gap-1">
            <span className="w-2 h-2 rounded-full bg-algo-bp" /> BP
          </TabsTrigger>
          <TabsTrigger value="fbp" className="text-xs gap-1">
            <span className="w-2 h-2 rounded-full bg-algo-fbp" /> FBP
          </TabsTrigger>
          <TabsTrigger value="fourier" className="text-xs gap-1">
            <span className="w-2 h-2 rounded-full bg-algo-fourier" /> Fourier
          </TabsTrigger>
          <TabsTrigger value="art" className="text-xs gap-1">
            <span className="w-2 h-2 rounded-full bg-algo-art" /> ART
          </TabsTrigger>
          <TabsTrigger value="sart" className="text-xs gap-1">
            <span className="w-2 h-2 rounded-full bg-algo-sart" /> SART
          </TabsTrigger>
        </TabsList>

        {/* BP */}
        <TabsContent value="bp" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="glass-panel p-4 text-sm text-muted-foreground">
                <p>Simple back projection smears each projection back across the image.
                Results in a blurry reconstruction without filtering.</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => runAnimated('bp')} disabled={isRunning.bp || !sinogramData} className="gap-1.5">
                  <Play className="h-4 w-4" /> {isRunning.bp ? 'Running...' : 'Run BP'}
                </Button>
                <Button variant="ghost" onClick={() => resetMethod('bp')} className="gap-1.5">
                  <RotateCcw className="h-4 w-4" /> Reset
                </Button>
              </div>
              {reconstructions.bp && (
                <Badge className={`${algoStyles.bp.badge} text-primary-foreground font-mono`}>
                  {reconstructions.bp.timeMs > 0 ? `${reconstructions.bp.timeMs.toFixed(0)} ms` : 'Generated'}
                </Badge>
              )}
            </div>
            <AnimatedReconstructionViewer
              ref={bpViewerRef}
              sinogram={sinogramData}
              numAngles={numAngles}
              numDetectors={numDetectors}
              phantomSize={phantomSize}
              angleRangeDeg={scanAngleRangeDeg}
              projectionAnglesDeg={projectionAnglesDeg}
              label="Back Projection"
              borderColor={algoStyles.bp.border}
              forceData={reconstructions.bp?.data ?? null}
              onComplete={(data) => {
                setReconstruction('bp', { data, size: phantomSize, timeMs: 0, method: 'bp' });
                setStepStatus(3, 'done');
                setStepStatus(4, 'ready');
              }}
            />
          </div>
        </TabsContent>

        {/* FBP */}
        <TabsContent value="fbp" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="glass-panel p-4 space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground">Filter</span>
                  <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
                    <SelectTrigger className="mt-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ram-lak">Ram-Lak (Ramp)</SelectItem>
                      <SelectItem value="shepp-logan">Shepp-Logan</SelectItem>
                      <SelectItem value="cosine">Cosine</SelectItem>
                      <SelectItem value="hamming">Hamming</SelectItem>
                      <SelectItem value="hann">Hann</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => runAnimated('fbp')} disabled={isRunning.fbp || !sinogramData} className="gap-1.5">
                  <Play className="h-4 w-4" /> {isRunning.fbp ? 'Running...' : 'Run FBP'}
                </Button>
                <Button variant="ghost" onClick={() => resetMethod('fbp')} className="gap-1.5">
                  <RotateCcw className="h-4 w-4" /> Reset
                </Button>
              </div>
              {reconstructions.fbp && (
                <Badge className={`${algoStyles.fbp.badge} text-primary-foreground font-mono`}>
                  {reconstructions.fbp.timeMs > 0 ? `${reconstructions.fbp.timeMs.toFixed(0)} ms` : 'Generated'}
                </Badge>
              )}
            </div>
            <AnimatedReconstructionViewer
              ref={fbpViewerRef}
              sinogram={sinogramData}
              numAngles={numAngles}
              numDetectors={numDetectors}
              phantomSize={phantomSize}
              angleRangeDeg={scanAngleRangeDeg}
              projectionAnglesDeg={projectionAnglesDeg}
              filterType={filterType}
              label="Filtered Back Projection"
              borderColor={algoStyles.fbp.border}
              forceData={reconstructions.fbp?.data ?? null}
              onComplete={(data) => {
                setReconstruction('fbp', { data, size: phantomSize, timeMs: 0, method: 'fbp' });
                setStepStatus(3, 'done');
                setStepStatus(4, 'ready');
              }}
            />
          </div>
        </TabsContent>

        {/* Fourier */}
        <TabsContent value="fourier" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="glass-panel p-4 text-sm text-muted-foreground">
                <p>Uses the Fourier Slice Theorem: the 1D FFT of each projection fills a line
                in 2D frequency space. 2D IFFT gives the reconstruction.</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => runReconstruction('fourier')} disabled={isRunning.fourier || !sinogramData} className="gap-1.5">
                  <Play className="h-4 w-4" /> {isRunning.fourier ? 'Running...' : 'Run Fourier'}
                </Button>
                <Button variant="ghost" onClick={() => resetMethod('fourier')} className="gap-1.5">
                  <RotateCcw className="h-4 w-4" /> Reset
                </Button>
              </div>
              {reconstructions.fourier && (
                <Badge className={`${algoStyles.fourier.badge} text-primary-foreground font-mono`}>
                  {reconstructions.fourier.timeMs.toFixed(0)} ms
                </Badge>
              )}
            </div>
            <CanvasViewer
              data={reconstructions.fourier?.data ?? null}
              width={phantomSize}
              height={phantomSize}
              label="Fourier Reconstruction"
              borderColor={algoStyles.fourier.border}
            />
          </div>
        </TabsContent>

        {/* ART */}
        <TabsContent value="art" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="glass-panel p-4 space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Iterations</span>
                    <span className="font-mono text-primary">{artIterations}</span>
                  </div>
                  <Slider
                    value={[artIterations]}
                    onValueChange={([v]) => setArtIterations(v)}
                    min={1} max={300} step={1}
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Relaxation λ</span>
                    <span className="font-mono text-primary">{artLambda.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[artLambda * 100]}
                    onValueChange={([v]) => setArtLambda(v / 100)}
                    min={10} max={300} step={5}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => runReconstruction('art')} disabled={isRunning.art || !sinogramData} className="gap-1.5">
                  <Play className="h-4 w-4" /> {isRunning.art ? 'Running...' : 'Run ART'}
                </Button>
                <Button variant="ghost" onClick={() => resetMethod('art')} className="gap-1.5">
                  <RotateCcw className="h-4 w-4" /> Reset
                </Button>
              </div>
              {reconstructions.art && (
                <Badge className={`${algoStyles.art.badge} text-primary-foreground font-mono`}>
                  {reconstructions.art.timeMs.toFixed(0)} ms
                </Badge>
              )}
            </div>
            <CanvasViewer
              data={reconstructions.art?.data ?? null}
              width={phantomSize}
              height={phantomSize}
              label="ART Reconstruction"
              borderColor={algoStyles.art.border}
            />
          </div>
        {/* SART */}
        </TabsContent>
        <TabsContent value="sart" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="glass-panel p-4 space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Iterations</span>
                    <span className="font-mono text-primary">{sartIterations}</span>
                  </div>
                  <Slider
                    value={[sartIterations]}
                    onValueChange={([v]) => setSartIterations(v)}
                    min={1} max={200} step={1}
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Relaxation λ</span>
                    <span className="font-mono text-primary">{sartLambda.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[sartLambda * 100]}
                    onValueChange={([v]) => setSartLambda(v / 100)}
                    min={10} max={200} step={5}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => runReconstruction('sart')} disabled={isRunning.sart || !sinogramData} className="gap-1.5">
                  <Play className="h-4 w-4" /> {isRunning.sart ? 'Running...' : 'Run SART'}
                </Button>
                <Button variant="ghost" onClick={() => resetMethod('sart')} className="gap-1.5">
                  <RotateCcw className="h-4 w-4" /> Reset
                </Button>
              </div>
              {reconstructions.sart && (
                <Badge className={`${algoStyles.sart.badge} text-primary-foreground font-mono`}>
                  {reconstructions.sart.timeMs.toFixed(0)} ms
                </Badge>
              )}
            </div>
            <CanvasViewer
              data={reconstructions.sart?.data ?? null}
              width={phantomSize}
              height={phantomSize}
              label="SART Reconstruction"
              borderColor={algoStyles.sart.border}
            />
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
