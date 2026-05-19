'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { useSimulator } from './SimulatorContext'
import { useCanvas } from '@/lib/canvas/useCanvas'
import { useLiquify } from '@/lib/canvas/useLiquify'
import { CanvasToolbar } from './CanvasToolbar'
import { HudOverlay } from './HudOverlay'
import { AnnotationLayer } from './AnnotationLayer'
import { DrawingLayer } from './DrawingLayer'
import type { ControlPoint } from '@/lib/canvas/types'
import type { ActiveProcedure } from './types'

const CONTROL_POINT_RADIUS = 80

function buildControlPoints(
  activeProcedures: ActiveProcedure[],
  canvasWidth: number,
  canvasHeight: number,
): ControlPoint[] {
  const points: ControlPoint[] = []

  activeProcedures.forEach(proc => {
    if (proc.procedimiento !== 'RINOPLASTIA') return
    const scale = proc.intensity / 100
    const cx = canvasWidth * 0.5
    const gibaNasal = proc.sliderValues['giba-nasal'] ?? 0
    const proyeccion = proc.sliderValues['proyeccion-punta'] ?? 0
    const rotacion = proc.sliderValues['rotacion-punta'] ?? 0

    if (gibaNasal !== 0) {
      points.push({ x: cx, y: canvasHeight * 0.35, dx: 0, dy: gibaNasal * scale, radius: CONTROL_POINT_RADIUS })
    }
    if (proyeccion !== 0 || rotacion !== 0) {
      points.push({ x: cx, y: canvasHeight * 0.55, dx: rotacion * scale * 0.5, dy: -proyeccion * scale, radius: CONTROL_POINT_RADIUS })
    }
  })

  return points
}

export function CanvasWorkspace() {
  const { state, setImage } = useSimulator()
  const { canvasRef, loadImage } = useCanvas()
  const { initWorker, applyConfig } = useLiquify()
  const offscreenRef = useRef<OffscreenCanvas | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })

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
    const canvas = canvasRef.current
    if (!canvas || !offscreenRef.current || !state.imageUrl) return
    if (state.canvasMode === 'original') return

    const controlPoints = buildControlPoints(
      state.activeProcedures,
      canvas.width,
      canvas.height,
    )
    applyConfig({ width: canvas.width, height: canvas.height, controlPoints })
  }, [state.activeProcedures, state.canvasMode, applyConfig, state.imageUrl, canvasRef])

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
        const canvas = canvasRef.current!
        const offscreen = canvas.transferControlToOffscreen()
        offscreenRef.current = offscreen
        await initWorker(offscreen, imageData)
        setImage(url)
      } catch (err) {
        console.error('Error loading image:', err)
      }
    }
    input.click()
  }, [loadImage, initWorker, setImage, canvasRef])

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: '#F5F3FF' }}>
      <CanvasToolbar onUploadPhoto={handleUploadPhoto} />

      <div
        ref={containerRef}
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: 'linear-gradient(rgba(102,126,234,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(102,126,234,0.04) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        {!state.imageUrl ? (
          <div className="text-center">
            <p className="text-[0.85rem] font-semibold text-[#1E1B4B] mb-1.5">Sin fotografía</p>
            <p className="text-[0.75rem] text-[#9CA3AF] mb-4">Sube una foto del paciente para comenzar la simulación</p>
            <button onClick={handleUploadPhoto} className="btn-primary">
              📷 Subir foto
            </button>
          </div>
        ) : (
          <div
            className="relative rounded-xl overflow-hidden"
            style={{ boxShadow: '0 8px 32px rgba(30,27,75,0.12)' }}
          >
            <canvas ref={canvasRef} className="block max-w-full max-h-full" />
            {state.hudVisible && (
              <HudOverlay width={containerSize.w} height={containerSize.h} />
            )}
            <AnnotationLayer width={containerSize.w} height={containerSize.h} />
            <DrawingLayer width={containerSize.w} height={containerSize.h} />
          </div>
        )}
      </div>
    </div>
  )
}
