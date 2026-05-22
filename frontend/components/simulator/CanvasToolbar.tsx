'use client'

import { useSimulator } from './SimulatorContext'
import type { CanvasMode } from './types'
import type { DetectionStatus } from '@/lib/canvas/useFaceLandmarks'
import { MANUAL_STEPS } from './CanvasWorkspace'
import { MagnifyingGlassPlus, HandGrabbing, GridFour, Camera, Crosshair, Eye, EyeSlash } from '@phosphor-icons/react'

interface CanvasToolbarProps {
  onUploadPhoto: () => void
  detectionStatus?: DetectionStatus
  manualStep: number | null
  canRestartManual: boolean
  onRestartManual: () => void
}

const MODES: Array<{ id: CanvasMode; label: string }> = [
  { id: 'original',   label: 'Original' },
  { id: 'simulation', label: 'Simulación' },
  { id: 'split',      label: 'Split' },
]

const iconBtn = {
  base: {
    height: '26px',
    padding: '0 8px',
    borderRadius: '6px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    border: '1px solid transparent',
    color: '#9CA3AF',
    background: 'transparent',
    transition: 'background 150ms var(--ease-out), color 150ms var(--ease-out)',
  } as React.CSSProperties,
}

interface PillStyle {
  bg: string
  color: string
  dot: string
  label: string
}

function buildPill(status: DetectionStatus | undefined, manualStep: number | null): PillStyle | null {
  if (manualStep !== null) {
    const step = MANUAL_STEPS[manualStep]
    return {
      bg: '#DBEAFE',
      color: '#1E40AF',
      dot: '#2563EB',
      label: `Coloca: ${step.label} (${manualStep + 1}/${MANUAL_STEPS.length})`,
    }
  }
  if (!status || status === 'idle') return null
  if (status === 'detecting') return { bg: '#FEF9C3', color: '#854D0E', dot: '#CA8A04', label: 'Detectando…' }
  if (status === 'detected')  return { bg: '#DCFCE7', color: '#15803D', dot: '#16A34A', label: 'Rostro detectado' }
  return { bg: '#FEE2E2', color: '#B91C1C', dot: '#DC2626', label: 'Rostro no detectado' }
}

