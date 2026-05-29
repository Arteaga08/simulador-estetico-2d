import type { NoseLandmarks } from '@/lib/canvas/useFaceLandmarks'

export type FaceView = 'frontal' | 'perfil'

/**
 * Clasifica el tipo de toma (frontal o perfil) a partir de los landmarks.
 *
 * Métrica primaria: distancia horizontal entre las esquinas externas de los
 * ojos (lm33 y lm263) dividida por el ancho del bounding box facial.
 *
 *   Frontal: los ojos se separan amplio (~25-35% del ancho de cara)
 *   Perfil:  los dos ojos colapsan al mismo plano X en proyección 2D (~0-10%)
 *
 * Esto es mucho más confiable que comparar la distancia tip→ojo, porque en
 * perfil estricto MediaPipe estima la posición del ojo oculto detrás de la
 * nariz, dando distancias similares a ambos ojos (ratio ≈ 1, antes
 * clasificaba erróneamente como frontal).
 *
 * Umbral: 0.18 — separa claramente fotos frontales de perfil.
 */
export function classifyFaceView(landmarks: NoseLandmarks): FaceView {
  // Primary signal: visibleAlar. In useFaceLandmarks we already classify whether
  // the nose is in profile based on the horizontal offset between tip and
  // subnasal (|tip.x - base.x| vs nose length). This is the right signal for
  // profile detection because:
  //   - It uses only nose landmarks, which MediaPipe places reliably even in
  //     strict profile.
  //   - It does NOT depend on the outer eye corners. In profile, MediaPipe
  //     hallucinates the position of the hidden eye behind the nose, which
  //     ruins any eye-distance heuristic.
  if (landmarks.visibleAlar && landmarks.visibleAlar !== 'both') {
    return 'perfil'
  }

  // Secondary: nostril asymmetry around the radix→tip axis. In profile, one
  // nostril collapses close to the axis while the other stays far. Already
  // captured above via visibleAlar, but kept as a defensive cross-check for
  // near-3/4 views where visibleAlar may say 'both' but the face isn't truly
  // frontal.
  const midX = (landmarks.bridge.x + landmarks.tip.x) / 2
  const dL = Math.abs(landmarks.nostrilL.x - midX)
  const dR = Math.abs(landmarks.nostrilR.x - midX)
  const asymmetry = Math.max(dL, dR) / Math.max(Math.min(dL, dR), 1)
  if (asymmetry >= 2.2) return 'perfil'

  // Tertiary: face bounding box aspect ratio. Frontal faces are typically
  // wider than ~0.62 × height; strict profiles tend to be narrower because
  // the bbox includes only one cheek.
  const bb = landmarks.faceBoundingBox
  if (bb && bb.height > 1e-6) {
    const aspect = bb.width / bb.height
    if (aspect < 0.60) return 'perfil'
  }

  return 'frontal'
}
