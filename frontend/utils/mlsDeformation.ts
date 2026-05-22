/**
 * Moving Least Squares (MLS) AFFINE image deformation,
 * extended with per-point hydrodynamic mass (w) to model differential
 * tissue stiffness in rhinoplasty simulation.
 *
 * ── Affine vs Rigid ─────────────────────────────────────────────────
 * Rígido (Rigid): Solo permite rotación y traslación. Destruye la simetría
 * cuando se intenta afinar la nariz (comprimir).
 * Afín (Affine): Permite rotación, traslación Y ESCALADO DIRECCIONAL.
 * Permite que los "puntos fantasma" compriman el tejido hacia el centro
 * logrando un afinamiento fotorrealista sin desviar la nariz.
 * * Estrategia: mesh-accelerated backward warp (Bilineal sobre Grid 33x33).
 */

import type { ControlPoint, NoseBbox } from "@/lib/canvas/types";

const BBOX_GRID = 32;
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

// ─── MLS AFFINE backward warp (single point) ──────────────────────────────────

function mlsAffineBackward(
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
    // CORRECCIÓN CRÍTICA: En un backward warp, la distancia se calcula
    // respecto al punto de DESTINO (qx, qy), no al de origen (px, py).
    const dx = pts[i].qx - vx;
    const dy = pts[i].qy - vy;
    const d2 = dx * dx + dy * dy;

    // Si el píxel cae exactamente en el destino, devolvemos el origen
    if (d2 < EPS_SQ) return { sx: pts[i].px, sy: pts[i].py };

    const massI = pts[i].w ?? 1.0;
    ws[i] = (alpha === 1 ? 1 / d2 : 1 / Math.pow(d2, alpha)) * massI;
    W += ws[i];
  }

  // Centros de Masa Ponderados
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

  // Matrices de Covarianza para deformación Afín
  let mu11 = 0,
    mu12 = 0,
    mu22 = 0;
  let A11 = 0,
    A12 = 0,
    A21 = 0,
    A22 = 0;

  for (let i = 0; i < n; i++) {
    const wi = ws[i];
    const phx = pts[i].px - pStarX;
    const phy = pts[i].py - pStarY;
    const qhx = pts[i].qx - qStarX;
    const qhy = pts[i].qy - qStarY;

    // Covarianza del destino
    mu11 += wi * qhx * qhx;
    mu12 += wi * qhx * qhy;
    mu22 += wi * qhy * qhy;

    // Matriz cruzada (Destino -> Origen)
    A11 += wi * qhx * phx;
    A12 += wi * qhx * phy;
    A21 += wi * qhy * phx;
    A22 += wi * qhy * phy;
  }

  // Inversión de la matriz de Covarianza
  const det = mu11 * mu22 - mu12 * mu12;

  // Guard-clause: Si los puntos son perfectamente colineales (determinante 0),
  // evitamos que la matriz explote y hacemos un fallback a traslación pura.
  if (Math.abs(det) < 1e-8) {
    return {
      sx: vx - qStarX + pStarX,
      sy: vy - qStarY + pStarY,
    };
  }

  const invDet = 1.0 / det;
  const invMu11 = mu22 * invDet;
  const invMu12 = -mu12 * invDet;
  const invMu22 = mu11 * invDet;

  // Matriz de Transformación Afín resultante (M = Mu^-1 * A)
  const M11 = invMu11 * A11 + invMu12 * A21;
  const M12 = invMu11 * A12 + invMu12 * A22;
  const M21 = invMu12 * A11 + invMu22 * A21;
  const M22 = invMu12 * A12 + invMu22 * A22;

  // Aplicar transformación al píxel
  const vhx = vx - qStarX;
  const vhy = vy - qStarY;

  return {
    sx: vhx * M11 + vhy * M21 + pStarX,
    sy: vhx * M12 + vhy * M22 + pStarY,
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

  // Paso 1: Computar vértices usando MLS AFFINE
  for (let r = 0; r < gRows1; r++) {
    const vy = y0 + (r / rows) * bH;
    for (let c = 0; c < gCols1; c++) {
      const vx = x0 + (c / cols) * bW;
      const { sx, sy } = mlsAffineBackward(vx, vy, controlPoints, alpha);
      const vi = r * gCols1 + c;
      gx[vi] = sx;
      gy[vi] = sy;
    }
  }

  // Paso 2: Interpolación Bilineal (O(1) por píxel)
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

// ─── Public API ─────────────────────────────────────────────────────────────

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
    const padding = 50;
    const x0 = Math.max(0, Math.floor(bbox.x) - padding);
    const y0 = Math.max(0, Math.floor(bbox.y) - padding);
    const x1 = Math.min(width, Math.ceil(bbox.x + bbox.width) + padding);
    const y1 = Math.min(height, Math.ceil(bbox.y + bbox.height) + padding);

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

    const blendZone = 40;

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const distLeft = x - x0;
        const distRight = x1 - x;
        const distTop = y - y0;
        const distBottom = y1 - y;

        const minDist = Math.min(distLeft, distRight, distTop, distBottom);

        let t = 1.0;
        if (minDist < blendZone) {
          const ratio = minDist / blendZone;
          t = ratio * ratio * (3 - 2 * ratio);
        }

        const di = (y * width + x) * 4;

        dstData[di] = srcData[di] * (1 - t) + warpData[di] * t;
        dstData[di + 1] = srcData[di + 1] * (1 - t) + warpData[di + 1] * t;
        dstData[di + 2] = srcData[di + 2] * (1 - t) + warpData[di + 2] * t;
        dstData[di + 3] = srcData[di + 3];
      }
    }
  } else {
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
