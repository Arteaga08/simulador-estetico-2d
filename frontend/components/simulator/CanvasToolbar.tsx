'use client'

import { useSimulator } from './SimulatorContext'
import type { CanvasMode } from './types'
import { MagnifyingGlassPlus, HandGrabbing, GridFour, Camera } from '@phosphor-icons/react'

interface CanvasToolbarProps {
  onUploadPhoto: () => void
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
    fontSize: '0.72rem',
    fontWeight: 500,
    cursor: 'pointer',
    border: '1px solid transparent',
    color: '#9CA3AF',
    background: 'transparent',
    transition: 'background 150ms var(--ease-out), color 150ms var(--ease-out)',
  } as React.CSSProperties,
}

export function CanvasToolbar({ onUploadPhoto }: CanvasToolbarProps) {
  const { state, setCanvasMode, setHudVisible } = useSimulator()

  return (
    <div className="h-10 bg-white border-b border-border flex items-center px-3 gap-1.5 shrink-0">
      {/* View tools */}
      {[
        { Icon: MagnifyingGlassPlus, label: 'Zoom' },
        { Icon: HandGrabbing,        label: 'Pan' },
      ].map(({ Icon, label }) => (
        <button
          key={label}
          title={label}
          style={iconBtn.base}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#F9FAFB'
            e.currentTarget.style.color = '#6B7280'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#9CA3AF'
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}

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
              className="px-2.5 rounded-md text-[0.67rem] font-semibold"
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
        className="flex items-center gap-1.5 px-2.5 rounded-md text-[0.72rem] font-medium border"
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

      <div className="ml-auto">
        <button
          onClick={onUploadPhoto}
          className="flex items-center gap-1.5 px-2.5 rounded-md text-[0.72rem] font-medium border border-border bg-white text-text-muted"
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
