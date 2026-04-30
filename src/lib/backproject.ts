import type { FilterType } from "@/types";
import { createFilter, applyFilter1D } from "./filters";
import { getProjectionThetaRad, toProjectorMathTheta } from "./angles";

export function simpleBackProjection(
  sinogram: Float32Array,
  numAngles: number,
  numDetectors: number,
  outputSize: number,
  angleRangeDeg: number = 180,
  projectionAnglesDeg?: Float32Array | null,
): Float32Array {
  const recon = new Float32Array(outputSize * outputSize);
  const cx = outputSize / 2,
    cy = outputSize / 2;
  const detHalf = numDetectors / 2;
  const scale = numDetectors / outputSize;
  const angleRangeRad = (angleRangeDeg * Math.PI) / 180;

  for (let ai = 0; ai < numAngles; ai++) {
    const theta = getProjectionThetaRad(
      ai,
      numAngles,
      angleRangeDeg,
      
      projectionAnglesDeg,
    );
    const mathTheta = toProjectorMathTheta(theta);
    const cosT = Math.cos(mathTheta);
    const sinT = Math.sin(mathTheta);

    for (let j = 0; j < outputSize; j++) {
      for (let i = 0; i < outputSize; i++) {
        const x = i - cx;
        const y = j - cy;
        const s = x * cosT + y * sinT;
        const di = s * scale + detHalf - 0.5;

        if (di >= 0 && di < numDetectors - 1) {
          const d0 = Math.floor(di);
          const frac = di - d0;
          const idx = ai * numDetectors;
          recon[j * outputSize + i] +=
            sinogram[idx + d0] * (1 - frac) + sinogram[idx + d0 + 1] * frac;
        }
      }
    }
  }

  const factor = angleRangeRad / numAngles;
  for (let i = 0; i < recon.length; i++) recon[i] *= factor;

  return recon;
}

export function filteredBackProjection(
  sinogram: Float32Array,
  numAngles: number,
  numDetectors: number,
  outputSize: number,
  filterType: FilterType = "ram-lak",
  angleRangeDeg: number = 180,
  projectionAnglesDeg?: Float32Array | null,
): Float32Array {
  const filter = createFilter(numDetectors, filterType);
  const filteredSinogram = new Float32Array(sinogram.length);

  for (let ai = 0; ai < numAngles; ai++) {
    const projection = sinogram.slice(
      ai * numDetectors,
      (ai + 1) * numDetectors,
    );
    const filtered = applyFilter1D(projection, filter);
    filteredSinogram.set(filtered, ai * numDetectors);
  }

  return simpleBackProjection(
    filteredSinogram,
    numAngles,
    numDetectors,
    outputSize,
    angleRangeDeg,
    projectionAnglesDeg,
  );
}

export function* backProjectionGenerator(
  sinogram: Float32Array,
  numAngles: number,
  numDetectors: number,
  outputSize: number,
  filterType?: FilterType,
  angleRangeDeg: number = 180,
  projectionAnglesDeg?: Float32Array | null,
): Generator<{
  recon: Float32Array;
  currentAngle: number;
  currentProjection: Float32Array;
  step: number;
}> {
  const recon = new Float32Array(outputSize * outputSize);
  const cx = outputSize / 2,
    cy = outputSize / 2;
  const detHalf = numDetectors / 2;
  const scale = numDetectors / outputSize;

  let processingSinogram = sinogram;
  if (filterType) {
    const filter = createFilter(numDetectors, filterType);
    processingSinogram = new Float32Array(sinogram.length);
    for (let ai = 0; ai < numAngles; ai++) {
      const projection = sinogram.slice(
        ai * numDetectors,
        (ai + 1) * numDetectors,
      );
      const filtered = applyFilter1D(projection, filter);
      processingSinogram.set(filtered, ai * numDetectors);
    }
  }

  const angleRangeRad = (angleRangeDeg * Math.PI) / 180;
  const factor = angleRangeRad / numAngles;

  for (let ai = 0; ai < numAngles; ai++) {
    const theta = getProjectionThetaRad(
      ai,
      numAngles,
      angleRangeDeg,
      projectionAnglesDeg,
    );
    const mathTheta = toProjectorMathTheta(theta);
    const cosT = Math.cos(mathTheta);
    const sinT = Math.sin(mathTheta);

    const currentProjection = processingSinogram.slice(
      ai * numDetectors,
      (ai + 1) * numDetectors,
    );

    for (let j = 0; j < outputSize; j++) {
      for (let i = 0; i < outputSize; i++) {
        const x = i - cx;
        const y = j - cy;
        const s = x * cosT + y * sinT;
        const di = s * scale + detHalf - 0.5;

        if (di >= 0 && di < numDetectors - 1) {
          const d0 = Math.floor(di);
          const frac = di - d0;
          const val =
            currentProjection[d0] * (1 - frac) +
            currentProjection[d0 + 1] * frac;
          recon[j * outputSize + i] += val * factor;
        }
      }
    }

    yield {
      recon: new Float32Array(recon),
      currentAngle: (theta * 180) / Math.PI,
      currentProjection,
      step: ai,
    };
  }

  return {
    recon: new Float32Array(recon),
    currentAngle:
      projectionAnglesDeg && projectionAnglesDeg.length > 0
        ? projectionAnglesDeg[projectionAnglesDeg.length - 1]
        : angleRangeDeg,
    currentProjection: new Float32Array(),
    step: numAngles,
  };
}
