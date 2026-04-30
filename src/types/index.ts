export type StepStatus = 'locked' | 'ready' | 'running' | 'done';
export type PhantomType = 'shepp-logan' | 'geometric' | 'resolution' | 'custom';
export type ColormapName = 'grayscale' | 'hot' | 'viridis' | 'jet' | 'plasma';
export type AnimationSpeed = 'slow' | 'medium' | 'fast' | 'instant';
export type FilterType = 'ram-lak' | 'shepp-logan' | 'cosine' | 'hamming' | 'hann';
export type ReconMethod = 'bp' | 'fbp' | 'fourier' | 'art' | 'sart';

export interface ReconResult {
  data: Float32Array;
  size: number;
  timeMs: number;
  method: ReconMethod;
}

export interface Metrics {
  rmse: number;
  psnr: number;
  ssim: number;
  snr: number;
}

export const ALGO_COLORS: Record<ReconMethod, string> = {
  bp: 'hsl(38, 92%, 50%)',
  fbp: 'hsl(187, 94%, 43%)',
  fourier: 'hsl(263, 70%, 58%)',
  art: 'hsl(152, 69%, 43%)',
  sart: 'hsl(200, 70%, 50%)',
};

export const ALGO_NAMES: Record<ReconMethod, string> = {
  bp: 'Back Projection',
  fbp: 'Filtered Back Projection',
  fourier: 'Fourier Method',
  art: 'ART',
  sart: 'SART',
};

export const ALGO_CSS: Record<ReconMethod, string> = {
  bp: 'algo-bp',
  fbp: 'algo-fbp',
  fourier: 'algo-fourier',
  art: 'algo-art',
  sart: 'algo-sart',
};
