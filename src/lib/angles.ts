export const NON_UNIFORM_ANGLE_POWER = 1.35;

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function toProjectorMathTheta(thetaRad: number): number {
  return thetaRad + Math.PI / 2;
}

export function buildProjectionAnglesDeg(
  numAngles: number,
  angleRangeDeg: number,
  useNonUniformSampling: boolean,
  nonUniformPower: number = NON_UNIFORM_ANGLE_POWER,
): Float32Array {
  if (numAngles <= 0) return new Float32Array();

  const projectionAngles = new Float32Array(numAngles);
  for (let ai = 0; ai < numAngles; ai++) {
    const t = numAngles > 1 ? ai / (numAngles - 1) : 0;
    const sampleT = useNonUniformSampling ? Math.pow(t, nonUniformPower) : t;
    projectionAngles[ai] = sampleT * angleRangeDeg;
  }

  return projectionAngles;
}

export function getProjectionThetaRad(
  angleIndex: number,
  numAngles: number,
  angleRangeDeg: number,
  projectionAnglesDeg?: Float32Array | null,
): number {
  if (projectionAnglesDeg && angleIndex < projectionAnglesDeg.length) {
    return degToRad(projectionAnglesDeg[angleIndex]);
  }

  const angleRangeRad = degToRad(angleRangeDeg);
  return (angleIndex * angleRangeRad) / numAngles;
}
