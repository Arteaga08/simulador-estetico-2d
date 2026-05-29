'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { FaceLandmarker, FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'
import { validateLandmarkSanity } from './nasalLandmarkValidation'
import {
  PROFILE_OFFSETS,
  projectToProfileSilhouette,
} from '@/utils/nasalProfileProjection'

// MediaPipe 468-point face mesh — nose indices (verificados empíricamente):
//   PERFIL  (sesión 2026-05-27):
//     6   = Radix (nasion / inicio del puente nasal)
//   FRONTAL (sesión 2026-05-27): lm[6] cae bajo los párpados, no entre los
//     ojos. lm[168] sí cae entre los ojos en frontal y es el radix correcto.
//   COMÚN A AMBAS VISTAS:
//     4   = Supratip (justo encima de la punta — usado como bridgeMid p/co-rotación)
//     1   = Tip (Pronasal)
//     102 = Alar-facial groove izquierda (base alar lateral)
//     331 = Alar-facial groove derecha
//     2   = Subnasal (base de la columela)
//
// Iteraciones previas (descartadas):
//   - lm[128]/lm[357] como nostrils: caen en el puente a altura de los ojos
//   - lm[129]/lm[358] como nostrils: caen a media altura del puente
//
// Pendiente (Paso 4): agregar un landmark para el K-area / mid-dorsum real
// (candidatos: lm[195] o lm[5]) — ahí peakea la giba anatómicamente, no en lm[4].
//
// Face bbox landmarks: 10=forehead, 152=chin, 234=left cheek, 454=right cheek
//
// Anchor point indices (used to pin surrounding tissue in MLS):
// ─── ANILLO PERINASAL (Muro de contención clínico) ───────────────────
// Estos puntos rodean la pirámide nasal a milímetros de distancia.
// Impiden que la deformación MLS "sangre" hacia los pómulos, ojos o boca.
// Candidate MediaPipe indices exposed for visual debugging. Each one is a
// plausible match for an anatomical nasal landmark. The debug overlay renders
// these so we can verify which index actually lands on the right anatomy per
// face — the current production mapping (bridge=6, bridgeMid=4, tip=1,
// nostrilL=102, nostrilR=331, base=2) is hypothesis, not ground truth.
export const DEBUG_CANDIDATE_INDICES = [
  // Radix / nasion candidates
  6, 8, 168, 197,
  // Mid-dorsum / K-area candidates
  4, 5, 195,
  // Tip / pronasale candidates
  1, 19,
  // Subnasal / columella base candidates
  2, 94, 164,
  // Left alar candidates
  49, 64, 98, 102, 240,
  // Right alar candidates
  279, 294, 327, 331, 460,
] as const

const ANCHOR_INDICES = [
  8,    // Nasion superior / Glabela (detiene el jalón en la frente)
  133,  // Inner corner left eye (Lagrimal izquierdo - protege el ojo)
  362,  // Inner corner right eye (Lagrimal derecho - protege el ojo)
  117,  // Maxilar interno izquierdo (protege el pómulo)
  346,  // Maxilar interno derecho (protege el pómulo)
  205,  // Surco nasogeniano izquierdo (protege la mejilla baja)
  425,  // Surco nasogeniano derecho (protege la mejilla baja)
  164,  // Philtrum / Labio superior central (protege la boca)
]

export interface NoseLandmarks {
  bridge:    { x: number; y: number }
  bridgeMid: { x: number; y: number }
  /** Mid-dorsum / peak de la giba (lm[5]) — donde anatómicamente sobresale más
   *  el dorso. Confirmado en perfil y frontal (sesión 2026-05-27). Usar como
   *  epicentro de sliders de giba; bridgeMid sigue siendo supratip para co-rotación. */
  midDorsum: { x: number; y: number }
  /** Rhinion / K-area — keystone bone↔cartilage transition. Pivot rígido del dorso. */
  rhinion:   { x: number; y: number }
  tip:       { x: number; y: number }
  /** Sub-tip / break columelar — controla el lóbulo infratip (35% base→tip). */
  subtip:    { x: number; y: number }
  nostrilL:  { x: number; y: number }
  nostrilR:  { x: number; y: number }
  base:      { x: number; y: number }
  /** Qué alar es visible en perfil. 'both' = vista frontal o cerca-frontal. */
  visibleAlar: 'L' | 'R' | 'both'
  confidence: number
  faceBoundingBox: { x: number; y: number; width: number; height: number }
  source: 'auto' | 'manual'
  /** Face anchor points for MLS rigid deformation (forehead, eye corners, cheeks, chin) */
  anchors: Array<{ x: number; y: number }>
  /** Outer eye corners (lm[33], lm[263]) — used by the view classifier to
   *  distinguish frontal vs profile by collapsed inter-canthal distance.
   *  Absent in manual mode (no raw MediaPipe data). */
  eyeOuterL?: { x: number; y: number }
  eyeOuterR?: { x: number; y: number }
  /** Raw MediaPipe coords (image px) for landmarks in DEBUG_CANDIDATE_INDICES.
   *  Keyed by MediaPipe index. Used by the landmark-debug overlay to verify
   *  which index actually corresponds to which anatomy on each face. */
  debugCandidates?: Record<number, { x: number; y: number }>
}

