'use client'

import { useSimulator } from './SimulatorContext'
import { SliderControl } from './SliderControl'
import { PresetPicker } from './PresetPicker'
import { PROCEDURE_LABELS, TECHNIQUE_LABELS, getSliderDefs, getAvailableTechniques } from '@/lib/procedures'
import type { ActiveProcedure } from './types'

interface ProcedureTabProps {
  procedure: ActiveProcedure
  isSelected: boolean
}

export function ProcedureTab({ procedure, isSelected }: ProcedureTabProps) {
  const { updateSlider, updateTechnique, updateIntensity } = useSimulator()

  const sliders = getSliderDefs(procedure.procedimiento)
  const techniques = getAvailableTechniques(procedure.procedimiento)

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="px-3.5 pt-3.5 pb-2.5">
        <p className="text-[0.78rem] font-semibold text-[#1E1B4B]">
          {PROCEDURE_LABELS[procedure.procedimiento]}
        </p>
        <div className="flex gap-1.5 flex-wrap mt-1.5">
          {techniques.map(t => (
            <button
              key={t}
              onClick={() => updateTechnique(t)}
              className={`text-[0.67rem] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                procedure.tecnica === t
                  ? 'bg-[#EEF2FF] text-[#4338CA]'
                  : 'bg-transparent text-[#9CA3AF] hover:bg-[#F9FAFB]'
              }`}
            >
              {TECHNIQUE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-[#F3F4F6]" />

      {/* Sliders */}
      <div className="px-3.5 pt-3 pb-2">
        {sliders.map(slider => {
          const isBlocked =
            slider.blockedNegativeInRinomodelacion &&
            procedure.tecnica === 'RINOMODELACION'
          const effectiveMin = isBlocked ? 0 : slider.min
          const rawValue = procedure.sliderValues[slider.id] ?? slider.defaultValue
          const effectiveValue = isBlocked ? Math.max(0, rawValue) : rawValue

          return (
            <SliderControl
              key={slider.id}
              id={slider.id}
              label={slider.label}
              min={effectiveMin}
              max={slider.max}
              step={slider.step}
              value={effectiveValue}
              onChange={v => updateSlider(slider.id, v)}
              disabled={!isSelected}
            />
          )
        })}
      </div>

      <div className="h-px bg-[#F3F4F6]" />

      {/* Intensity */}
      <div className="px-3.5 pt-3 pb-2">
        <p className="text-[0.62rem] font-bold tracking-widest uppercase text-[#9CA3AF] mb-2.5">
          Intensidad global
        </p>
        <SliderControl
          id={`intensity-${procedure.procedimiento}`}
          label="Efecto"
          min={0}
          max={100}
          step={5}
          value={procedure.intensity}
          onChange={updateIntensity}
          disabled={!isSelected}
          accent="intensity"
        />
      </div>

      <div className="h-px bg-[#F3F4F6]" />

      {/* Presets */}
      <div className="px-3.5 pt-3 pb-3">
        <p className="text-[0.62rem] font-bold tracking-widest uppercase text-[#9CA3AF] mb-2">
          Presets
        </p>
        <PresetPicker
          procedimiento={procedure.procedimiento}
          activePresetId={procedure.presetId}
        />
      </div>
    </div>
  )
}
