'use client'

import { useSimulator } from './SimulatorContext'
import { PROCEDURE_LABELS, ALL_PROCEDURES } from '@/lib/procedures'
import type { Procedimiento } from './types'
import type { SimulatorState } from './types'
import {
  ArrowLeft,
  PushPin,
  Crosshair,
  Ruler,
  PencilSimple,
  Drop,
  Eye,
  Sparkle,
  Waves,
  ArrowFatUp,
  ArrowsOutSimple,
  MaskHappy,
  Syringe,
} from '@phosphor-icons/react'

const PROCEDURE_ICONS: Record<Procedimiento, React.ElementType> = {
  RINOPLASTIA:         Sparkle,
  LIFTING_CEJAS:       ArrowFatUp,
  AUMENTO_MENTON:      ArrowsOutSimple,
  AUMENTO_LABIOS:      Drop,
  LIFTING_CUELLO:      Waves,
  BLEFAROPLASTIA:      Eye,
  SUAVIZADO_PIEL:      MaskHappy,
  FEMINIZACION_FACIAL: Syringe,
}

const TOOLS: Array<{ id: SimulatorState['activeTool']; label: string; Icon: React.ElementType }> = [
  { id: 'pin',   label: 'Anotación',   Icon: PushPin },
  { id: 'hud',   label: 'Referencia',  Icon: Crosshair },
  { id: 'angle', label: 'Ángulos',     Icon: Ruler },
  { id: 'draw',  label: 'Dibujo',      Icon: PencilSimple },
]

export function ProcedureSidebar() {
  const { state, addProcedure, removeProcedure, setActiveTool } = useSimulator()
  const { activeProcedures, activeTool } = state
  const activeProcNames = activeProcedures.map(p => p.procedimiento)

  function toggleProcedure(proc: Procedimiento) {
    if (activeProcNames.includes(proc)) {
      removeProcedure(proc)
    } else {
      addProcedure(proc)
    }
  }

  return (
    <aside
      className="flex flex-col shrink-0 overflow-y-auto"
      style={{ width: '220px', backgroundColor: '#1E1B4B' }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-4 shrink-0"
        style={{ height: '44px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="w-5 h-5 rounded-md shrink-0"
          style={{ background: 'linear-gradient(135deg, #4FACFE, #667EEA)' }}
        />
        <span className="text-[0.8rem] font-bold text-white tracking-[-0.01em]">LuminaMD</span>
      </div>

      {/* Procedures */}
      <p
        className="text-[0.6rem] font-bold tracking-widest uppercase px-4 pt-4 pb-2"
        style={{ color: 'rgba(255,255,255,0.28)' }}
      >
        Procedimientos
      </p>

      <nav className="px-2 flex-1">
        {ALL_PROCEDURES.map(proc => {
          const isActive = activeProcNames.includes(proc)
          const Icon = PROCEDURE_ICONS[proc]
          return (
            <button
              key={proc}
              onClick={() => toggleProcedure(proc)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[0.75rem] text-left mb-0.5 group"
              style={{
                background: isActive ? 'rgba(79,172,254,0.12)' : 'transparent',
                color: isActive ? '#4FACFE' : 'rgba(255,255,255,0.42)',
                fontWeight: isActive ? 600 : 400,
                transition: 'background 150ms var(--ease-out), color 150ms var(--ease-out)',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.42)'
                }
              }}
            >
              <Icon
                size={13}
                weight={isActive ? 'fill' : 'regular'}
                style={{ opacity: isActive ? 1 : 0.6, flexShrink: 0 }}
              />
              {PROCEDURE_LABELS[proc]}
            </button>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="h-px mx-4 my-3" style={{ background: 'rgba(255,255,255,0.07)' }} />

      {/* Tools */}
      <p
        className="text-[0.6rem] font-bold tracking-widest uppercase px-4 pb-2"
        style={{ color: 'rgba(255,255,255,0.28)' }}
      >
        Herramientas
      </p>

      <div className="px-2">
        {TOOLS.map(({ id, label, Icon }) => {
          const isActive = activeTool === id
          return (
            <button
              key={id}
              onClick={() => setActiveTool(isActive ? 'none' : id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[0.75rem] text-left mb-0.5"
              style={{
                background: isActive ? 'rgba(251,191,36,0.1)' : 'transparent',
                color: isActive ? '#fbbf24' : 'rgba(255,255,255,0.38)',
                fontWeight: isActive ? 600 : 400,
                transition: 'background 150ms var(--ease-out), color 150ms var(--ease-out)',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.65)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.38)'
                }
              }}
            >
              <Icon
                size={13}
                weight={isActive ? 'fill' : 'regular'}
                style={{ opacity: isActive ? 1 : 0.55, flexShrink: 0 }}
              />
              {label}
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-auto pb-3 px-2">
        <div className="h-px mx-2 mb-3" style={{ background: 'rgba(255,255,255,0.07)' }} />
        <a
          href="/patients"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[0.72rem]"
          style={{
            color: 'rgba(255,100,100,0.45)',
            transition: 'color 150ms var(--ease-out)',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,100,100,0.75)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,100,100,0.45)' }}
        >
          <ArrowLeft size={12} />
          Expedientes
        </a>
      </div>
    </aside>
  )
}