/** Fracción radix→tip donde se ubica el rhinion (zona keystone hueso↔cartílago).
 *  Vista frontal — validada Sesión C. */
export const RHINION_T = 0.45
/** Fracción base→tip donde se ubica el sub-tip (break columelar / infratip lobule).
 *  Vista frontal — validada Sesión C. */
export const SUBTIP_T = 0.35
/** Versión perfil — el dorso curvo y el lóbulo infratip hacen que el rhinion/subtip
 *  aparezcan más cerca del tip en silueta. Calibrado Sesión A'. */
const RHINION_T_PROFILE = 0.58
const SUBTIP_T_PROFILE = 0.50

/** Helper para selección automática del alar visible en perfil. */
export function getVisibleAlar(lm: NoseLandmarks): { x: number; y: number } {
  if (lm.visibleAlar === 'L') return lm.nostrilL
  if (lm.visibleAlar === 'R') return lm.nostrilR
  return { x: (lm.nostrilL.x + lm.nostrilR.x) / 2, y: (lm.nostrilL.y + lm.nostrilR.y) / 2 }
}

export type DetectionStatus = 'idle' | 'detecting' | 'detected' | 'not_detected'

const MAX_DIM_FOR_RESIZE = 800

/** Derive approximate anchor points from a face bounding box (used in manual mode). */
function deriveAnchorsFromBbox(
  bb: { x: number; y: number; width: number; height: number },
): Array<{ x: number; y: number }> {
  const cx = bb.x + bb.width  / 2
  const cy = bb.y + bb.height / 2
  return [
    { x: cx,                      y: bb.y + bb.height * 0.04 },  // forehead high
    { x: cx,                      y: bb.y + bb.height * 0.15 },  // forehead mid
    { x: bb.x + bb.width * 0.10,  y: cy - bb.height * 0.10 },   // left eye corner area
    { x: bb.x + bb.width * 0.90,  y: cy - bb.height * 0.10 },   // right eye corner area
    { x: bb.x + bb.width * 0.12,  y: cy },                       // left cheekbone
    { x: bb.x + bb.width * 0.88,  y: cy },                       // right cheekbone
    { x: bb.x + bb.width * 0.30,  y: bb.y + bb.height * 0.80 }, // left mouth corner
    { x: bb.x + bb.width * 0.70,  y: bb.y + bb.height * 0.80 }, // right mouth corner
    { x: cx,                      y: bb.y + bb.height * 0.96 },  // chin
  ]
}

