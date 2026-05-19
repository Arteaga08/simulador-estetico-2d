'use client'

import { useSimulator } from './SimulatorContext'
import { PROCEDURE_LABELS, TECHNIQUE_LABELS } from '@/lib/procedures'

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
      className="h-11 bg-white border-b flex items-center pr-4 shrink-0"
      style={{ borderColor: '#E9D5FF' }}
    >
      {/* Logo zone — matches sidebar width */}
      <div
        className="h-full flex items-center gap-2 px-4 shrink-0"
        style={{ width: '220px', backgroundColor: '#1E1B4B' }}
      >
        <div
          className="w-5 h-5 rounded-md shrink-0"
          style={{ background: 'linear-gradient(135deg, #4FACFE, #667EEA)' }}
        />
        <span className="text-[0.8rem] font-bold text-white tracking-[-0.01em]">SimEstético</span>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 px-4 text-[0.75rem]">
        <a href="/patients" className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
          Pacientes
        </a>
        <span className="text-[#D1D5DB]">/</span>
        <span className="text-[#9CA3AF]">{patientName}</span>
        <span className="text-[#D1D5DB]">/</span>
        <span className="text-text-primary font-semibold">Sesión #{sessionNumber}</span>
        {selected && (
          <span
            className="ml-1 text-[0.7rem] font-semibold px-2 py-0.5 rounded-full bg-indigo-muted text-indigo-dark"
          >
            {PROCEDURE_LABELS[selected.procedimiento]} · {TECHNIQUE_LABELS[selected.tecnica]}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="ml-auto flex items-center gap-1.5">
        {(['↩', '↪', '⚙'] as const).map(icon => (
          <button
            key={icon}
            className="w-7 h-7 rounded-lg border bg-white flex items-center justify-center text-[#9CA3AF] text-sm hover:bg-[#F9FAFB] transition-colors border-border"
          >
            {icon}
          </button>
        ))}
      </div>
    </header>
  )
}
