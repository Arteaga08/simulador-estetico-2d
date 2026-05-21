'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { useSimulator } from './SimulatorContext'
import { useCanvas } from '@/lib/canvas/useCanvas'
import { useFaceLandmarks } from '@/lib/canvas/useFaceLandmarks'
import type { NoseLandmarks, DetectionStatus } from '@/lib/canvas/useFaceLandmarks'
import { useRhinoplastyEngine } from '@/hooks/useRhinoplastyEngine'
import { CanvasToolbar } from './CanvasToolbar'
import { HudOverlay } from './HudOverlay'
import { AnnotationLayer } from './AnnotationLayer'
import { DrawingLayer } from './DrawingLayer'
import { NoseLandmarksOverlay, type LandmarkKey } from './NoseLandmarksOverlay'
import { classifyFaceView } from '@/utils/viewClassifier'

// ─── Manual placement ─────────────────────────────────────────────────────────

export interface ManualStep {
  key: LandmarkKey
  label: string
  hint: string
}

export const MANUAL_STEPS: ManualStep[] = [
  { key: 'bridge',    label: 'Puente nasal (alto)',  hint: 'Entre los ojos, parte alta del puente' },
  { key: 'bridgeMid', label: 'Puente nasal (medio)', hint: 'Mitad del dorso de la nariz' },
  { key: 'tip',       label: 'Punta de la nariz',    hint: 'El punto más prominente al frente' },
  { key: 'nostrilL',  label: 'Fosa izquierda',       hint: 'Borde exterior izquierdo (en pantalla)' },
  { key: 'nostrilR',  label: 'Fosa derecha',         hint: 'Borde exterior derecho (en pantalla)' },
  { key: 'base',      label: 'Base / columela',      hint: 'Punto central entre las dos fosas' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createEmptyLandmarks(W: number, H: number): NoseLandmarks {
  const zero = { x: 0, y: 0 }
  return {
    bridge: zero, bridgeMid: zero, tip: zero,
    nostrilL: zero, nostrilR: zero, base: zero,
    confidence: 0,
    faceBoundingBox: { x: 0, y: 0, width: W, height: H },
    source: 'manual',
    anchors: [],
  }
}

function computeFaceBboxFromNose(
  nose: NoseLandmarks,
  W: number,
  H: number,
): NoseLandmarks['faceBoundingBox'] {
  const noseW = Math.abs(nose.nostrilR.x - nose.nostrilL.x)
  const noseH = Math.abs(nose.base.y    - nose.bridge.y)
  const cx = (nose.nostrilL.x + nose.nostrilR.x) / 2
  const cy = (nose.bridge.y    + nose.base.y)    / 2
  const faceW = Math.max(noseW * 3.5, W * 0.2)
  const faceH = Math.max(noseH * 3.5, H * 0.2)
  return {
    x: Math.max(0, cx - faceW / 2),
    y: Math.max(0, cy - faceH / 2),
    width:  Math.min(faceW, W),
    height: Math.min(faceH, H),
  }
}

function eventToCanvasPx(
  e: { clientX: number; clientY: number },
  innerEl: HTMLElement,
  canvas: HTMLCanvasElement,
) {
  const rect = innerEl.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return null
  const sx = canvas.width  / rect.width
  const sy = canvas.height / rect.height
  return {
    x: (e.clientX - rect.left) * sx,
    y: (e.clientY - rect.top)  * sy,
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CanvasWorkspace() {
  const { state, setImage, setCurrentView } = useSimulator()
  const { canvasRef, loadImage } = useCanvas()
  const { detectNoseLandmarks, detectionStatus, setDetectionStatus, deriveAnchorsFromBbox } = useFaceLandmarks()
  const { initWorker, applyRhinoplasty, applyBrushStroke, reset } = useRhinoplastyEngine()

  const offscreenRef      = useRef<OffscreenCanvas | null>(null)
  const containerRef      = useRef<HTMLDivElement>(null)
  const innerContainerRef = useRef<HTMLDivElement>(null)
  const noseLandmarksRef  = useRef<NoseLandmarks | null>(null)
  const brushStrokesRef   = useRef<Array<{ px: number; py: number; qx: number; qy: number }>>([])
  const brushActiveRef    = useRef(false)
  const panActiveRef      = useRef(false)
  const draggingRef       = useRef<LandmarkKey | null>(null)

  const [containerSize, setContainerSize]   = useState({ w: 0, h: 0 })
  const [, forceUpdate]                     = useState(0)
  const [cursorPos, setCursorPos]           = useState<{ x: number; y: number } | null>(null)
  const [cursorVisible, setCursorVisible]   = useState(false)
  const [panOffset, setPanOffset]           = useState({ x: 0, y: 0 })
  const [manualStep, setManualStep]         = useState<number | null>(null)
  const panStartRef = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null)

  // Trigger liquify re-apply whenever procedures or landmarks change.
  // In 'original' mode we reset the worker so the canvas shows the undeformed image.
  const triggerApply = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !offscreenRef.current) return
    if (state.canvasMode === 'original') {
      reset()
      return
    }
    applyRhinoplasty({
      activeProcedures: state.activeProcedures,
      canvasW: canvas.width,
      canvasH: canvas.height,
      nose: noseLandmarksRef.current,
    })
  }, [state.activeProcedures, state.canvasMode, applyRhinoplasty, reset, canvasRef])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setContainerSize({ w: Math.floor(width), h: Math.floor(height) })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    triggerApply()
  }, [triggerApply])

  const handleUploadPhoto = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/webp'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const url = URL.createObjectURL(file)
      try {
        const imageData = await loadImage(url)
        const imgEl = new Image()
        imgEl.src = url
        await new Promise<void>(r => { imgEl.onload = () => r() })
        const detected = await detectNoseLandmarks(imgEl)

        const canvas = canvasRef.current!
        if (detected) {
          noseLandmarksRef.current = detected
          setCurrentView(classifyFaceView(detected))
          setManualStep(null)
        } else {
          noseLandmarksRef.current = createEmptyLandmarks(canvas.width, canvas.height)
          setCurrentView(null)
          setManualStep(0)
        }
        forceUpdate(n => n + 1)
        brushStrokesRef.current = []

        const offscreen = canvas.transferControlToOffscreen()
        offscreenRef.current = offscreen
        await initWorker(offscreen, imageData)
        setImage(url)
        setPanOffset({ x: 0, y: 0 })

        if (detected) triggerApply()
      } catch (err) {
        console.error('Error loading image:', err)
      }
    }
    input.click()
  }, [loadImage, initWorker, setImage, canvasRef, detectNoseLandmarks, triggerApply])

  const restartManual = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    noseLandmarksRef.current = createEmptyLandmarks(canvas.width, canvas.height)
    setManualStep(0)
    forceUpdate(n => n + 1)
    void reset()
  }, [canvasRef, reset])

  // ── Landmark drag (window-level) ─────────────────────────────────────────

  const handleLandmarkPointerDown = useCallback((key: LandmarkKey, e: React.PointerEvent<SVGCircleElement>) => {
    e.stopPropagation(); e.preventDefault()
    draggingRef.current = key
    forceUpdate(n => n + 1)
  }, [])

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const key = draggingRef.current
      if (!key) return
      const innerEl = innerContainerRef.current
      const canvas  = canvasRef.current
      if (!innerEl || !canvas || !noseLandmarksRef.current) return
      const pt = eventToCanvasPx(e, innerEl, canvas)
      if (!pt) return
      noseLandmarksRef.current = { ...noseLandmarksRef.current, [key]: { x: pt.x, y: pt.y } }
      forceUpdate(n => n + 1)
    }
    function onUp() {
      if (!draggingRef.current) return
      draggingRef.current = null
      forceUpdate(n => n + 1)
      triggerApply()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [canvasRef, triggerApply])

  // ── Mouse handlers ───────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (manualStep !== null) {
      const canvas  = canvasRef.current
      const innerEl = innerContainerRef.current
      if (!canvas || !innerEl) return
      const pt = eventToCanvasPx(e, innerEl, canvas)
      if (!pt) return
      const step = MANUAL_STEPS[manualStep]
      const base = noseLandmarksRef.current ?? createEmptyLandmarks(canvas.width, canvas.height)
      const updated: NoseLandmarks = { ...base, [step.key]: { x: pt.x, y: pt.y } }

      if (manualStep === MANUAL_STEPS.length - 1) {
        updated.faceBoundingBox = computeFaceBboxFromNose(updated, canvas.width, canvas.height)
        // Derive approximate anchors from the bbox since we only have nose points
        updated.anchors = deriveAnchorsFromBbox(updated.faceBoundingBox)
        noseLandmarksRef.current = updated
        setCurrentView(classifyFaceView(updated))
        setManualStep(null)
        setDetectionStatus('detected')
        setTimeout(() => { forceUpdate(n => n + 1); triggerApply() }, 0)
      } else {
        noseLandmarksRef.current = updated
        setManualStep(manualStep + 1)
        forceUpdate(n => n + 1)
      }
      e.preventDefault()
      return
    }

    if (state.activeTool === 'broca') {
      brushActiveRef.current = true; e.preventDefault()
    } else if (state.activeTool === 'pan') {
      panActiveRef.current = true
      panStartRef.current = { mx: e.clientX, my: e.clientY, ox: panOffset.x, oy: panOffset.y }
      e.preventDefault()
    }
  }, [state.activeTool, panOffset, manualStep, canvasRef, setDetectionStatus, triggerApply, deriveAnchorsFromBbox])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (manualStep !== null || draggingRef.current) return

    if (state.activeTool === 'pan' && panActiveRef.current && panStartRef.current) {
      setPanOffset({
        x: panStartRef.current.ox + e.clientX - panStartRef.current.mx,
        y: panStartRef.current.oy + e.clientY - panStartRef.current.my,
      })
      return
    }

    if (state.activeTool === 'broca') {
      const rect = e.currentTarget.getBoundingClientRect()
      setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }

    if (!brushActiveRef.current || state.activeTool !== 'broca') return
    const canvas = canvasRef.current
    if (!canvas) return
    const innerEl = innerContainerRef.current
    if (!innerEl) return
    const pt = eventToCanvasPx(e, innerEl, canvas)
    if (!pt) return
    const refSize = Math.min(canvas.width, canvas.height)
    const intensity = (state.activeProcedures[state.selectedProcedureIndex]?.intensity ?? 70) / 100

    // Build broca MLS control point: pixel moved by mouse delta
    const scaleX = canvas.width  / innerEl.getBoundingClientRect().width
    const scaleY = canvas.height / innerEl.getBoundingClientRect().height
    const radius = refSize * state.brushRadius

    // Push the source pixel (qx, qy) to the destination (px, py = qx + delta)
    brushStrokesRef.current = [
      ...brushStrokesRef.current.slice(-30),
      {
        px: pt.x + e.movementX * scaleX * intensity * 1.5,
        py: pt.y + e.movementY * scaleY * intensity * 1.5,
        qx: pt.x,
        qy: pt.y,
      },
    ]
    // For broca we still want local influence, so add soft anchors around the stroke
    // to prevent faraway deformation (MLS is global otherwise).
    // We add 4 anchors at radius distance in cardinal directions.
    const anchors = [
      { px: pt.x + radius, py: pt.y,          qx: pt.x + radius, qy: pt.y },
      { px: pt.x - radius, py: pt.y,          qx: pt.x - radius, qy: pt.y },
      { px: pt.x,          py: pt.y + radius, qx: pt.x,          qy: pt.y + radius },
      { px: pt.x,          py: pt.y - radius, qx: pt.x,          qy: pt.y - radius },
    ]
    applyBrushStroke([...brushStrokesRef.current, ...anchors], canvas.width, canvas.height)
  }, [state.activeTool, state.activeProcedures, state.selectedProcedureIndex, state.brushRadius, canvasRef, applyBrushStroke, manualStep])

  const handleMouseUp = useCallback(() => {
    brushActiveRef.current = false
    panActiveRef.current = false
    panStartRef.current = null
  }, [])

  const handleMouseLeave = useCallback(() => {
    brushActiveRef.current = false
    panActiveRef.current = false
    panStartRef.current = null
    setCursorVisible(false)
  }, [])

  const handleMouseEnter = useCallback(() => {
    if (state.activeTool === 'broca' && manualStep === null) setCursorVisible(true)
  }, [state.activeTool, manualStep])

  // ── Brush display radius ─────────────────────────────────────────────────

  const displayRadius = (() => {
    const canvas = canvasRef.current
    const container = innerContainerRef.current
    if (!canvas || !container) return 0
    const rect = container.getBoundingClientRect()
    if (rect.width === 0) return 0
    return Math.min(canvas.width, canvas.height) * state.brushRadius * (rect.width / canvas.width)
  })()

  const canvasCursor = manualStep !== null
    ? 'crosshair'
    : draggingRef.current
      ? 'grabbing'
      : state.activeTool === 'broca'
        ? 'none'
        : state.activeTool === 'pan'
          ? (panActiveRef.current ? 'grabbing' : 'grab')
          : undefined

  const canvasWidth  = canvasRef.current?.width  ?? 0
  const canvasHeight = canvasRef.current?.height ?? 0

  const effectiveStatus: DetectionStatus = manualStep !== null
    ? 'detecting'
    : (noseLandmarksRef.current?.source === 'manual' ? 'detected' : detectionStatus)

  const hasLandmarks = noseLandmarksRef.current !== null
  const placedSteps  = manualStep ?? MANUAL_STEPS.length

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: '#F5F3FF' }}>
      <CanvasToolbar
        onUploadPhoto={handleUploadPhoto}
        detectionStatus={effectiveStatus}
        manualStep={manualStep}
        canRestartManual={hasLandmarks}
        onRestartManual={restartManual}
      />

      <div
        ref={containerRef}
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: 'linear-gradient(rgba(102,126,234,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(102,126,234,0.04) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        {!state.imageUrl && (
          <div className="text-center absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-[0.85rem] font-semibold text-text-primary mb-1.5">Sin fotografía</p>
            <p className="text-[0.75rem] text-[#9CA3AF] mb-4">Sube una foto del paciente para comenzar la simulación</p>
            <button onClick={handleUploadPhoto} className="btn-primary pointer-events-auto">
              📷 Subir foto
            </button>
          </div>
        )}

        <div
          style={{
            display: state.imageUrl ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth:  containerSize.w > 0 ? `${containerSize.w}px` : undefined,
            maxHeight: containerSize.h > 0 ? `${containerSize.h}px` : undefined,
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onMouseEnter={handleMouseEnter}
        >
          <div
            ref={innerContainerRef}
            className="relative rounded-xl overflow-hidden"
            style={{
              boxShadow: '0 8px 32px rgba(30,27,75,0.12)',
              transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
              cursor: canvasCursor,
              maxWidth:  '100%',
              maxHeight: '100%',
              flexShrink: 0,
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: '100%',
                visibility: state.canvasMode === 'original' ? 'hidden' : 'visible',
                clipPath: state.canvasMode === 'split' ? 'inset(0 0 0 50%)' : undefined,
              }}
            />

            {state.activeTool === 'broca' && manualStep === null && cursorVisible && cursorPos && displayRadius > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: cursorPos.x - displayRadius,
                  top:  cursorPos.y - displayRadius,
                  width:  displayRadius * 2,
                  height: displayRadius * 2,
                  borderRadius: '50%',
                  border: '1.5px solid rgba(102, 126, 234, 0.8)',
                  background: 'rgba(102, 126, 234, 0.08)',
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
              />
            )}

            {state.imageUrl && state.canvasMode !== 'simulation' && (
              <img
                src={state.imageUrl}
                alt="Original"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                style={{ clipPath: state.canvasMode === 'split' ? 'inset(0 50% 0 0)' : undefined }}
              />
            )}
            {state.canvasMode === 'split' && state.imageUrl && (
              <>
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{ left: '50%', width: '2px', background: 'linear-gradient(180deg, #4FACFE, #667EEA)' }}
                />
                <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 11, fontWeight: 700, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.5)', pointerEvents: 'none' }}>
                  Original
                </span>
                <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 11, fontWeight: 700, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.5)', pointerEvents: 'none' }}>
                  Simulación
                </span>
              </>
            )}

            {state.showLandmarks && noseLandmarksRef.current && canvasWidth > 0 && (
              <NoseLandmarksOverlay
                landmarks={noseLandmarksRef.current}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                manualStep={manualStep}
                placedSteps={placedSteps}
                onLandmarkPointerDown={handleLandmarkPointerDown}
              />
            )}

            {state.hudVisible && (
              <HudOverlay width={containerSize.w} height={containerSize.h} />
            )}
            <AnnotationLayer width={containerSize.w} height={containerSize.h} />
            <DrawingLayer width={containerSize.w} height={containerSize.h} />
          </div>

          {manualStep !== null && (
            <div
              style={{
                position: 'absolute',
                top: 12, left: 12,
                background: 'rgba(17, 24, 39, 0.92)',
                color: 'white',
                padding: '12px 14px',
                borderRadius: 10,
                maxWidth: 280,
                zIndex: 30,
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                pointerEvents: 'auto',
              }}
            >
              <div style={{ fontSize: 11, opacity: 0.65, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Paso {manualStep + 1} de {MANUAL_STEPS.length}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                {MANUAL_STEPS[manualStep].label}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6, lineHeight: 1.4 }}>
                {MANUAL_STEPS[manualStep].hint}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  onClick={() => setManualStep(Math.max(0, manualStep - 1))}
                  disabled={manualStep === 0}
                  style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', cursor: manualStep === 0 ? 'not-allowed' : 'pointer', opacity: manualStep === 0 ? 0.4 : 1 }}
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setManualStep(null)}
                  style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
