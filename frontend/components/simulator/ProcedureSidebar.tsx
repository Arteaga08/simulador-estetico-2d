'use client'

import { useSimulator } from './SimulatorContext'
import { PROCEDURE_LABELS, ALL_PROCEDURES } from '@/lib/procedures'
import type { Procedimiento } from './types'
import type { SimulatorState } from './types'

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

  const tools: Array<{ id: SimulatorState['activeTool']; label: string; icon: string }> = [
    { id: 'pin',   label: 'Pin de anotación',     icon: '📌' },
    { id: 'hud',   label: 'Líneas de referencia',  icon: '⊞' },
    { id: 'angle', label: 'Medición de ángulos',   icon: '📐' },
    { id: 'draw',  label: 'Dibujo libre',           icon: '✏️' },
  ]

  return (
    <aside
      className="flex flex-col shrink-0 overflow-y-auto"
      style={{ width: '220px', backgroundColor: '#1E1B4B' }}
    >
      {/* Procedures section */}
      <p className="text-[0.62rem] font-bold tracking-[0.09em] uppercase px-3.5 pt-4 pb-1.5"
         style={{ color: 'rgba(255,255,255,0.3)' }}>
        Procedimiento
      </p>

      <nav className="px-2">
        {ALL_PROCEDURES.map(proc => {
          const isActive = activeProcNames.includes(proc)
          return (
            <button
              key={proc}
              onClick={() => toggleProcedure(proc)}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[0.78rem] text-left transition-all mb-0.5"
              style={{
                background: isActive ? 'rgba(79,172,254,0.15)' : 'transparent',
                color: isActive ? '#4FACFE' : 'rgba(255,255,255,0.45)',
                fontWeight: isActive ? 600 : 400,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: isActive ? '#4FACFE' : 'rgba(255,255,255,0.3)' }}
              />
              {PROCEDURE_LABELS[proc]}
            </button>
          )
        })}
      </nav>

      <div className="h-px mx-3.5 my-2" style={{ background: 'rgba(255,255,255,0.08)' }} />

      {/* Tools section */}
      <p className="text-[0.62rem] font-bold tracking-[0.09em] uppercase px-3.5 pb-1.5"
         style={{ color: 'rgba(255,255,255,0.3)' }}>
        Herramientas
      </p>

      <div className="px-2">
        {tools.map(tool => {
          const isActive = activeTool === tool.id
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(isActive ? 'none' : tool.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[0.73rem] text-left transition-all mb-0.5"
              style={{
                background: isActive ? 'rgba(251,191,36,0.12)' : 'transparent',
                color: isActive ? '#fbbf24' : 'rgba(255,255,255,0.4)',
              }}
            >
              <span className="text-sm">{tool.icon}</span>
              {tool.label}
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-auto px-2 pb-3">
        <div className="h-px mx-1.5 mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <a
          href="/patients"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[0.72rem] transition-colors"
          style={{ color: 'rgba(255,100,100,0.5)' }}
        >
          ← Volver al expediente
        </a>
      </div>
    </aside>
  )
}
