import type { NoseLandmarks } from './useFaceLandmarks'

export interface ValidationResult {
  ok: boolean
  reason?: string
}

/**
 * Validate that a NoseLandmarks result is anatomically plausible.
 *
 * MediaPipe FaceMesh is trained mostly on near-frontal faces and on extreme
 * profiles or unusual angles it can produce a topologically consistent but
 * anatomically wrong mesh — the 3D template snaps to an ambiguous pose that
 * still scores well in detection confidence. Without validation we'd accept
 * landmarks where (e.g.) the radix sits below the eye level or the tip sits
 * above the bridge, and downstream sliders would deform the wrong tissue.
 *
 * If any invariant fails, callers should reject the detection and fall back
 * to manual placement, which is more honest than shipping wrong landmarks.
 *
 * All coords are in image pixels with y increasing downward (HTML canvas).
 */
export function validateLandmarkSanity(lm: NoseLandmarks): ValidationResult {
  // 1. Bridge (radix) must be above the tip in image coords.
  if (lm.bridge.y >= lm.tip.y) {
    return { ok: false, reason: 'radix queda por debajo de la punta' }
  }

  // 2. Tip must be above the subnasal (subnasal is below the tip in profile
  //    and frontal upright faces). Tolerance: allow exactly equal.
  if (lm.tip.y > lm.base.y) {
    return { ok: false, reason: 'punta queda por debajo del subnasal' }
  }

  // 3. Nose length must be a reasonable fraction of the face bounding box.
  //    Too small → the mesh collapsed; too large → wrong scale.
  const noseLen = Math.hypot(lm.tip.x - lm.bridge.x, lm.tip.y - lm.bridge.y)
  const bb = lm.faceBoundingBox
  if (bb) {
    const bboxDim = Math.min(bb.width, bb.height)
    if (bboxDim > 0) {
      const ratio = noseLen / bboxDim
      if (ratio < 0.08 || ratio > 0.95) {
        return {
          ok: false,
          reason: `tamaño de nariz/rostro fuera de rango (ratio=${ratio.toFixed(2)})`,
        }
      }
    }
  }

  // 4. Radix should sit roughly at the outer-eye horizontal line. In profile
  //    the nasion projects clearly above the canthus; in frontal view the
  //    MediaPipe radix landmark (lm[6]) often lands slightly below the outer
  //    canthus because the canthus sits high relative to the nasion bone.
  //    Tolerance is view-dependent.
  if (lm.eyeOuterL && lm.eyeOuterR) {
    const eyeY = (lm.eyeOuterL.y + lm.eyeOuterR.y) / 2
    const isFrontal = lm.visibleAlar === 'both'
    const tolerance = noseLen * (isFrontal ? 0.60 : 0.20)
    if (lm.bridge.y > eyeY + tolerance) {
      return {
        ok: false,
        reason: 'radix muy por debajo del nivel de los ojos',
      }
    }
  }

  // 5. Both nostril points should sit below the bridge.
  if (lm.nostrilL.y < lm.bridge.y || lm.nostrilR.y < lm.bridge.y) {
    return { ok: false, reason: 'nostrils por encima del radix' }
  }

  // 6. Tip should be the most "forward" (most extreme x) point of the nose
  //    in profile. In frontal view this check is meaningless so we only
  //    apply it when visibleAlar indicates profile.
  if (lm.visibleAlar === 'L' || lm.visibleAlar === 'R') {
    const tipExtremeness = Math.abs(lm.tip.x - lm.bridge.x)
    if (tipExtremeness < noseLen * 0.10) {
      return {
        ok: false,
        reason: 'punta no proyecta hacia adelante en vista de perfil',
      }
    }
  }

  return { ok: true }
}
