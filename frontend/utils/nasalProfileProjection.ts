// Proyección de landmarks de nariz hacia la silueta lateral en vista PERFIL.
//
// MediaPipe devuelve los puntos del facemesh sobre el plano sagital medio
// (línea central anatómica del tabique). Al proyectarse en 2D en vista perfil,
// los puntos caen DENTRO de la silueta visible — no sobre el contorno externo
// del dorso/punta. Este módulo desplaza cada landmark perpendicular al eje
// facial (frente → mentón) hacia la silueta visible, escalado por la distancia
// inter-cantal para que sea independiente del zoom.
//
// Los ratios son calibrables visualmente con debug overlay activo. Editar
// PROFILE_OFFSETS abajo hasta que cada landmark caiga sobre la anatomía
// correcta en las 3 fotos de perfil de referencia. Solo afecta vista perfil
// — la rama frontal queda intacta.

interface Pt { x: number; y: number }

/**
 * Fracciones de la distancia inter-cantal usadas para empujar cada landmark
 * desde la línea central hacia la silueta del perfil. 0 = no desplazar.
 *
 * Calibrar visualmente:
 *   - `bridge` (radix): casi siempre 0. El radix ya cae sobre la silueta.
 *   - `bridgeMid` (supratip lm[4]): pequeño offset.
 *   - `midDorsum` (lm[5]): offset medio.
 *   - `tip` (lm[1]): el más grande — la punta protrude más.
 *   - `base` (subnasal lm[2]): pequeño offset.
 */
export const PROFILE_OFFSETS = {
  bridge: 0.30,
  bridgeMid: 0.55,
  midDorsum: 0.65,
  tip: 0.78,
  base: 0.30,
  /** Empuje adicional para rhinion DESPUÉS de la interpolación bridge↔tip,
   *  porque el dorso es convexo y una recta cae por dentro del contorno. */
  rhinion: 0.10,
} as const

/**
 * Empuja `point` perpendicular al eje facial (spineStart → spineEnd), hacia
 * el mismo lado donde se encuentra `tipRef`. Magnitud = `ratio * scale`.
 *
 * Si `ratio` es 0, devuelve el punto sin cambios.
 */
export function projectToProfileSilhouette(
  point: Pt,
  spineStart: Pt,
  spineEnd: Pt,
  tipRef: Pt,
  scale: number,
  ratio: number,
): Pt {
  if (ratio === 0) return point

  const sdx = spineEnd.x - spineStart.x
  const sdy = spineEnd.y - spineStart.y
  const slen = Math.hypot(sdx, sdy) || 1
  const sx = sdx / slen
  const sy = sdy / slen

  // Cross product Z: indica de qué lado del spine cae el tip.
  const tdx = tipRef.x - spineStart.x
  const tdy = tipRef.y - spineStart.y
  const crossZ = sx * tdy - sy * tdx

  // Perpendicular al spine apuntando hacia el lado del tip.
  const nx = crossZ > 0 ? -sy : sy
  const ny = crossZ > 0 ? sx : -sx

  return {
    x: point.x + nx * ratio * scale,
    y: point.y + ny * ratio * scale,
  }
}
