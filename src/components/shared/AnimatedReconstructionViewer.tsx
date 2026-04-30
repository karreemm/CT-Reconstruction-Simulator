import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { applyColormap } from '@/lib/colormap';
import { useCTStore } from '@/store/ctStore';
import { backProjectionGenerator } from '@/lib/backproject';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { FilterType } from '@/types';

interface AnimatedReconstructionViewerProps {
  sinogram: Float32Array | null;
  numAngles: number;
  numDetectors: number;
  phantomSize: number;
  angleRangeDeg?: number;
  projectionAnglesDeg?: Float32Array | null;
  filterType?: FilterType; 
  label?: string;
  borderColor?: string;
  forceData?: Float32Array | null;
  onComplete?: (data: Float32Array) => void;
}

export interface AnimatedReconViewerRef {
  play: () => void;
  pause: () => void;
  reset: () => void;
  skipToEnd: () => void;
}

export const AnimatedReconstructionViewer = forwardRef<AnimatedReconViewerRef, AnimatedReconstructionViewerProps>(({
  sinogram,
  numAngles,
  numDetectors,
  phantomSize,
  angleRangeDeg = 180,
  projectionAnglesDeg,
  filterType,
  label,
  borderColor,
  forceData,
  onComplete
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globalColormap = useCTStore((s) => s.colormap);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [speed, setSpeed] = useState(0.1);
  const generatorRef = useRef<ReturnType<typeof backProjectionGenerator> | null>(null);
  const requestRef = useRef<number>();
  // Use a ref for forceData so changes don't trigger the reset effect and kill an animation
  const forceDataRef = useRef<Float32Array | null | undefined>(forceData);
  forceDataRef.current = forceData;
  
  const [currentRecon, setCurrentRecon] = useState<Float32Array | null>(null);
  const [currentAngle, setCurrentAngle] = useState(0);

  useImperativeHandle(ref, () => ({
    play: () => {
      // Always start fresh from beginning (ignore forceData for animation)
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      setStep(0);
      setCurrentRecon(sinogram ? new Float32Array(phantomSize * phantomSize) : null);
      setCurrentAngle(0);
      if (sinogram) {
        generatorRef.current = backProjectionGenerator(sinogram, numAngles, numDetectors, phantomSize, filterType, angleRangeDeg, projectionAnglesDeg);
      }
      setIsPlaying(true);
    },
    pause: () => setIsPlaying(false),
    reset: () => reset(),
    skipToEnd: () => skipToEnd()
  }));
  
  const reset = useCallback(() => {
    setIsPlaying(false);
    setStep(0);
    // Use the ref so forceData changes don't recreate this callback
    setCurrentRecon(forceDataRef.current || (sinogram ? new Float32Array(phantomSize * phantomSize) : null));
    setCurrentAngle(0);
    if (sinogram) {
      generatorRef.current = backProjectionGenerator(sinogram, numAngles, numDetectors, phantomSize, filterType, angleRangeDeg, projectionAnglesDeg);
    }
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  }, [sinogram, numAngles, numDetectors, phantomSize, filterType, angleRangeDeg, projectionAnglesDeg]); // forceData intentionally via refrceData intentionally via ref

  useEffect(() => {
    reset();
  }, [reset]);

  const animate = useCallback(() => {
    if (!generatorRef.current) return;
    
    let result = null;
    let sTime = performance.now();
    
    for (let i = 0; i < speed; i++) {
        result = generatorRef.current.next();
        if (result.done || performance.now() - sTime > 16) break;
    }
    
    if (result && !result.done) {
      setCurrentRecon(result.value.recon);
      setCurrentAngle(result.value.currentAngle);
      setStep(result.value.step + 1);
      
      if (isPlaying) {
        requestRef.current = requestAnimationFrame(animate);
      }
    } else if (result && result.done) {
      setIsPlaying(false);
      setStep(numAngles);
      if (onComplete && result.value) {
        onComplete(result.value.recon);
      }
    }
  }, [isPlaying, speed, onComplete, numAngles]);

  useEffect(() => {
    if (isPlaying && step < numAngles) {
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, animate, step, numAngles]);

  const skipToEnd = () => {
    if (!generatorRef.current) return;
    setIsPlaying(false);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
    let result = generatorRef.current.next();
    let lastVal = result.value;
    while (!result.done) {
        lastVal = result.value;
        result = generatorRef.current.next();
    }
    
    if (lastVal) {
        setCurrentRecon(lastVal.recon);
        setCurrentAngle(lastVal.currentAngle);
        setStep(numAngles);
        if (onComplete) onComplete(lastVal.recon);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentRecon) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = phantomSize;
    canvas.height = phantomSize;
    
    const imageData = applyColormap(currentRecon, phantomSize, phantomSize, globalColormap);
    ctx.putImageData(imageData, 0, 0);

    if (step > 0 && step < numAngles && isPlaying) {
        ctx.save();
        const cx = phantomSize / 2;
        const cy = phantomSize / 2;
        ctx.translate(cx, cy);
        
        ctx.rotate((currentAngle) * Math.PI / 180);
        
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)'; 
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -phantomSize);
        ctx.lineTo(0, phantomSize);
        ctx.stroke();
        
        ctx.restore();
    }
  }, [currentRecon, phantomSize, globalColormap, currentAngle, step, numAngles, forceData]);

  const borderStyle = borderColor ? { borderColor } : {};

  return (
    <div className="glass-panel p-3">
      {label && (
        <div className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider flex justify-between">
            <span>{label}</span>
            {sinogram && <span className="text-primary">{Math.min(step, numAngles)} / {numAngles}</span>}
        </div>
      )}
      <div className="relative overflow-hidden rounded-md bg-background/50 border border-transparent" style={borderStyle}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: 'auto', imageRendering: 'pixelated', transformOrigin: 'center' }}
          className="block aspect-square w-full"
        />
        {!currentRecon && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            No data
          </div>
        )}
      </div>
      
      {sinogram && (
        <div className="flex items-center gap-2 mt-3 p-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => {
              if (step >= numAngles) {
                // Replay from start
                if (requestRef.current) cancelAnimationFrame(requestRef.current);
                setStep(0);
                setCurrentRecon(sinogram ? new Float32Array(phantomSize * phantomSize) : null);
                setCurrentAngle(0);
                if (sinogram) {
                  generatorRef.current = backProjectionGenerator(sinogram, numAngles, numDetectors, phantomSize, filterType, angleRangeDeg, projectionAnglesDeg);
                }
                setIsPlaying(true);
              } else {
                setIsPlaying(!isPlaying);
              }
            }}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={skipToEnd} disabled={step >= numAngles}>
             <FastForward className="h-4 w-4" />
          </Button>

          <div className="flex-1 flex items-center justify-end gap-2 px-1">
              <span className="text-[10px] text-muted-foreground uppercase opacity-70">Speed</span>
              <Slider
                value={[speed]}
                onValueChange={([v]) => setSpeed(v)}
                min={1} max={10} step={1}
                className="w-20"
              />
          </div>
        </div>
      )}
    </div>
  );
});
