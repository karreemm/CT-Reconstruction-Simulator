import type { ColormapName } from "@/types";

type RGB = [number, number, number];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function makeGradientLUT(stops: { pos: number; color: RGB }[]): Uint8Array {
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let c: RGB = stops[0].color;
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s].pos && t <= stops[s + 1].pos) {
        const lt = (t - stops[s].pos) / (stops[s + 1].pos - stops[s].pos);
        c = lerpColor(stops[s].color, stops[s + 1].color, lt);
        break;
      }
    }
    lut[i * 3] = Math.round(c[0]);
    lut[i * 3 + 1] = Math.round(c[1]);
    lut[i * 3 + 2] = Math.round(c[2]);
  }
  return lut;
}

const COLORMAPS: Record<ColormapName, Uint8Array> = {
  grayscale: makeGradientLUT([
    { pos: 0, color: [0, 0, 0] },
    { pos: 1, color: [255, 255, 255] },
  ]),
  hot: makeGradientLUT([
    { pos: 0, color: [0, 0, 0] },
    { pos: 0.33, color: [230, 0, 0] },
    { pos: 0.66, color: [255, 200, 0] },
    { pos: 1, color: [255, 255, 255] },
  ]),
  viridis: makeGradientLUT([
    { pos: 0, color: [68, 1, 84] },
    { pos: 0.25, color: [59, 82, 139] },
    { pos: 0.5, color: [33, 145, 140] },
    { pos: 0.75, color: [94, 201, 98] },
    { pos: 1, color: [253, 231, 37] },
  ]),
  jet: makeGradientLUT([
    { pos: 0, color: [0, 0, 143] },
    { pos: 0.125, color: [0, 0, 255] },
    { pos: 0.375, color: [0, 255, 255] },
    { pos: 0.625, color: [255, 255, 0] },
    { pos: 0.875, color: [255, 0, 0] },
    { pos: 1, color: [128, 0, 0] },
  ]),
  plasma: makeGradientLUT([
    { pos: 0, color: [13, 8, 135] },
    { pos: 0.25, color: [126, 3, 168] },
    { pos: 0.5, color: [204, 71, 120] },
    { pos: 0.75, color: [248, 149, 64] },
    { pos: 1, color: [240, 249, 33] },
  ]),
};

export function getColormap(name: ColormapName): Uint8Array {
  return COLORMAPS[name];
}

export function applyColormap(
  data: Float32Array,
  width: number,
  height: number,
  colormapName: ColormapName,
  flipVertical = false,
): ImageData {
  const lut = COLORMAPS[colormapName];
  const imageData = new ImageData(width, height);
  const pixels = imageData.data;

  let min = Infinity,
    max = -Infinity;
  const len = width * height;
  for (let i = 0; i < len; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  const range = max - min || 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sourceY = flipVertical ? height - 1 - y : y;
      const sourceIndex = sourceY * width + x;
      const targetIndex = y * width + x;
      const val = Math.max(
        0,
        Math.min(255, Math.round(((data[sourceIndex] - min) / range) * 255)),
      );
      pixels[targetIndex * 4] = lut[val * 3];
      pixels[targetIndex * 4 + 1] = lut[val * 3 + 1];
      pixels[targetIndex * 4 + 2] = lut[val * 3 + 2];
      pixels[targetIndex * 4 + 3] = 255;
    }
  }

  return imageData;
}
