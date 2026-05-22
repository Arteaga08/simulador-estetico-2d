'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { FaceLandmarker, FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'

// MediaPipe 468-point face mesh — nose indices (verificados empíricamente
// 2026-05-20 con overlay de candidatos sobre fotos reales):
//   6   = Radix verdadero (nasion / inicio del puente nasal)
//   4   = Supratip (justo encima de la punta — usado como bridgeMid p/co-rotación)
//   1   = Tip (Pronasal)
//   102 = Alar-facial groove izquierda (base alar lateral)
//   331 = Alar-facial groove derecha
//   2   = Subnasal (base de la columela)
//
// Iteraciones previas (descartadas):
//   - lm[168] como Radix: cae al nivel de las cejas, demasiado alto
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
  tip:       { x: number; y: number }
  nostrilL:  { x: number; y: number }
  nostrilR:  { x: number; y: number }
  base:      { x: number; y: number }
  confidence: number
  faceBoundingBox: { x: number; y: number; width: number; height: number }
  source: 'auto' | 'manual'
  /** Face anchor points for MLS rigid deformation (forehead, eye corners, cheeks, chin) */
  anchors: Array<{ x: number; y: number }>
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
        minFaceDetectionConfidence: 0.3,
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
          minDetectionConfidence: 0.3,
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

      const bridge    = { x: lm[6].x   * outputW, y: lm[6].y   * outputH }
      const bridgeMid = { x: lm[4].x   * outputW, y: lm[4].y   * outputH }
      const tip       = { x: lm[1].x   * outputW, y: lm[1].y   * outputH }
      const nostrilL  = { x: lm[102].x * outputW, y: lm[102].y * outputH }
      const nostrilR  = { x: lm[331].x * outputW, y: lm[331].y * outputH }
      const base      = { x: lm[2].x   * outputW, y: lm[2].y   * outputH }

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

      return {
        bridge, bridgeMid, tip, nostrilL, nostrilR, base,
        confidence: 1.0,
        faceBoundingBox,
        source: 'auto',
        anchors,
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
        if (result) { setDetectionStatus('detected'); return result }
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
          if (result) { console.info('[useFaceLandmarks] detected on resized'); setDetectionStatus('detected'); return result }
        } catch (err) {
          console.warn('[useFaceLandmarks] pass 2 (resize) failed:', err)
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
          const flipped: NoseLandmarks = {
            bridge:    unflip(result.bridge),
            bridgeMid: unflip(result.bridgeMid),
            tip:       unflip(result.tip),
            nostrilL:  unflip(result.nostrilR),
            nostrilR:  unflip(result.nostrilL),
            base:      unflip(result.base),
            faceBoundingBox: {
              x: W - result.faceBoundingBox.x - result.faceBoundingBox.width,
              y: result.faceBoundingBox.y,
              width: result.faceBoundingBox.width,
              height: result.faceBoundingBox.height,
            },
            confidence: result.confidence,
            source: 'auto',
            anchors: result.anchors.map(a => ({ x: W - a.x, y: a.y })),
          }
          setDetectionStatus('detected')
          return flipped
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
