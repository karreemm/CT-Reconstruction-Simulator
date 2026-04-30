import { create } from "zustand";
import type {
  StepStatus,
  PhantomType,
  ColormapName,
  AnimationSpeed,
  ReconResult,
  FilterType,
} from "@/types";

interface CTStore {
  activeStep: number;
  setActiveStep: (step: number) => void;
  stepStatus: Record<number, StepStatus>;
  setStepStatus: (step: number, status: StepStatus) => void;

  phantomType: PhantomType;
  setPhantomType: (type: PhantomType) => void;
  phantomData: Float32Array | null;
  phantomSize: number;
  setPhantomData: (data: Float32Array, size: number) => void;

  numAngles: number;
  setNumAngles: (n: number) => void;
  scanAngleRangeDeg: number;
  setScanAngleRangeDeg: (deg: number) => void;
  numDetectors: number;
  setNumDetectors: (n: number) => void;
  useNonUniformAngularSampling: boolean;
  setUseNonUniformAngularSampling: (v: boolean) => void;
  noiseEnabled: boolean;
  setNoiseEnabled: (v: boolean) => void;
  noiseSNR: number;
  setNoiseSNR: (v: number) => void;

  sinogramData: Float32Array | null;
  setSinogramData: (data: Float32Array) => void;
  projectionAnglesDeg: Float32Array | null;
  setProjectionAnglesDeg: (data: Float32Array | null) => void;
  liveSinogramData: Float32Array | null;
  setLiveSinogramData: (data: Float32Array | null) => void;
  currentProjection: Float32Array | null;
  setCurrentProjection: (data: Float32Array | null) => void;
  scanProgress: number;
  setScanProgress: (p: number) => void;
  currentAngle: number;
  setCurrentAngle: (a: number) => void;

  reconstructions: Record<string, ReconResult>;
  setReconstruction: (method: string, result: ReconResult) => void;
  clearReconstructions: () => void;

  filterType: FilterType;
  setFilterType: (f: FilterType) => void;
  artIterations: number;
  setArtIterations: (n: number) => void;
  artLambda: number;
  setArtLambda: (l: number) => void;

  sartIterations: number;
  setSartIterations: (n: number) => void;
  sartLambda: number;
  setSartLambda: (l: number) => void;

  animationSpeed: AnimationSpeed;
  setAnimationSpeed: (s: AnimationSpeed) => void;
  colormap: ColormapName;
  setColormap: (c: ColormapName) => void;

  resetAll: () => void;
}

const initialState = {
  activeStep: 0,
  stepStatus: {
    0: "ready" as StepStatus,
    1: "locked" as StepStatus,
    2: "locked" as StepStatus,
    3: "locked" as StepStatus,
    4: "locked" as StepStatus,
  },
  phantomType: "shepp-logan" as PhantomType,
  phantomData: null as Float32Array | null,
  phantomSize: 256,
  numAngles: 180,
  scanAngleRangeDeg: 180,
  numDetectors: 256,
  useNonUniformAngularSampling: false,
  noiseEnabled: false,
  noiseSNR: 40,
  sinogramData: null as Float32Array | null,
  projectionAnglesDeg: null as Float32Array | null,
  liveSinogramData: null as Float32Array | null,
  currentProjection: null as Float32Array | null,
  scanProgress: 0,
  currentAngle: 0,
  reconstructions: {} as Record<string, ReconResult>,
  filterType: "ram-lak" as FilterType,
  artIterations: 10,
  artLambda: 0.5,
  sartIterations: 40,
  sartLambda: 0.5,
  animationSpeed: "fast" as AnimationSpeed,
  colormap: "grayscale" as ColormapName,
};

export const useCTStore = create<CTStore>((set) => ({
  ...initialState,

  setActiveStep: (step) => set({ activeStep: step }),
  setStepStatus: (step, status) =>
    set((s) => ({ stepStatus: { ...s.stepStatus, [step]: status } })),
  setPhantomType: (type) => set({ phantomType: type }),
  setPhantomData: (data, size) => set({ phantomData: data, phantomSize: size }),
  setNumAngles: (n) => set({ numAngles: n }),
  setScanAngleRangeDeg: (deg) => set({ scanAngleRangeDeg: deg }),
  setNumDetectors: (n) => set({ numDetectors: n }),
  setUseNonUniformAngularSampling: (v) =>
    set({ useNonUniformAngularSampling: v }),
  setNoiseEnabled: (v) => set({ noiseEnabled: v }),
  setNoiseSNR: (v) => set({ noiseSNR: v }),
  setSinogramData: (data) => set({ sinogramData: data }),
  setProjectionAnglesDeg: (data) => set({ projectionAnglesDeg: data }),
  setLiveSinogramData: (data) => set({ liveSinogramData: data }),
  setCurrentProjection: (data) => set({ currentProjection: data }),
  setScanProgress: (p) => set({ scanProgress: p }),
  setCurrentAngle: (a) => set({ currentAngle: a }),
  setReconstruction: (method, result) =>
    set((s) => ({
      reconstructions: { ...s.reconstructions, [method]: result },
    })),
  clearReconstructions: () => set({ reconstructions: {} }),
  setFilterType: (f) => set({ filterType: f }),
  setArtIterations: (n) => set({ artIterations: n }),
  setArtLambda: (l) => set({ artLambda: l }),
  setSartIterations: (n) => set({ sartIterations: n }),
  setSartLambda: (l) => set({ sartLambda: l }),
  setAnimationSpeed: (s) => set({ animationSpeed: s }),
  setColormap: (c) => set({ colormap: c }),
  resetAll: () => set(initialState),
}));
