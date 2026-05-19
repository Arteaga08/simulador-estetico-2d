'use client'

import { useSimulator } from './SimulatorContext'
import { PROCEDURE_LABELS, TECHNIQUE_LABELS } from '@/lib/procedures'
import { ArrowCounterClockwise, ArrowClockwise, Gear } from '@phosphor-icons/react'

interface SimulatorTopbarProps {
  patientName: string
  sessionNumber: number
}

export function SimulatorTopbar({ patientName, sessionNumber }: SimulatorTopbarProps) {
  const { state } = useSimulator()
  const { activeProcedures, selectedProcedureIndex } = state
  const selected = activeProcedures[selectedProcedureIndex]

  return (
    <header
      className="h-11 bg-white border-b flex items-center px-4 shrink-0 gap-3"
      style={{ borderColor: '#E9D5FF' }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[0.73rem] min-w-0">
        <a
          href="/patients"
          className="text-[#9CA3AF] hover:text-text-muted transition-colors shrink-0"
          style={{ transition: 'color 150ms var(--ease-out)' }}
        >
          Pacientes
        </a>
        <span className="text-[#D1D5DB] shrink-0">/</span>
        <span className="text-[#9CA3AF] truncate max-w-25">{patientName}</span>
        <span className="text-[#D1D5DB] shrink-0">/</span>
        <span className="text-text-primary font-semibold shrink-0">Sesión #{sessionNumber}</span>
        {selected && (
          <span className="ml-1 text-[0.67rem] font-semibold px-2 py-0.5 rounded-full bg-indigo-muted text-indigo-dark shrink-0">
            {PROCEDURE_LABELS[selected.procedimiento]} · {TECHNIQUE_LABELS[selected.tecnica]}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="ml-auto flex items-center gap-1">
        {[
          { Icon: ArrowCounterClockwise, label: 'Deshacer' },
          { Icon: ArrowClockwise,        label: 'Rehacer' },
          { Icon: Gear,                  label: 'Configuración' },
        ].map(({ Icon, label }) => (
          <button
            key={label}
            title={label}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9CA3AF] border border-transparent"
            style={{ transition: 'background 150ms var(--ease-out), color 150ms var(--ease-out), border-color 150ms var(--ease-out)' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#F9FAFB'
              e.currentTarget.style.color = '#6B7280'
              e.currentTarget.style.borderColor = '#E9D5FF'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#9CA3AF'
              e.currentTarget.style.borderColor = 'transparent'
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <Icon size={14} />
          </button>
        ))}
      </div>
    </header>
  )
}
