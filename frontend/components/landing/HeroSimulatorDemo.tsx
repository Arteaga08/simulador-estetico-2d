'use client'

import { useEffect } from 'react'
import { SimulatorProvider, useSimulator } from '@/components/simulator/SimulatorContext'
import { CanvasWorkspace } from '@/components/simulator/CanvasWorkspace'
import { SliderControl } from '@/components/simulator/SliderControl'
import { getSliderDefs } from '@/lib/procedures'

export default function HeroSimulatorDemo() {
  return (
    <SimulatorProvider patientId={null} sessionId={null}>
      <HeroSimulatorDemoInner />
    </SimulatorProvider>
  )
}

function HeroSimulatorDemoInner() {
  const { state, addProcedure, updateSlider } = useSimulator()

  useEffect(() => {
    addProcedure('RINOPLASTIA')
  }, [addProcedure])

  const sliders = getSliderDefs('RINOPLASTIA')
  const activeProc = state.activeProcedures[0]

  return (
    <div
      className="rounded-2xl overflow-hidden w-full"
      style={{
        background: '#0A1628',
        boxShadow:
          '0 0 0 1px rgba(79,172,254,0.18), 0 0 40px rgba(79,172,254,0.10), 0 32px 80px rgba(10,22,40,0.55)',
        overscrollBehavior: 'none',
      }}
    >
      {/* Canvas area — constrained height */}
      <div className="h-85 sm:h-110 md:h-125 flex flex-col">
        <CanvasWorkspace />
      </div>

      {/* Controls strip — light theme to match SliderControl's design */}
      <div
        className="px-5 py-4 border-t"
        style={{
          background: '#F8F9FF',
          borderColor: 'rgba(102,126,234,0.12)',
        }}
      >
        {/* Procedure label */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-[11px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(79,172,254,0.10)',
              color: '#4338CA',
              border: '1px solid rgba(102,126,234,0.20)',
            }}
          >
            Rinoplastia
          </span>
          {!state.imageUrl && (
            <span className="text-[12px] text-text-muted">
              Sube una foto para ajustar los parámetros
            </span>
          )}
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6">
          {sliders.map((slider) => (
            <SliderControl
              key={slider.id}
              id={`hero-${slider.id}`}
              label={slider.label}
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={activeProc?.sliderValues[slider.id] ?? slider.defaultValue}
              onChange={(v) => updateSlider(slider.id, v)}
              disabled={!state.imageUrl}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
