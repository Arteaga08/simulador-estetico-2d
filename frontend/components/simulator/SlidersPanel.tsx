'use client'

import { useState } from 'react'
import { useSimulator } from './SimulatorContext'
import { ProcedureTab } from './ProcedureTab'
import { PROCEDURE_LABELS, ALL_PROCEDURES } from '@/lib/procedures'

export function SlidersPanel() {
  const { state, addProcedure, removeProcedure, selectProcedure, setNotes } = useSimulator()
  const [showProcPicker, setShowProcPicker] = useState(false)

  const { activeProcedures, selectedProcedureIndex, notes } = state

  return (
    <div className="w-60 bg-white border-l border-border flex flex-col overflow-hidden shrink-0">
      {/* Tabs header */}
      <div className="flex items-center border-b border-border bg-white shrink-0 overflow-x-auto">
        {activeProcedures.map((p, i) => (
          <button
            key={p.procedimiento}
            onClick={() => selectProcedure(i)}
            className={`px-3 py-2 text-[0.67rem] font-semibold whitespace-nowrap border-b-2 transition-colors shrink-0 ${
              i === selectedProcedureIndex
                ? 'text-indigo-dark border-indigo bg-[#F8F8FF]'
                : 'text-[#9CA3AF] border-transparent hover:text-[#6B7280]'
            }`}
          >
            {PROCEDURE_LABELS[p.procedimiento].split(' ')[0]}
            {activeProcedures.length > 1 && (
              <span
                className="ml-1 text-[#9CA3AF] hover:text-red-400 cursor-pointer"
                onClick={e => { e.stopPropagation(); removeProcedure(p.procedimiento) }}
              >
                ×
              </span>
            )}
          </button>
        ))}

        <button
          onClick={() => setShowProcPicker(v => !v)}
          className="w-7 h-full flex items-center justify-center text-[#9CA3AF] hover:text-indigo border-l border-border shrink-0 text-base"
          title="Agregar procedimiento"
        >
          +
        </button>
      </div>

      {/* Procedure picker dropdown */}
      {showProcPicker && (
        <div className="border-b border-border bg-[#FAFAFA] py-2 px-3 shrink-0">
          <p className="text-[0.6rem] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1.5">Agregar procedimiento</p>
          <div className="flex flex-wrap gap-1">
            {ALL_PROCEDURES.filter(
              p => !activeProcedures.find(ap => ap.procedimiento === p)
            ).map(p => (
              <button
                key={p}
                onClick={() => { addProcedure(p); setShowProcPicker(false) }}
                className="text-[0.67rem] px-2 py-1 rounded-full bg-indigo-muted text-indigo-dark hover:bg-indigo-light transition-colors font-medium"
              >
                {PROCEDURE_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {activeProcedures.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-8">
          <p className="text-[0.78rem] font-semibold text-text-primary mb-1">Sin procedimiento</p>
          <p className="text-[0.72rem] text-[#9CA3AF] mb-3">Selecciona un procedimiento en el panel izquierdo o usa el + de arriba.</p>
        </div>
      )}

      {/* Active procedure tab content */}
      {activeProcedures.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <ProcedureTab
            procedure={activeProcedures[selectedProcedureIndex]}
            isSelected
          />

          <div className="h-px bg-[#F3F4F6]" />
          <div className="px-3.5 pt-3 pb-3">
            <p className="text-[0.62rem] font-bold tracking-widest uppercase text-[#9CA3AF] mb-2">
              Notas clínicas
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones de la sesión..."
              rows={3}
              className="w-full text-[0.72rem] text-text-muted bg-[#FAFAFA] border border-border rounded-lg p-2.5 outline-none resize-none focus:border-indigo placeholder:text-[#D1D5DB]"
            />
          </div>
        </div>
      )}
    </div>
  )
}
