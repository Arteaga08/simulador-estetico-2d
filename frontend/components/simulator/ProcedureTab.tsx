"use client";

import { useSimulator } from "./SimulatorContext";
import { SliderControl } from "./SliderControl";
import { PresetPicker } from "./PresetPicker";
import {
  PROCEDURE_LABELS,
  TECHNIQUE_LABELS,
  getSliderDefs,
  getAvailableTechniques,
} from "@/lib/procedures";
import type { ActiveProcedure } from "./types";

interface ProcedureTabProps {
  procedure: ActiveProcedure;
  isSelected: boolean;
}

const VIEW_LABEL: Record<string, string> = {
  frontal: 'foto frontal',
  perfil: 'foto de perfil',
};

export function ProcedureTab({ procedure, isSelected }: ProcedureTabProps) {
  const { state, updateSlider, updateTechnique, updateIntensity, setPatientGender } = useSimulator();
  const { currentView, patientGender } = state;

  const sliders = getSliderDefs(procedure.procedimiento);
  const techniques = getAvailableTechniques(procedure.procedimiento);
  const isRhinoplasty = procedure.procedimiento === 'RINOPLASTIA';

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="px-3.5 pt-3.5 pb-2.5">
        <p className="text-sm font-semibold text-text-primary">
          {PROCEDURE_LABELS[procedure.procedimiento]}
        </p>
        <div className="flex gap-1.5 flex-wrap mt-1.5">
          {techniques.map((t) => (
            <button
              key={t}
              onClick={() => updateTechnique(t)}
              className={`text-[12px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                procedure.tecnica === t
                  ? "bg-indigo-muted text-indigo-dark"
                  : "bg-transparent text-[#9CA3AF] hover:bg-[#F9FAFB]"
              }`}
            >
              {TECHNIQUE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Selector de sexo del paciente (solo Rinoplastia): define el canon
            cefalométrico al que apuntan los sliders. */}
        {isRhinoplasty && (
          <div className="flex gap-1.5 mt-2.5 items-center">
            <span className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-semibold">
              Canon
            </span>
            <button
              onClick={() => setPatientGender('F')}
              title="Canon femenino: nasolabial ≈ 105°, dorso suave, alas estrechas"
              className={`text-[12px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                patientGender === 'F'
                  ? 'bg-pink-100 text-pink-700'
                  : 'bg-transparent text-[#9CA3AF] hover:bg-[#F9FAFB]'
              }`}
            >
              ♀ Femenino
            </button>
            <button
              onClick={() => setPatientGender('M')}
              title="Canon masculino: nasolabial ≈ 95°, dorso recto, alas más anchas"
              className={`text-[12px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                patientGender === 'M'
                  ? 'bg-sky-100 text-sky-700'
                  : 'bg-transparent text-[#9CA3AF] hover:bg-[#F9FAFB]'
              }`}
            >
              ♂ Masculino
            </button>
          </div>
        )}
      </div>

      <div className="h-px bg-[#F3F4F6]" />

      {/* Sliders */}
      <div className="px-3.5 pt-3 pb-2">
        {sliders.map((slider) => {
          const isBlocked =
            slider.blockedNegativeInRinomodelacion &&
            procedure.tecnica === "RINOMODELACION";
          const effectiveMin = isBlocked ? 0 : slider.min;
          const rawValue =
            procedure.sliderValues[slider.id] ?? slider.defaultValue;
          const effectiveValue = isBlocked ? Math.max(0, rawValue) : rawValue;

          // Gating por tipo de foto: si la pose actual no está en validInViews
          // del slider, lo deshabilitamos con un tooltip explicativo.
          const viewMismatch =
            !!slider.validInViews &&
            currentView !== null &&
            !slider.validInViews.includes(currentView);
          const disabled = !isSelected || viewMismatch;
          const disabledReason = viewMismatch
            ? `No aplicable en ${VIEW_LABEL[currentView!] ?? currentView}. Cargar otra toma para usar este parámetro.`
            : undefined;

          return (
            <SliderControl
              key={slider.id}
              id={slider.id}
              label={slider.label}
              min={effectiveMin}
              max={slider.max}
              step={slider.step}
              value={effectiveValue}
              onChange={(v) => updateSlider(slider.id, v)}
              disabled={disabled}
              disabledReason={disabledReason}
            />
          );
        })}
      </div>

      <div className="h-px bg-[#F3F4F6]" />

      {/* Intensity */}
      <div className="px-3.5 pt-3 pb-2">
        <p className="text-[11px] font-bold tracking-widest uppercase text-[#9CA3AF] mb-2.5">
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
        <p className="text-[11px] font-bold tracking-widest uppercase text-[#9CA3AF] mb-2">
          Presets
        </p>
        <PresetPicker
          procedimiento={procedure.procedimiento}
          activePresetId={procedure.presetId}
        />
      </div>
    </div>
  );
}
