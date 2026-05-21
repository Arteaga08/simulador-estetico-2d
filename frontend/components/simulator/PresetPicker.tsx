'use client'

import { useState } from 'react'
import { useSimulator } from './SimulatorContext'
import type { Procedimiento } from './types'
import { getPresetsForView, type RhinoplastyPreset } from '@/lib/rhinoplastyPresets'

interface PresetPickerProps {
  procedimiento: Procedimiento
  activePresetId: string | null
}

export function PresetPicker({ procedimiento, activePresetId }: PresetPickerProps) {
  const { state, applyPreset } = useSimulator()
  const [customPresets, setCustomPresets] = useState<string[]>([])
  const [naming, setNaming] = useState(false)
  const [newName, setNewName] = useState('')

  // Hoy sólo Rinoplastia tiene presets harmonizados curados. Para otros
  // procedimientos no mostramos chips de sistema (la UI sigue permitiendo
  // crear presets propios con +).
  const systemPresets: RhinoplastyPreset[] =
    procedimiento === 'RINOPLASTIA' ? getPresetsForView(state.currentView) : []

  function handleSavePreset() {
    const name = newName.trim()
    if (!name) return
    setCustomPresets(prev => [...prev, name])
    setNewName('')
    setNaming(false)
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {systemPresets.map(preset => (
        <button
          key={preset.id}
          onClick={() => applyPreset(preset.id, preset.values)}
          title={preset.rationale}
          className={`text-[0.68rem] font-medium px-2.5 py-1 rounded-full border transition-colors ${
            activePresetId === preset.id
              ? 'bg-indigo-muted text-indigo-dark border-[#C7D2FE]'
              : 'bg-transparent text-[#9CA3AF] border-border hover:bg-[#F9FAFB]'
          }`}
        >
          {preset.label}
        </button>
      ))}

      {customPresets.map(name => (
        <button
          key={name}
          className="text-[0.68rem] font-medium px-2.5 py-1 rounded-full border bg-indigo-muted text-indigo-dark border-[#C7D2FE]"
        >
          {name}
        </button>
      ))}

      {naming ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSavePreset()
              if (e.key === 'Escape') setNaming(false)
            }}
            placeholder="Nombre del preset"
            className="text-[0.68rem] px-2 py-0.5 border border-[#C7D2FE] rounded-full outline-none w-28"
          />
          <button
            onClick={handleSavePreset}
            className="text-[0.68rem] text-indigo-dark font-semibold"
          >
            ✓
          </button>
        </div>
      ) : (
        <button
          onClick={() => setNaming(true)}
          className="text-[0.68rem] font-medium px-2.5 py-1 rounded-full border border-dashed border-[#9CA3AF] text-[#9CA3AF] hover:border-indigo-dark hover:text-indigo-dark transition-colors"
        >
          + Nuevo
        </button>
      )}
    </div>
  )
}
