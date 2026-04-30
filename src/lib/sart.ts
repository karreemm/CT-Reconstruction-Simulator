import { getProjectionThetaRad, toProjectorMathTheta } from "./angles";

export function sartReconstruction(
  sinogram: Float32Array,
  numAngles: number,
  numDetectors: number,
  outputSize: number,
  iterations: number = 40,
  lambda: number = 0.5,
  angleRangeDeg: number = 180,
  projectionAnglesDeg?: Float32Array | null,
): Float32Array {
  const recon = new Float32Array(outputSize * outputSize);
  const cx = outputSize / 2,
    cy = outputSize / 2;
  const detHalf = numDetectors / 2;
  const scale = numDetectors / outputSize;

  for (let iter = 0; iter < iterations; iter++) {
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

      // Create accumulation buffers for the current angle
      const correctionBuffer = new Float32Array(outputSize * outputSize);
      const weightBuffer = new Float32Array(outputSize * outputSize);

      for (let di = 0; di < numDetectors; di++) {
        const measured = sinogram[ai * numDetectors + di];
        let projected = 0;
        let rayLen = 0;

        const rayPixels: { idx: number; weight: number }[] = [];

        const s = (di - detHalf + 0.5) / scale;
        for (let t = -cx; t < cx; t += 1) {
          const x = s * cosT - t * sinT + cx;
          const y = s * sinT + t * cosT + cy;
          const xi = Math.floor(x),
            yi = Math.floor(y);
          if (xi >= 0 && xi < outputSize && yi >= 0 && yi < outputSize) {
            const idx = yi * outputSize + xi;
            rayPixels.push({ idx, weight: 1 });
            projected += recon[idx];
            rayLen += 1;
          }
        }

        if (rayLen > 0) {
          // Calculate the raw correction for this specific ray
          const rayCorrection = (measured - projected) / rayLen;

          // Accumulate corrections, DO NOT update recon yet
          for (const { idx, weight } of rayPixels) {
            correctionBuffer[idx] += rayCorrection;
            weightBuffer[idx] += weight * weight; // Track how many rays hit this pixel
          }
        }
      }

      // Apply simultaneous update after all rays in the angle are processed
      for (let i = 0; i < recon.length; i++) {
        // Only update pixels that were actually hit by rays in this angle
        if (weightBuffer[i] > 0) {
          // Average the accumulated corrections and apply the lambda relaxation factor
          recon[i] += lambda * (correctionBuffer[i] / weightBuffer[i]);
        }
      }
    }
  }

  return recon;
}
