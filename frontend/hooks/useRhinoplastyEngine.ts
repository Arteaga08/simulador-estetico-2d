'use client'

import { useRef, useEffect, useCallback } from 'react'
import { useLiquify } from '@/lib/canvas/useLiquify'
import type { NoseLandmarks } from '@/lib/canvas/useFaceLandmarks'
import type { ActiveProcedure, PatientGender } from '@/components/simulator/types'
import { buildRhinoplastyControlPoints } from '@/utils/surgicalLimits'

interface RhinoplastyConfig {
  activeProcedures: ActiveProcedure[]
  canvasW: number
  canvasH: number
  nose: NoseLandmarks | null
  patientGender: PatientGender
}

interface UseRhinoplastyEngineReturn {
  initWorker: (canvas: OffscreenCanvas, imageData: ImageData) => Promise<void>
  applyRhinoplasty: (cfg: RhinoplastyConfig) => void
  applyBrushStroke: (pts: Array<{ px: number; py: number; qx: number; qy: number }>, canvasW: number, canvasH: number) => void
  reset: () => Promise<void>
}

/**
 * Wraps useLiquify with RAF-based debouncing and rhinoplasty-specific
 * control point generation via surgicalLimits.
 *
 * The RAF loop ensures that rapid slider changes do not flood the worker —
 * only the latest state is dispatched each animation frame.
 */
export function useRhinoplastyEngine(): UseRhinoplastyEngineReturn {
  const { initWorker, applyConfig, reset } = useLiquify()

  // Pending work — updated synchronously, dispatched next RAF tick
  const pendingRef  = useRef(false)
  const cfgRef      = useRef<RhinoplastyConfig | null>(null)
  const rafRef      = useRef<number | null>(null)
  const brushRef    = useRef<{ pts: Array<{ px: number; py: number; qx: number; qy: number }>; w: number; h: number } | null>(null)

  // RAF loop — runs at 60 FPS, dispatches only when there's new work
  const frameLoop = useCallback(() => {
    if (pendingRef.current) {
      pendingRef.current = false
      const cfg = cfgRef.current
      if (cfg && cfg.nose) {
        // Find the RINOPLASTIA procedure in the active list
        const rhinoProc = cfg.activeProcedures.find(p => p.procedimiento === 'RINOPLASTIA')
        if (rhinoProc) {
          const { points, noseBbox } = buildRhinoplastyControlPoints(
            rhinoProc.sliderValues,
            rhinoProc.intensity,
            cfg.nose,
            cfg.canvasW,
            cfg.canvasH,
            cfg.patientGender,
          )
          applyConfig({ width: cfg.canvasW, height: cfg.canvasH, controlPoints: points, noseBbox })
        }
      }

      // Broca brush takes over when present (no noseBbox — full image)
      const brush = brushRef.current
      if (brush && brush.pts.length > 0) {
        applyConfig({ width: brush.w, height: brush.h, controlPoints: brush.pts, noseBbox: null })
      }
    }
    rafRef.current = requestAnimationFrame(frameLoop)
  }, [applyConfig])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(frameLoop)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [frameLoop])

  const applyRhinoplasty = useCallback((cfg: RhinoplastyConfig) => {
    cfgRef.current = cfg
    brushRef.current = null
    pendingRef.current = true
  }, [])

  const applyBrushStroke = useCallback(
    (pts: Array<{ px: number; py: number; qx: number; qy: number }>, canvasW: number, canvasH: number) => {
      brushRef.current = { pts, w: canvasW, h: canvasH }
      pendingRef.current = true
    },
    []
  )

  return { initWorker, applyRhinoplasty, applyBrushStroke, reset }
}
