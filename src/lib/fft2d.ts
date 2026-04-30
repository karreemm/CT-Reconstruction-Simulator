import { getProjectionThetaRad, toProjectorMathTheta } from "./angles";

export function fft1d(
  real: Float32Array,
  imag: Float32Array,
  n: number,
  inverse: boolean = false,
): void {
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  const dir = inverse ? -1 : 1;
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (dir * 2 * Math.PI) / len;
    const wR = Math.cos(angle),
      wI = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let tR = 1,
        tI = 0;
      for (let k = 0; k < halfLen; k++) {
        const idx1 = i + k,
          idx2 = i + k + halfLen;
        const uR = real[idx1],
          uI = imag[idx1];
        const vR = real[idx2] * tR - imag[idx2] * tI;
        const vI = real[idx2] * tI + imag[idx2] * tR;
        real[idx1] = uR + vR;
        imag[idx1] = uI + vI;
        real[idx2] = uR - vR;
        imag[idx2] = uI - vI;
        const newTR = tR * wR - tI * wI;
        tI = tR * wI + tI * wR;
        tR = newTR;
      }
    }
  }

  if (inverse) {
    for (let i = 0; i < n; i++) {
      real[i] /= n;
      imag[i] /= n;
    }
  }
}

export function fft2d(
  real: Float32Array,
  imag: Float32Array,
  size: number,
  inverse: boolean = false,
): void {
  const rowR = new Float32Array(size);
  const rowI = new Float32Array(size);

  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      rowR[i] = real[j * size + i];
      rowI[i] = imag[j * size + i];
    }
    fft1d(rowR, rowI, size, inverse);
    for (let i = 0; i < size; i++) {
      real[j * size + i] = rowR[i];
      imag[j * size + i] = rowI[i];
    }
  }

  const colR = new Float32Array(size);
  const colI = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      colR[j] = real[j * size + i];
      colI[j] = imag[j * size + i];
    }
    fft1d(colR, colI, size, inverse);
    for (let j = 0; j < size; j++) {
      real[j * size + i] = colR[j];
      imag[j * size + i] = colI[j];
    }
  }
}

export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

export function fourierReconstruction(
  sinogram: Float32Array,
  numAngles: number,
  numDetectors: number,
  outputSize: number,
  angleRangeDeg: number = 180,
  projectionAnglesDeg?: Float32Array | null,
): Float32Array {
  const fftSize = nextPow2(Math.max(numDetectors, outputSize));
  const freqReal = new Float32Array(fftSize * fftSize);
  const freqImag = new Float32Array(fftSize * fftSize);
  const weight = new Float32Array(fftSize * fftSize);

  const center = fftSize / 2;

  for (let ai = 0; ai < numAngles; ai++) {
    const theta = getProjectionThetaRad(
      ai,
      numAngles,
      angleRangeDeg,
      projectionAnglesDeg,
    );
    const mathTheta = toProjectorMathTheta(theta);
    const cosT = Math.cos(mathTheta),
      sinT = Math.sin(mathTheta);

    const projR = new Float32Array(fftSize);
    const projI = new Float32Array(fftSize);
    const offset = Math.floor((fftSize - numDetectors) / 2);
    for (let i = 0; i < numDetectors; i++) {
      const idx = (i + offset + Math.floor(fftSize / 2)) % fftSize;
      projR[idx] = sinogram[ai * numDetectors + i];
    }
    fft1d(projR, projI, fftSize);

    for (let i = 0; i < fftSize; i++) {
      const freq = i <= fftSize / 2 ? i : i - fftSize;
      const fx = Math.round(freq * cosT + center);
      const fy = Math.round(freq * sinT + center);
      if (fx >= 0 && fx < fftSize && fy >= 0 && fy < fftSize) {
        const idx = fy * fftSize + fx;
        freqReal[idx] += projR[i];
        freqImag[idx] += projI[i];
        weight[idx] += 1;
      }
    }
  }

  for (let i = 0; i < freqReal.length; i++) {
    if (weight[i] > 0) {
      freqReal[i] /= weight[i];
      freqImag[i] /= weight[i];
    }
  }

  fftShift2D(freqReal, freqImag, fftSize);

  fft2d(freqReal, freqImag, fftSize, true);
  fftShift2D(freqReal, freqImag, fftSize);
  const result = new Float32Array(outputSize * outputSize);
  const cropOffset = Math.floor((fftSize - outputSize) / 2);
  for (let j = 0; j < outputSize; j++) {
    for (let i = 0; i < outputSize; i++) {
      result[j * outputSize + i] =
        freqReal[(j + cropOffset) * fftSize + i + cropOffset];
    }
  }

  return result;
}

function fftShift2D(
  real: Float32Array,
  imag: Float32Array,
  size: number,
): void {
  const half = size / 2;
  for (let j = 0; j < half; j++) {
    for (let i = 0; i < half; i++) {
      const idx1 = j * size + i;
      const idx2 = (j + half) * size + i + half;
      [real[idx1], real[idx2]] = [real[idx2], real[idx1]];
      [imag[idx1], imag[idx2]] = [imag[idx2], imag[idx1]];

      const idx3 = j * size + i + half;
      const idx4 = (j + half) * size + i;
      [real[idx3], real[idx4]] = [real[idx4], real[idx3]];
      [imag[idx3], imag[idx4]] = [imag[idx4], imag[idx3]];
    }
  }
}
