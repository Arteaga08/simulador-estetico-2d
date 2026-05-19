'use client'

import { useSimulator } from './SimulatorContext'
import type { CanvasMode } from './types'

interface CanvasToolbarProps {
  onUploadPhoto: () => void
}

const MODES: Array<{ id: CanvasMode; label: string }> = [
  { id: 'original',   label: 'Original' },
  { id: 'simulation', label: 'Simulación' },
  { id: 'split',      label: 'Split' },
]

export function CanvasToolbar({ onUploadPhoto }: CanvasToolbarProps) {
  const { state, setCanvasMode, setHudVisible } = useSimulator()

  return (
    <div
      className="h-10 bg-white border-b flex items-center px-3 gap-1.5 shrink-0 border-border"
    >
      {(['🔍 Zoom', '✋ Pan'] as const).map(label => (
        <button
          key={label}
          className="px-2.5 rounded-md text-[0.72rem] font-medium text-[#9CA3AF] hover:bg-[#F9FAFB] transition-colors"
          style={{ height: '26px' }}
        >
          {label}
        </button>
      ))}

      <div className="w-px bg-border mx-0.5" style={{ height: '18px' }} />

      {/* Mode toggle */}
      <div className="flex bg-[#F9FAFB] rounded-lg p-0.5 border border-border">
        {MODES.map(mode => (
          <button
            key={mode.id}
            onClick={() => setCanvasMode(mode.id)}
            className="px-2.5 rounded-md text-[0.67rem] font-semibold transition-colors"
            style={{
              height: '24px',
              background: state.canvasMode === mode.id ? 'white' : 'transparent',
              color: state.canvasMode === mode.id ? '#4338CA' : '#9CA3AF',
              boxShadow: state.canvasMode === mode.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => setHudVisible(!state.hudVisible)}
        className="px-2.5 rounded-md text-[0.72rem] font-medium transition-colors"
        style={{
          height: '26px',
          background: state.hudVisible ? '#EEF2FF' : 'transparent',
          color: state.hudVisible ? '#4338CA' : '#9CA3AF',
          border: state.hudVisible ? '1px solid #C7D2FE' : '1px solid transparent',
        }}
      >
        ⊞ HUD
      </button>

      <div className="ml-auto">
        <button
          onClick={onUploadPhoto}
          className="btn-secondary text-[0.72rem]"
          style={{ height: '26px' }}
        >
          📷 Subir foto
        </button>
      </div>
    </div>
  )
}
