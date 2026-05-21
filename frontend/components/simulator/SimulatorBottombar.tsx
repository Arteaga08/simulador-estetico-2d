'use client'

import { useSaveSession } from '@/lib/canvas/useSaveSession'
import {
  ArrowCounterClockwise,
  Ruler,
  FilePdf,
  ShareNetwork,
  FloppyDisk,
  CircleNotch,
} from '@phosphor-icons/react'

interface SimulatorBottombarProps {
  onExportPDF: () => void
  onShare: () => void
}

export function SimulatorBottombar({ onExportPDF, onShare }: SimulatorBottombarProps) {
  const { save, isSaving } = useSaveSession()

  const ghostBtn = {
    base: 'flex items-center gap-1.5 text-[13px] font-medium px-2.5 rounded-lg border border-transparent text-text-muted',
    hover: { background: '#F9FAFB', borderColor: '#E9D5FF' },
    leave: { background: 'transparent', borderColor: 'transparent' },
    style: { height: '30px', transition: 'background 150ms var(--ease-out), border-color 150ms var(--ease-out)' } as React.CSSProperties,
  }

  const outlineBtn = {
    base: 'flex items-center gap-1.5 text-[13px] font-medium px-2.5 rounded-lg border border-border bg-white text-text-muted',
    style: { height: '30px', transition: 'background 150ms var(--ease-out)' } as React.CSSProperties,
  }

  return (
    <footer
      className="bg-white border-t flex items-center px-3.5 gap-1.5 shrink-0"
      style={{ height: '52px', borderColor: '#E9D5FF' }}
    >
      {/* Left actions */}
      <button
        className={ghostBtn.base}
        style={ghostBtn.style}
        onMouseEnter={e => Object.assign(e.currentTarget.style, ghostBtn.hover)}
        onMouseLeave={e => Object.assign(e.currentTarget.style, ghostBtn.leave)}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <ArrowCounterClockwise size={13} />
        Reset
      </button>

      <button
        className={ghostBtn.base}
        style={ghostBtn.style}
        onMouseEnter={e => Object.assign(e.currentTarget.style, ghostBtn.hover)}
        onMouseLeave={e => Object.assign(e.currentTarget.style, ghostBtn.leave)}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <Ruler size={13} />
        Ángulos
      </button>

      <div className="flex-1" />

      {/* Right actions */}
      <button
        onClick={onExportPDF}
        className={outlineBtn.base}
        style={outlineBtn.style}
        onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'white' }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <FilePdf size={13} />
        Exportar PDF
      </button>

      <button
        onClick={onShare}
        className={outlineBtn.base}
        style={outlineBtn.style}
        onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'white' }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <ShareNetwork size={13} />
        Compartir
      </button>

      <button
        onClick={save}
        disabled={isSaving}
        className="flex items-center gap-1.5 text-[13px] font-semibold px-3 rounded-lg bg-indigo text-white disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          height: '30px',
          transition: 'background 150ms var(--ease-out), transform 100ms var(--ease-out)',
        }}
        onMouseEnter={e => { if (!isSaving) e.currentTarget.style.background = '#4338CA' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#667EEA' }}
        onMouseDown={e => { if (!isSaving) e.currentTarget.style.transform = 'scale(0.97)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        {isSaving
          ? <CircleNotch size={13} className="animate-spin" />
          : <FloppyDisk size={13} />
        }
        {isSaving ? 'Guardando…' : 'Guardar sesión'}
      </button>
    </footer>
  )
}
