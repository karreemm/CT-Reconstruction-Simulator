export function radonTransform(
  phantom: Float32Array,
  size: number,
  numAngles: number,
  numDetectors: number,
  noiseEnabled: boolean = false,
  noiseSNR: number = 40,
  angleRangeDeg: number = 180): Float32Array {
  const sinogram = new Float32Array(numAngles * numDetectors);
  const cx = size / 2,
    cy = size / 2;
  const detHalf = numDetectors / 2;
  const scale = size / numDetectors;
  const angleRangeRad = (angleRangeDeg * Math.PI) / 180;

  for (let ai = 0; ai < numAngles; ai++) {
    const theta = (ai * angleRangeRad) / numAngles;
    const mathTheta = theta + Math.PI / 2;
    const cosT = Math.cos(mathTheta);
    const sinT = Math.sin(mathTheta);

    for (let di = 0; di < numDetectors; di++) {
      const s = (di - detHalf + 0.5) * scale;
      let sum = 0;

      for (let t = -cx; t < cx; t += 0.5) {
        const x = s * cosT - t * sinT + cx;
        const y = s * sinT + t * cosT + cy;

        const x0 = Math.floor(x),
          y0 = Math.floor(y);
        if (x0 >= 0 && x0 < size - 1 && y0 >= 0 && y0 < size - 1) {
          const fx = x - x0,
            fy = y - y0;
          sum +=
            phantom[y0 * size + x0] * (1 - fx) * (1 - fy) +
            phantom[y0 * size + x0 + 1] * fx * (1 - fy) +
            phantom[(y0 + 1) * size + x0] * (1 - fx) * fy +
            phantom[(y0 + 1) * size + x0 + 1] * fx * fy;
        }
      }
      sinogram[ai * numDetectors + di] = sum * 0.5;
    }
  }

  if (noiseEnabled) {
    addGaussianNoise(sinogram, noiseSNR);
  }

  return sinogram;
}

export function addGaussianNoise(data: Float32Array, snrDb: number): void {
  let signalPower = 0;
  for (let i = 0; i < data.length; i++) signalPower += data[i] * data[i];
  signalPower /= data.length;

  const snrLinear = Math.pow(10, snrDb / 10);
  const noisePower = signalPower / snrLinear;
  const noiseStd = Math.sqrt(noisePower);

  for (let i = 0; i < data.length; i++) {
    const u1 = Math.random(),
      u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
    data[i] += z * noiseStd;
  }
}

export function radonTransformSingleAngle(
  phantom: Float32Array,
  size: number,
  numDetectors: number,
  theta: number,
): Float32Array {
  const projection = new Float32Array(numDetectors);
  const cx = size / 2,
    cy = size / 2;
  const detHalf = numDetectors / 2;
  const scale = size / numDetectors;
  const mathTheta = theta + Math.PI / 2;
  const cosT = Math.cos(mathTheta);
  const sinT = Math.sin(mathTheta);

  for (let di = 0; di < numDetectors; di++) {
    const s = (di - detHalf + 0.5) * scale;
    let sum = 0;
    for (let t = -cx; t < cx; t += 0.5) {
      const x = s * cosT - t * sinT + cx;
      const y = s * sinT + t * cosT + cy;
      const x0 = Math.floor(x),
        y0 = Math.floor(y);
      if (x0 >= 0 && x0 < size - 1 && y0 >= 0 && y0 < size - 1) {
        const fx = x - x0,
          fy = y - y0;
        sum +=
          phantom[y0 * size + x0] * (1 - fx) * (1 - fy) +
          phantom[y0 * size + x0 + 1] * fx * (1 - fy) +
          phantom[(y0 + 1) * size + x0] * (1 - fx) * fy +
          phantom[(y0 + 1) * size + x0 + 1] * fx * fy;
      }
    }
    projection[di] = sum * 0.5;
  }
  return projection;
}