export function useFaceLandmarks() {
  const landmarkerRef   = useRef<FaceLandmarker | null>(null)
  const faceDetectorRef = useRef<FaceDetector | null>(null)
  const readyRef        = useRef(false)
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>('idle')

  useEffect(() => {
    let active = true
    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      )

      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        numFaces: 1,
        // Lowered from 0.3 → 0.1 because strict profile faces (where one eye
        // is occluded) often score below 0.3 with the default landmarker.
        // We'd rather get a low-confidence result that the surgeon can verify
        // visually than fall back to fully-manual placement.
        minFaceDetectionConfidence: 0.1,
        minFacePresenceConfidence: 0.1,
        minTrackingConfidence: 0.1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      })
      if (!active) { landmarker.close(); return }
      landmarkerRef.current = landmarker
      readyRef.current = true

      try {
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
            delegate: 'CPU',
          },
          runningMode: 'IMAGE',
          // BlazeFace is generally more robust to profile views than the
          // landmarker — keep its confidence threshold low so we can use it
          // to crop the face region and re-run the landmarker on the crop.
          minDetectionConfidence: 0.15,
        })
        if (!active) { detector.close(); return }
        faceDetectorRef.current = detector
      } catch (err) {
        console.warn('[useFaceLandmarks] FaceDetector unavailable, landmarks-only mode:', err)
      }
    }
    init().catch(err => console.warn('[useFaceLandmarks] init failed:', err))
    return () => {
      active = false
      landmarkerRef.current?.close()
      faceDetectorRef.current?.close()
      landmarkerRef.current = null
      faceDetectorRef.current = null
      readyRef.current = false
    }
  }, [])

  const tryDetect = useCallback(
    (image: HTMLImageElement | HTMLCanvasElement, outputW: number, outputH: number): NoseLandmarks | null => {
      const landmarker = landmarkerRef.current
      if (!landmarker) return null

      const lmResult = landmarker.detect(image)
      if (!lmResult.faceLandmarks.length) return null
      const lm = lmResult.faceLandmarks[0]

      let tip         = { x: lm[1].x   * outputW, y: lm[1].y   * outputH }
      const nostrilL  = { x: lm[102].x * outputW, y: lm[102].y * outputH }
      const nostrilR  = { x: lm[331].x * outputW, y: lm[331].y * outputH }
      let base        = { x: lm[2].x   * outputW, y: lm[2].y   * outputH }

      // Pre-classify frontal vs profile using tip-base alignment, so we can
      // pick the right radix index. lm[6] is the confirmed radix in profile
      // (sesión 2026-05-27), but in frontal it lands at lower-eyelid level —
      // lm[168] sits between the eyes where the surgeon expects the radix
      // (sesión 2026-05-27, frontal mapping).
      const faceWidthRaw = (Math.max(lm[234].x, lm[454].x) - Math.min(lm[234].x, lm[454].x)) * outputW
      const isFrontalView = Math.abs(tip.x - base.x) < faceWidthRaw * 0.03
      const radixIdx = isFrontalView ? 168 : 6
      let bridge      = { x: lm[radixIdx].x * outputW, y: lm[radixIdx].y * outputH }
      let bridgeMid   = { x: lm[4].x   * outputW, y: lm[4].y   * outputH }
      let midDorsum   = { x: lm[5].x   * outputW, y: lm[5].y   * outputH }

      // Profile-only silhouette projection (Sesión A' 2026-05-28).
      // MediaPipe returns centerline points (sagittal-plane projection); in
      // profile they fall inside the visible nose silhouette. Push each one
      // perpendicular to the spine (forehead lm[10] → chin lm[152]) toward the
      // silhouette edge. Magnitudes calibrated visually — see PROFILE_OFFSETS.
      // Frontal view is left untouched.
      const spineStart = { x: lm[10].x * outputW, y: lm[10].y * outputH }
      const spineEnd   = { x: lm[152].x * outputW, y: lm[152].y * outputH }
      const eyeL = lm[33]  ? { x: lm[33].x  * outputW, y: lm[33].y  * outputH } : null
      const eyeR = lm[263] ? { x: lm[263].x * outputW, y: lm[263].y * outputH } : null
      const profileScale = eyeL && eyeR
        ? Math.hypot(eyeR.x - eyeL.x, eyeR.y - eyeL.y)
        : Math.hypot(spineEnd.x - spineStart.x, spineEnd.y - spineStart.y) * 0.18
      if (!isFrontalView) {
        const tipRef = tip
        bridge    = projectToProfileSilhouette(bridge,    spineStart, spineEnd, tipRef, profileScale, PROFILE_OFFSETS.bridge)
        bridgeMid = projectToProfileSilhouette(bridgeMid, spineStart, spineEnd, tipRef, profileScale, PROFILE_OFFSETS.bridgeMid)
        midDorsum = projectToProfileSilhouette(midDorsum, spineStart, spineEnd, tipRef, profileScale, PROFILE_OFFSETS.midDorsum)
        base      = projectToProfileSilhouette(base,      spineStart, spineEnd, tipRef, profileScale, PROFILE_OFFSETS.base)
        tip       = projectToProfileSilhouette(tip,       spineStart, spineEnd, tipRef, profileScale, PROFILE_OFFSETS.tip)
      }

      const faceTop    = lm[10].y  * outputH
      const faceBottom = lm[152].y * outputH
      const faceLeft   = Math.min(lm[234].x, lm[454].x) * outputW
      const faceRight  = Math.max(lm[234].x, lm[454].x) * outputW
      let faceBoundingBox = {
        x:      faceLeft,
        y:      faceTop,
        width:  Math.max(faceRight - faceLeft, outputW * 0.05),
        height: Math.max(faceBottom - faceTop, outputH * 0.05),
      }

      if (faceDetectorRef.current) {
        try {
          const detResult = faceDetectorRef.current.detect(image)
          if (detResult.detections.length) {
            const bb = detResult.detections[0].boundingBox
            if (bb) {
              const imgW = image.width
              const imgH = image.height
              const sx = outputW / imgW
              const sy = outputH / imgH
              faceBoundingBox = {
                x: bb.originX * sx, y: bb.originY * sy,
                width: bb.width * sx, height: bb.height * sy,
              }
            }
          }
        } catch {
          // keep landmark-derived bbox
        }
      }

      // Extract anchor points from the 468-point mesh
      const anchors = ANCHOR_INDICES.map(i => ({
        x: lm[i].x * outputW,
        y: lm[i].y * outputH,
      }))

      // Outer eye corners — used by the view classifier (lm33 = left outer,
      // lm263 = right outer). These are NOT in ANCHOR_INDICES so we expose
      // them as their own fields.
      const eyeOuterL = lm[33]
        ? { x: lm[33].x * outputW, y: lm[33].y * outputH }
        : undefined
      const eyeOuterR = lm[263]
        ? { x: lm[263].x * outputW, y: lm[263].y * outputH }
        : undefined

      // Snapshot raw candidate landmarks for the debug overlay (image coords).
      const debugCandidates: Record<number, { x: number; y: number }> = {}
      for (const i of DEBUG_CANDIDATE_INDICES) {
        const p = lm[i]
        if (p) debugCandidates[i] = { x: p.x * outputW, y: p.y * outputH }
      }

      // Rhinion virtual — zona keystone (transición hueso↔cartílago).
      // Anatómicamente actúa como pivote rígido para Proyección/Refinamiento.
      const rhinionT = isFrontalView ? RHINION_T : RHINION_T_PROFILE
      let rhinion = {
        x: bridge.x + (tip.x - bridge.x) * rhinionT,
        y: bridge.y + (tip.y - bridge.y) * rhinionT,
      }
      // En perfil, la interpolación lineal bridge↔tip cae dentro del contorno
      // porque el dorso es convexo. Empujar rhinion perpendicular al spine
      // restaura la posición sobre la silueta visible.
      if (!isFrontalView) {
        rhinion = projectToProfileSilhouette(rhinion, spineStart, spineEnd, tip, profileScale, PROFILE_OFFSETS.rhinion)
      }
      // Sub-tip virtual — break columelar / infratip lobule.
      const subtipT = isFrontalView ? SUBTIP_T : SUBTIP_T_PROFILE
      const subtip = {
        x: base.x + (tip.x - base.x) * subtipT,
        y: base.y + (tip.y - base.y) * subtipT,
      }
      // Orientación facial: detectar perfil por la dirección horizontal del eje tip→base.
      // En perfil, el tip se proyecta claramente a un lado del subnasale (base).
      // Los valores Z de MediaPipe IMAGE mode son relativos al centroide facial, no a la
      // cámara, y no son confiables para esta detección.
      //   tipToBaseX > 0 → nariz apunta a la derecha → lado izq. hacia cámara → 'L'
      //   tipToBaseX < 0 → nariz apunta a la izquierda → lado der. hacia cámara → 'R'
      //   |tipToBaseX| < 8% del largo nasal → vista frontal → 'both'
      const noseLen = Math.hypot(tip.x - bridge.x, tip.y - bridge.y)
      const tipToBaseX = tip.x - base.x
      const profileThreshold = noseLen * 0.08
      const visibleAlar: 'L' | 'R' | 'both' =
        Math.abs(tipToBaseX) < profileThreshold ? 'both'
        : tipToBaseX > 0 ? 'L'
        : 'R'

      return {
        bridge, bridgeMid, midDorsum, rhinion, tip, subtip, nostrilL, nostrilR, base,
        visibleAlar,
        confidence: 1.0,
        faceBoundingBox,
        source: 'auto',
        anchors,
        eyeOuterL,
        eyeOuterR,
        debugCandidates,
      }
    },
    []
  )

  const detectNoseLandmarks = useCallback(
    async (img: HTMLImageElement): Promise<NoseLandmarks | null> => {
      if (!readyRef.current || !landmarkerRef.current) return null

      setDetectionStatus('detecting')
      const W = img.naturalWidth
      const H = img.naturalHeight

      // ── Pass 1: original — pass img element directly (most compatible) ──
      try {
        const result = tryDetect(img, W, H)
        if (result) {
          const v = validateLandmarkSanity(result)
          if (v.ok) { setDetectionStatus('detected'); return result }
          console.warn('[useFaceLandmarks] pass 1: rechazado por validación —', v.reason)
        } else {
          console.info('[useFaceLandmarks] pass 1 (original) failed — MediaPipe found no face. Likely close-up or extreme angle.')
        }
      } catch (err) {
        console.warn('[useFaceLandmarks] pass 1 (original) failed:', err)
      }

      // ── Pass 2: resized to MAX_DIM_FOR_RESIZE via HTMLCanvasElement ──
      const scale = MAX_DIM_FOR_RESIZE / Math.max(W, H)
      if (scale < 1) {
        try {
          const smallW = Math.round(W * scale)
          const smallH = Math.round(H * scale)
          const smallCanvas = document.createElement('canvas')
          smallCanvas.width  = smallW
          smallCanvas.height = smallH
          const smallCtx = smallCanvas.getContext('2d')
          if (!smallCtx) throw new Error('canvas 2d unavailable')
          smallCtx.drawImage(img, 0, 0, smallW, smallH)
          const result = tryDetect(smallCanvas, W, H)
          if (result) {
            const v = validateLandmarkSanity(result)
            if (v.ok) {
              console.info('[useFaceLandmarks] detected on resized')
              setDetectionStatus('detected')
              return result
            }
            console.warn('[useFaceLandmarks] pass 2 (resize): rechazado por validación —', v.reason)
          }
        } catch (err) {
          console.warn('[useFaceLandmarks] pass 2 (resize) failed:', err)
        }
      }

      // ── Pass 2.5: detect face with BlazeFace, crop to padded bbox, then
      // re-run the landmarker on the crop. BlazeFace handles strict profile
      // faces better than the landmarker, and cropping isolates the face so
      // the landmarker doesn't get distracted by background. ──
      if (faceDetectorRef.current) {
        try {
          const detResult = faceDetectorRef.current.detect(img)
          if (detResult.detections.length && detResult.detections[0].boundingBox) {
            const bb = detResult.detections[0].boundingBox
            const pad = 0.4 // 40% padding around the face
            const cropX = Math.max(0, bb.originX - bb.width * pad)
            const cropY = Math.max(0, bb.originY - bb.height * pad)
            const cropW = Math.min(W - cropX, bb.width * (1 + 2 * pad))
            const cropH = Math.min(H - cropY, bb.height * (1 + 2 * pad))
            const cropCanvas = document.createElement('canvas')
            cropCanvas.width = Math.round(cropW)
            cropCanvas.height = Math.round(cropH)
            const cctx = cropCanvas.getContext('2d')
            if (cctx) {
              cctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
              const cropResult = tryDetect(cropCanvas, cropW, cropH)
              if (cropResult) {
                // Re-map crop-local coords back to image coords.
                const remap = (p: { x: number; y: number }) => ({
                  x: p.x + cropX,
                  y: p.y + cropY,
                })
                const remapped: NoseLandmarks = {
                  bridge:    remap(cropResult.bridge),
                  bridgeMid: remap(cropResult.bridgeMid),
                  midDorsum: remap(cropResult.midDorsum),
                  rhinion:   remap(cropResult.rhinion),
                  tip:       remap(cropResult.tip),
                  subtip:    remap(cropResult.subtip),
                  nostrilL:  remap(cropResult.nostrilL),
                  nostrilR:  remap(cropResult.nostrilR),
                  base:      remap(cropResult.base),
                  visibleAlar: cropResult.visibleAlar,
                  confidence: cropResult.confidence,
                  faceBoundingBox: {
                    x: cropResult.faceBoundingBox.x + cropX,
                    y: cropResult.faceBoundingBox.y + cropY,
                    width: cropResult.faceBoundingBox.width,
                    height: cropResult.faceBoundingBox.height,
                  },
                  source: 'auto',
                  anchors: cropResult.anchors.map(remap),
                  eyeOuterL: cropResult.eyeOuterL ? remap(cropResult.eyeOuterL) : undefined,
                  eyeOuterR: cropResult.eyeOuterR ? remap(cropResult.eyeOuterR) : undefined,
                  debugCandidates: cropResult.debugCandidates
                    ? Object.fromEntries(
                        Object.entries(cropResult.debugCandidates).map(([k, p]) => [k, remap(p)]),
                      )
                    : undefined,
                }
                const v = validateLandmarkSanity(remapped)
                if (v.ok) {
                  console.info('[useFaceLandmarks] detected via BlazeFace crop pass')
                  setDetectionStatus('detected')
                  return remapped
                }
                console.warn('[useFaceLandmarks] pass 2.5 (crop): rechazado por validación —', v.reason)
              }
            }
          }
        } catch (err) {
          console.warn('[useFaceLandmarks] pass 2.5 (crop) failed:', err)
        }
      }

      // ── Pass 3: horizontally flipped via HTMLCanvasElement ──
      try {
        const flipCanvas = document.createElement('canvas')
        flipCanvas.width  = W
        flipCanvas.height = H
        const ctx = flipCanvas.getContext('2d')
        if (!ctx) throw new Error('canvas 2d unavailable')
        ctx.translate(W, 0); ctx.scale(-1, 1)
        ctx.drawImage(img, 0, 0, W, H)
        const result = tryDetect(flipCanvas, W, H)
        if (result) {
          console.info('[useFaceLandmarks] detected on flipped')
          const unflip = (p: { x: number; y: number }) => ({ x: W - p.x, y: p.y })
          // Al hacer flip horizontal, el alar visible se intercambia: L↔R.
          const flippedVisibleAlar: 'L' | 'R' | 'both' =
            result.visibleAlar === 'L' ? 'R' :
            result.visibleAlar === 'R' ? 'L' : 'both'
          const flipped: NoseLandmarks = {
            bridge:    unflip(result.bridge),
            bridgeMid: unflip(result.bridgeMid),
            midDorsum: unflip(result.midDorsum),
            rhinion:   unflip(result.rhinion),
            tip:       unflip(result.tip),
            subtip:    unflip(result.subtip),
            nostrilL:  unflip(result.nostrilR),
            nostrilR:  unflip(result.nostrilL),
            base:      unflip(result.base),
            visibleAlar: flippedVisibleAlar,
            faceBoundingBox: {
              x: W - result.faceBoundingBox.x - result.faceBoundingBox.width,
              y: result.faceBoundingBox.y,
              width: result.faceBoundingBox.width,
              height: result.faceBoundingBox.height,
            },
            confidence: result.confidence,
            source: 'auto',
            anchors: result.anchors.map(a => ({ x: W - a.x, y: a.y })),
            // Al hacer flip horizontal, los ojos externos se intercambian.
            eyeOuterL: result.eyeOuterR
              ? { x: W - result.eyeOuterR.x, y: result.eyeOuterR.y }
              : undefined,
            eyeOuterR: result.eyeOuterL
              ? { x: W - result.eyeOuterL.x, y: result.eyeOuterL.y }
              : undefined,
            debugCandidates: result.debugCandidates
              ? Object.fromEntries(
                  Object.entries(result.debugCandidates).map(([k, p]) => [
                    k,
                    { x: W - p.x, y: p.y },
                  ]),
                )
              : undefined,
          }
          const v = validateLandmarkSanity(flipped)
          if (v.ok) {
            setDetectionStatus('detected')
            return flipped
          }
          console.warn('[useFaceLandmarks] pass 3 (flip): rechazado por validación —', v.reason)
        }
      } catch (err) {
        console.warn('[useFaceLandmarks] pass 3 (flip) failed:', err)
      }

      setDetectionStatus('not_detected')
      return null
    },
    [tryDetect]
  )

  return {
    detectNoseLandmarks,
    isReady: () => readyRef.current,
    detectionStatus,
    setDetectionStatus,
    deriveAnchorsFromBbox,
  }
}