export function CanvasToolbar({
  onUploadPhoto,
  detectionStatus,
  manualStep,
  canRestartManual,
  onRestartManual,
}: CanvasToolbarProps) {
  const { state, setCanvasMode, setHudVisible, setActiveTool, setBrushRadius, toggleLandmarks } = useSimulator()

  const pill = buildPill(detectionStatus, manualStep)
  const showRestartButton = canRestartManual && manualStep === null

  return (
    <div className="h-10 bg-white border-b border-border flex items-center px-3 gap-1.5 shrink-0">
      {/* View tools */}
      {[
        { Icon: MagnifyingGlassPlus, label: 'Zoom', tool: null as null },
        { Icon: HandGrabbing,        label: 'Pan',  tool: 'pan' as const },
      ].map(({ Icon, label, tool }) => {
        const isActive = tool && state.activeTool === tool
        return (
          <button
            key={label}
            title={label}
            onClick={() => tool && setActiveTool(state.activeTool === tool ? 'none' : tool)}
            style={{
              ...iconBtn.base,
              background: isActive ? '#EEF2FF' : 'transparent',
              color: isActive ? '#4338CA' : '#9CA3AF',
              border: isActive ? '1px solid #C7D2FE' : '1px solid transparent',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.background = '#F9FAFB'
                e.currentTarget.style.color = '#6B7280'
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#9CA3AF'
              }
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <Icon size={13} />
            {label}
          </button>
        )
      })}

      <div className="w-px bg-border mx-0.5" style={{ height: '16px' }} />

      {/* Mode toggle */}
      <div
        className="flex rounded-lg p-0.5 border border-border"
        style={{ background: '#F9FAFB' }}
      >
        {MODES.map(mode => {
          const isActive = state.canvasMode === mode.id
          return (
            <button
              key={mode.id}
              onClick={() => setCanvasMode(mode.id)}
              className="px-2.5 rounded-md text-[12px] font-semibold"
              style={{
                height: '22px',
                background: isActive ? 'white' : 'transparent',
                color: isActive ? '#4338CA' : '#9CA3AF',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'background 150ms var(--ease-out), color 150ms var(--ease-out), box-shadow 150ms var(--ease-out)',
              }}
            >
              {mode.label}
            </button>
          )
        })}
      </div>

      {/* HUD toggle */}
      <button
        onClick={() => setHudVisible(!state.hudVisible)}
        className="flex items-center gap-1.5 px-2.5 rounded-md text-[13px] font-medium border"
        style={{
          height: '26px',
          background: state.hudVisible ? '#EEF2FF' : 'transparent',
          color: state.hudVisible ? '#4338CA' : '#9CA3AF',
          borderColor: state.hudVisible ? '#C7D2FE' : 'transparent',
          transition: 'background 150ms var(--ease-out), color 150ms var(--ease-out), border-color 150ms var(--ease-out)',
        }}
      >
        <GridFour size={13} weight={state.hudVisible ? 'fill' : 'regular'} />
        HUD
      </button>

      {/* Landmarks toggle */}
      <button
        onClick={toggleLandmarks}
        title={state.showLandmarks ? 'Ocultar puntos de referencia' : 'Mostrar puntos de referencia'}
        className="flex items-center gap-1.5 px-2.5 rounded-md text-[13px] font-medium border"
        style={{
          height: '26px',
          background: state.showLandmarks ? '#EEF2FF' : 'transparent',
          color: state.showLandmarks ? '#4338CA' : '#9CA3AF',
          borderColor: state.showLandmarks ? '#C7D2FE' : 'transparent',
          transition: 'background 150ms var(--ease-out), color 150ms var(--ease-out), border-color 150ms var(--ease-out)',
        }}
      >
        {state.showLandmarks ? <Eye size={13} weight="fill" /> : <EyeSlash size={13} />}
        Puntos
      </button>

      {/* Brush size slider — only visible when broca tool is active */}
      {state.activeTool === 'broca' && (
        <div className="flex items-center gap-2 border border-border rounded-lg px-2.5" style={{ height: '26px' }}>
          <label className="text-[11px] font-semibold text-[#9CA3AF] whitespace-nowrap">Pincel</label>
          <input
            type="range"
            min={0.03}
            max={0.18}
            step={0.005}
            value={state.brushRadius}
            onChange={e => setBrushRadius(parseFloat(e.target.value))}
            className="w-20 accent-indigo-500"
            style={{ height: '4px' }}
          />
        </div>
      )}

      {/* Detection / manual-placement pill */}
      {pill && (
        <span
          className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: pill.bg, color: pill.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: pill.dot }} />
          {pill.label}
        </span>
      )}

      {/* View indicator pill */}
      {state.currentView && detectionStatus === 'detected' && (
        <span
          className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: state.currentView === 'perfil' ? '#EDE9FE' : '#E0F2FE',
            color: state.currentView === 'perfil' ? '#6D28D9' : '#0369A1',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: state.currentView === 'perfil' ? '#7C3AED' : '#0284C7' }}
          />
          {state.currentView === 'perfil' ? 'Vista perfil' : 'Vista frontal'}
        </span>
      )}

      {/* Recolocar puntos */}
      {showRestartButton && (
        <button
          onClick={onRestartManual}
          title="Recolocar los puntos de referencia de la nariz"
          className="flex items-center gap-1 px-2 rounded-md text-[11px] font-semibold border border-border text-text-muted bg-white"
          style={{ height: '22px', transition: 'background 150ms var(--ease-out), color 150ms var(--ease-out)' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.color = '#4338CA' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'white';  e.currentTarget.style.color = '' }}
        >
          <Crosshair size={11} />
          Recolocar puntos
        </button>
      )}

      <div className="ml-auto">
        <button
          onClick={onUploadPhoto}
          className="flex items-center gap-1.5 px-2.5 rounded-md text-[13px] font-medium border border-border bg-white text-text-muted"
          style={{
            height: '26px',
            transition: 'background 150ms var(--ease-out), color 150ms var(--ease-out)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'white' }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <Camera size={13} />
          Subir foto
        </button>
      </div>
    </div>
  )
}
