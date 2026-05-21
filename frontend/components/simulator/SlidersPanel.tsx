'use client'

import { useState } from 'react'
import { useSimulator } from './SimulatorContext'
import { ProcedureTab } from './ProcedureTab'
import { PROCEDURE_LABELS, ALL_PROCEDURES } from '@/lib/procedures'
import { Plus, X } from '@phosphor-icons/react'

export function SlidersPanel() {
  const { state, addProcedure, removeProcedure, selectProcedure, setNotes } = useSimulator()
  const [showProcPicker, setShowProcPicker] = useState(false)
  const { activeProcedures, selectedProcedureIndex, notes } = state

  return (
    <div className="w-60 bg-white border-l border-border flex flex-col overflow-hidden shrink-0">

      {/* Tabs header */}
      <div className="relative flex items-center border-b border-border bg-white shrink-0 overflow-x-auto">
        {activeProcedures.map((p, i) => {
          const isActive = i === selectedProcedureIndex
          return (
            <button
              key={p.procedimiento}
              onClick={() => selectProcedure(i)}
              className="relative flex items-center gap-1 px-3 py-2.5 text-[12px] font-semibold whitespace-nowrap shrink-0"
              style={{
                color: isActive ? '#4338CA' : '#9CA3AF',
                borderBottom: isActive ? '2px solid #667EEA' : '2px solid transparent',
                transition: 'color 150ms var(--ease-out), border-color 150ms var(--ease-out)',
              }}
            >
              {PROCEDURE_LABELS[p.procedimiento].split(' ')[0]}
              {activeProcedures.length > 1 && (
                <span
                  className="flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-red-50 hover:text-red-400 transition-colors"
                  style={{ color: '#C4B5FD', transition: 'color 120ms var(--ease-out), background 120ms var(--ease-out)' }}
                  onClick={e => { e.stopPropagation(); removeProcedure(p.procedimiento) }}
                >
                  <X size={8} weight="bold" />
                </span>
              )}
            </button>
          )
        })}

        <button
          onClick={() => setShowProcPicker(v => !v)}
          className="w-8 h-full flex items-center justify-center border-l border-border shrink-0 text-[#9CA3AF]"
          title="Agregar procedimiento"
          style={{
            transition: 'color 150ms var(--ease-out), background 150ms var(--ease-out)',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#667EEA'; e.currentTarget.style.background = '#F8F7FF' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.background = 'transparent' }}
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Procedure picker */}
      {showProcPicker && (
        <div
          className="border-b border-border py-2.5 px-3 shrink-0"
          style={{ background: '#FAFAFA' }}
        >
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">
            Agregar procedimiento
          </p>
          <div className="flex flex-wrap gap-1">
            {ALL_PROCEDURES.filter(p => !activeProcedures.find(ap => ap.procedimiento === p)).map(p => (
              <button
                key={p}
                onClick={() => { addProcedure(p); setShowProcPicker(false) }}
                className="text-[12px] px-2 py-1 rounded-full bg-indigo-muted text-indigo-dark font-medium"
                style={{ transition: 'background 120ms var(--ease-out)' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#E0E7FF' }}
                onMouseLeave={e => { e.currentTarget.style.background = '' }}
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
          <p className="text-sm font-semibold text-text-primary mb-1">Sin procedimiento</p>
          <p className="text-[13px] text-[#9CA3AF]">
            Selecciona un procedimiento en el panel izquierdo o usa el + de arriba.
          </p>
        </div>
      )}

      {/* Active procedure content */}
      {activeProcedures.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <ProcedureTab
            procedure={activeProcedures[selectedProcedureIndex]}
            isSelected
          />

          {/* Clinical notes */}
          <div className="h-px bg-[#F3F4F6]" />
          <div className="px-3.5 pt-3 pb-3">
            <p className="text-[11px] font-bold tracking-widest uppercase text-[#9CA3AF] mb-2">
              Notas clínicas
            </p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones de la sesión..."
              rows={3}
              className="w-full text-[13px] text-text-muted bg-[#FAFAFA] border border-border rounded-lg p-2.5 outline-none resize-none placeholder:text-[#D1D5DB]"
              style={{
                transition: 'border-color 150ms var(--ease-out), box-shadow 150ms var(--ease-out)',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = '#667EEA'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.10)'
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = ''
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
