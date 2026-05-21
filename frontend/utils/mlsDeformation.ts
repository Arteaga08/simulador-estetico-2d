/**
 * Moving Least Squares (MLS) As-Rigid-As-Possible image deformation,
 * extended with per-point hydrodynamic mass (w) to model differential
 * tissue stiffness in rhinoplasty simulation.
 *
 * Reference: Schaefer, McPhail, Warren — "Image Deformation Using
 * Moving Least Squares" (SIGGRAPH 2006).
 */

import type { ControlPoint, NoseBbox } from "@/lib/canvas/types";

// Grid resolution for the nose bbox (33×33 = 1 089 vertices).
const BBOX_GRID = 32;

// Grid resolution for full-image broca warp (65×65 = 4 225 vertices).
const FULL_GRID = 64;

// ─── Bilinear sampler ─────────────────────────────────────────────────────────

function bilinearSample(
  src: ImageData,
  sx: number,
  sy: number,
): [number, number, number, number] {
  const { data, width, height } = src;
  sx = Math.max(0, Math.min(width - 1, sx));
  sy = Math.max(0, Math.min(height - 1, sy));

  const x0 = Math.floor(sx),
    x1 = Math.min(x0 + 1, width - 1);
  const y0 = Math.floor(sy),
    y1 = Math.min(y0 + 1, height - 1);
  const tx = sx - x0,
    ty = sy - y0;

  const i00 = (y0 * width + x0) * 4;
  const i10 = (y0 * width + x1) * 4;
  const i01 = (y1 * width + x0) * 4;
  const i11 = (y1 * width + x1) * 4;

  const w00 = (1 - tx) * (1 - ty);
  const w10 = tx * (1 - ty);
  const w01 = (1 - tx) * ty;
  const w11 = tx * ty;

  return [
    w00 * data[i00] + w10 * data[i10] + w01 * data[i01] + w11 * data[i11],
    w00 * data[i00 + 1] +
      w10 * data[i10 + 1] +
      w01 * data[i01 + 1] +
      w11 * data[i11 + 1],
    w00 * data[i00 + 2] +
      w10 * data[i10 + 2] +
      w01 * data[i01 + 2] +
      w11 * data[i11 + 2],
    w00 * data[i00 + 3] +
      w10 * data[i10 + 3] +
      w01 * data[i01 + 3] +
      w11 * data[i11 + 3],
  ];
}

// ─── MLS rigid backward warp (single point) ───────────────────────────────────

function mlsRigidBackward(
  vx: number,
  vy: number,
  pts: ControlPoint[],
  alpha: number,
): { sx: number; sy: number } {
  const EPS_SQ = 0.25;
  const n = pts.length;

  let W = 0;
  const ws = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const dx = pts[i].px - vx;
    const dy = pts[i].py - vy;
    const d2 = dx * dx + dy * dy;
    if (d2 < EPS_SQ) return { sx: pts[i].qx, sy: pts[i].qy };
    const massI = pts[i].w ?? 1.0;
    ws[i] = (alpha === 1 ? 1 / d2 : 1 / Math.pow(d2, alpha)) * massI;
    W += ws[i];
  }

  let pStarX = 0,
    pStarY = 0,
    qStarX = 0,
    qStarY = 0;
  for (let i = 0; i < n; i++) {
    const wi = ws[i];
    pStarX += wi * pts[i].px;
    pStarY += wi * pts[i].py;
    qStarX += wi * pts[i].qx;
    qStarY += wi * pts[i].qy;
  }
  pStarX /= W;
  pStarY /= W;
  qStarX /= W;
  qStarY /= W;

  let A11 = 0,
    A12 = 0;
  for (let i = 0; i < n; i++) {
    const wi = ws[i];
    const phx = pts[i].px - pStarX,
      phy = pts[i].py - pStarY;
    const qhx = pts[i].qx - qStarX,
      qhy = pts[i].qy - qStarY;
    A11 += wi * (phx * qhx + phy * qhy);
    A12 += wi * (phx * qhy - phy * qhx);
  }

  const theta = Math.atan2(A12, A11);
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const vhx = vx - pStarX;
  const vhy = vy - pStarY;
  return {
    sx: cosT * vhx - sinT * vhy + qStarX,
    sy: sinT * vhx + cosT * vhy + qStarY,
  };
}

// ─── Mesh-accelerated warp ────────────────────────────────────────────────────

