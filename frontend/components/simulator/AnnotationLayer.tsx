'use client'

import { useState } from 'react'
import { useSimulator } from './SimulatorContext'

interface AnnotationLayerProps {
  width: number
  height: number
}

export function AnnotationLayer({ width, height }: AnnotationLayerProps) {
  const { state, addPin, updatePinLabel, removePin } = useSimulator()
  const { pins, activeTool } = state
  const [editingId, setEditingId] = useState<string | null>(null)

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (activeTool !== 'pin') return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    addPin({ id: crypto.randomUUID(), x, y, label: 'Anotación' })
  }

  return (
    <div
      className="absolute inset-0"
      style={{ cursor: activeTool === 'pin' ? 'crosshair' : 'default' }}
      onClick={handleCanvasClick}
    >
      {pins.map(pin => (
        <div
          key={pin.id}
          className="absolute"
          style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%`, transform: 'translate(-50%, -50%)' }}
        >
          <div
            className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm cursor-pointer"
            style={{ background: '#F59E0B' }}
            onClick={e => { e.stopPropagation(); setEditingId(pin.id) }}
            title="Click para editar"
          />
          {editingId === pin.id ? (
            <input
              autoFocus
              defaultValue={pin.label}
              className="absolute bottom-4 left-3 z-10 text-[0.68rem] px-1.5 py-0.5 rounded border w-24 outline-none shadow"
              style={{ borderColor: '#FDE68A', background: '#FEF3C7', color: '#92400E' }}
              onBlur={e => { updatePinLabel(pin.id, e.target.value); setEditingId(null) }}
              onKeyDown={e => {
                if (e.key === 'Enter') { updatePinLabel(pin.id, e.currentTarget.value); setEditingId(null) }
                if (e.key === 'Delete' && e.metaKey) { removePin(pin.id); setEditingId(null) }
              }}
            />
          ) : (
            <span
              className="absolute bottom-3.5 left-3 text-[0.68rem] font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap shadow-sm pointer-events-none"
              style={{ color: '#92400E', background: '#FEF3C7', borderColor: '#FDE68A' }}
            >
              {pin.label}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
