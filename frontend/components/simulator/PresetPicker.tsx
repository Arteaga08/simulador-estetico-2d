'use client'

import { useState } from 'react'
import type { Procedimiento } from './types'

const SYSTEM_PRESETS: Record<string, string[]> = {
  RINOPLASTIA: ['Natural', 'Definido', 'Proyectado'],
  LIFTING_CEJAS: ['Sutil', 'Expresivo'],
  AUMENTO_MENTON: ['Natural', 'Proyectado'],
  AUMENTO_LABIOS: ['Natural', 'Voluminoso'],
  LIFTING_CUELLO: ['Natural', 'Tenso'],
  BLEFAROPLASTIA: ['Sutil', 'Marcado'],
  SUAVIZADO_PIEL: ['Leve', 'Intenso'],
  FEMINIZACION_FACIAL: ['Sutil', 'Marcado'],
}

interface PresetPickerProps {
  procedimiento: Procedimiento
  activePresetId: string | null
}

export function PresetPicker({ procedimiento, activePresetId }: PresetPickerProps) {
  const [customPresets, setCustomPresets] = useState<string[]>([])
  const [naming, setNaming] = useState(false)
  const [newName, setNewName] = useState('')

  const systemPresets = SYSTEM_PRESETS[procedimiento] ?? []

  function handleSavePreset() {
    const name = newName.trim()
    if (!name) return
    setCustomPresets(prev => [...prev, name])
    setNewName('')
    setNaming(false)
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {systemPresets.map(name => (
        <button
          key={name}
          className={`text-[0.68rem] font-medium px-2.5 py-1 rounded-full border transition-colors ${
            activePresetId === name
              ? 'bg-indigo-muted text-indigo-dark border-[#C7D2FE]'
              : 'bg-transparent text-[#9CA3AF] border-border hover:bg-[#F9FAFB]'
          }`}
        >
          {name}
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