function meshWarp(
  srcImageData: ImageData,
  dstData: Uint8ClampedArray,
  controlPoints: ControlPoint[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cols: number,
  rows: number,
  alpha: number,
): void {
  const { width } = srcImageData;
  const bW = x1 - x0;
  const bH = y1 - y0;

  const gCols1 = cols + 1;
  const gRows1 = rows + 1;
  const gx = new Float32Array(gCols1 * gRows1);
  const gy = new Float32Array(gCols1 * gRows1);

  for (let r = 0; r < gRows1; r++) {
    const vy = y0 + (r / rows) * bH;
    for (let c = 0; c < gCols1; c++) {
      const vx = x0 + (c / cols) * bW;
      const { sx, sy } = mlsRigidBackward(vx, vy, controlPoints, alpha);
      const vi = r * gCols1 + c;
      gx[vi] = sx;
      gy[vi] = sy;
    }
  }

  const cellW = bW / cols;
  const cellH = bH / rows;
  const invCW = 1 / cellW;
  const invCH = 1 / cellH;

  for (let py = y0; py < y1; py++) {
    const ayRel = py - y0;
    const row = Math.min(Math.floor(ayRel * invCH), rows - 1);
    const fy = (ayRel - row * cellH) * invCH;

    for (let px = x0; px < x1; px++) {
      const axRel = px - x0;
      const col = Math.min(Math.floor(axRel * invCW), cols - 1);
      const fx = (axRel - col * cellW) * invCW;

      const i00 = row * gCols1 + col;
      const i10 = i00 + 1;
      const i01 = i00 + gCols1;
      const i11 = i01 + 1;

      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const sx = w00 * gx[i00] + w10 * gx[i10] + w01 * gx[i01] + w11 * gx[i11];
      const sy = w00 * gy[i00] + w10 * gy[i10] + w01 * gy[i01] + w11 * gy[i11];

      const [r, g, b, a] = bilinearSample(srcImageData, sx, sy);
      const di = (py * width + px) * 4;
      dstData[di] = r;
      dstData[di + 1] = g;
      dstData[di + 2] = b;
      dstData[di + 3] = a;
    }
  }
}

// ─── Public API Corregido con Difuminado de Bordes Avanzado ───────────────────

export function applyMLSDeformation(
  srcImageData: ImageData,
  controlPoints: ControlPoint[],
  bbox: NoseBbox | null,
  alpha: number = 2.0,
): ImageData {
  const { width, height, data: srcData } = srcImageData;
  const dstData = new Uint8ClampedArray(srcData);

  if (!controlPoints || controlPoints.length === 0) {
    return new ImageData(dstData, width, height);
  }

  const allIdentity = controlPoints.every(
    (cp) => Math.abs(cp.px - cp.qx) < 0.5 && Math.abs(cp.py - cp.qy) < 0.5,
  );
  if (allIdentity) return new ImageData(dstData, width, height);

  if (bbox) {
    // 1. Añadimos un margen extra (padding) a los bordes calculados para dar espacio al difuminado
    const padding = 50;
    const x0 = Math.max(0, Math.floor(bbox.x) - padding);
    const y0 = Math.max(0, Math.floor(bbox.y) - padding);
    const x1 = Math.min(width, Math.ceil(bbox.x + bbox.width) + padding);
    const y1 = Math.min(height, Math.ceil(bbox.y + bbox.height) + padding);

    // 2. Creamos un buffer intermedio para calcular la deformación de la malla completa
    const warpData = new Uint8ClampedArray(srcData);
    meshWarp(
      srcImageData,
      warpData,
      controlPoints,
      x0,
      y0,
      x1,
      y1,
      BBOX_GRID,
      BBOX_GRID,
      alpha,
    );

    // 3. Campo de Influencia: Difuminado progresivo en los límites del recuadro
    const blendZone = 40; // Ancho de la franja de suavizado en píxeles

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        // Distancia del píxel actual al borde más cercano de la caja expandida
        const distLeft = x - x0;
        const distRight = x1 - x;
        const distTop = y - y0;
        const distBottom = y1 - y;

        const minDist = Math.min(distLeft, distRight, distTop, distBottom);

        // Factor de interpolación (t = 1 -> deformación total, t = 0 -> píxel original)
        let t = 1.0;
        if (minDist < blendZone) {
          const ratio = minDist / blendZone;
          // Curva de interpolación sigmoide para un desvanecimiento orgánico
          t = ratio * ratio * (3 - 2 * ratio);
        }

        const di = (y * width + x) * 4;

        // Mezcla alfa matemática entre la foto original y el buffer deformado
        dstData[di] = srcData[di] * (1 - t) + warpData[di] * t;
        dstData[di + 1] = srcData[di + 1] * (1 - t) + warpData[di + 1] * t;
        dstData[di + 2] = srcData[di + 2] * (1 - t) + warpData[di + 2] * t;
        dstData[di + 3] = srcData[di + 3]; // Conservar canal alfa intacto
      }
    }
  } else {
    // Modo brocha de pantalla completa
    const aspect = width / height;
    const gCols = Math.round(FULL_GRID * Math.max(1, aspect));
    const gRows = Math.round(FULL_GRID * Math.max(1, 1 / aspect));
    meshWarp(
      srcImageData,
      dstData,
      controlPoints,
      0,
      0,
      width,
      height,
      gCols,
      gRows,
      alpha,
    );
  }

  return new ImageData(dstData, width, height);
}
