import type { Procedimiento, TecnicaSesion, SliderDef } from '@/components/simulator/types'

export const PROCEDURE_LABELS: Record<Procedimiento, string> = {
  RINOPLASTIA:         'Rinoplastia',
  LIFTING_CEJAS:       'Lifting de cejas',
  AUMENTO_MENTON:      'Aumento de mentón',
  AUMENTO_LABIOS:      'Aumento de labios',
  LIFTING_CUELLO:      'Lifting de cuello',
  BLEFAROPLASTIA:      'Blefaroplastia',
  SUAVIZADO_PIEL:      'Suavizado de piel',
  FEMINIZACION_FACIAL: 'Feminización facial',
}

export const TECHNIQUES_BY_PROCEDURE: Record<Procedimiento, TecnicaSesion[]> = {
  RINOPLASTIA:         ['QUIRURGICO', 'RINOMODELACION', 'ENDOSCOPICO'],
  LIFTING_CEJAS:       ['QUIRURGICO', 'ENDOSCOPICO'],
  AUMENTO_MENTON:      ['QUIRURGICO', 'IMPLANTE', 'FILLER'],
  AUMENTO_LABIOS:      ['FILLER'],
  LIFTING_CUELLO:      ['QUIRURGICO', 'LIPOSUCCION'],
  BLEFAROPLASTIA:      ['SUPERIOR', 'INFERIOR', 'COMPLETO'],
  SUAVIZADO_PIEL:      ['LASER', 'MICRONEEDLING'],
  FEMINIZACION_FACIAL: ['QUIRURGICO', 'FILLER'],
}

export const SLIDERS_BY_PROCEDURE: Record<Procedimiento, SliderDef[]> = {
  RINOPLASTIA: [
    // Régimen clinical-target: TODOS los sliders en [-100, +100]:
    //   +100 = métrica = canon (ideal estético del género del paciente)
    //      0 = sin cambio (métrica original)
    //   -100 = métrica = anti-canon (exagerada en el extremo opuesto)
    //
    // Perfil: primitivas cefalométricas
    { id: 'giba-nasal',         label: 'Giba nasal',           min: -100, max: 100, step: 1, defaultValue: 0, blockedNegativeInRinomodelacion: true, validInViews: ['perfil'] },
    { id: 'proyeccion-punta',   label: 'Proyección de punta', min: -100, max: 100, step: 1, defaultValue: 0, validInViews: ['perfil'] },
    { id: 'rotacion-punta',     label: 'Rotación de punta',   min: -100, max: 100, step: 1, defaultValue: 0, validInViews: ['perfil', 'frontal'] },
    { id: 'retraccion-columelar', label: 'Retracción columelar', min: -100, max: 100, step: 1, defaultValue: 0, validInViews: ['perfil'] },
    // Frontal: primitivas de proporciones
    { id: 'reduccion-global',   label: 'Reducción global',     min: -100, max: 100, step: 1, defaultValue: 0, validInViews: ['frontal'] },
    { id: 'adelgazar-dorso',    label: 'Osteotomía lateral',   min: -100, max: 100, step: 1, defaultValue: 0, validInViews: ['frontal'] },
    { id: 'reseccion-alar',     label: 'Resección alar',       min: -100, max: 100, step: 1, defaultValue: 0, validInViews: ['frontal'] },
    { id: 'cierre-alar',        label: 'Cierre alar',          min: -100, max: 100, step: 1, defaultValue: 0, validInViews: ['frontal'] },
    { id: 'refinamiento-punta', label: 'Refinamiento de punta', min: -100, max: 100, step: 1, defaultValue: 0, validInViews: ['frontal'] },
  ],
  LIFTING_CEJAS: [
    { id: 'altura-ceja-int', label: 'Altura ceja interna', min: -10, max: 20, step: 1, defaultValue: 0 },
    { id: 'altura-ceja-ext', label: 'Altura ceja externa', min: -10, max: 20, step: 1, defaultValue: 0 },
    { id: 'curvatura',       label: 'Curvatura',            min: -10, max: 10, step: 1, defaultValue: 0 },
  ],
  AUMENTO_MENTON: [
    { id: 'proyeccion', label: 'Proyección',        min: -10, max: 30, step: 1, defaultValue: 0 },
    { id: 'ancho',      label: 'Ancho',              min: -10, max: 10, step: 1, defaultValue: 0 },
    { id: 'altura',     label: 'Altura vertical',    min: -10, max: 10, step: 1, defaultValue: 0 },
  ],
  AUMENTO_LABIOS: [
    { id: 'volumen-superior', label: 'Volumen superior', min: 0,   max: 40, step: 1, defaultValue: 0 },
    { id: 'volumen-inferior', label: 'Volumen inferior', min: 0,   max: 30, step: 1, defaultValue: 0 },
    { id: 'arco-cupido',      label: 'Arco de Cupido',   min: -10, max: 10, step: 1, defaultValue: 0 },
    { id: 'ancho',            label: 'Ancho',             min: -10, max: 20, step: 1, defaultValue: 0 },
  ],
  LIFTING_CUELLO: [
    { id: 'angulo-mentoniano', label: 'Ángulo mentoniano', min: -20, max: 20, step: 1, defaultValue: 0 },
    { id: 'tension',           label: 'Tensión cervical',  min: 0,   max: 40, step: 1, defaultValue: 0 },
  ],
  BLEFAROPLASTIA: [
    { id: 'parpado-superior', label: 'Párpado superior', min: -20, max: 0,  step: 1, defaultValue: 0 },
    { id: 'parpado-inferior', label: 'Párpado inferior', min: -10, max: 0,  step: 1, defaultValue: 0 },
    { id: 'apertura',         label: 'Apertura ocular',  min: -5,  max: 10, step: 1, defaultValue: 0 },
  ],
  SUAVIZADO_PIEL: [
    { id: 'textura',      label: 'Suavizado de textura', min: 0, max: 100, step: 5, defaultValue: 0 },
    { id: 'uniformidad',  label: 'Uniformidad tono',     min: 0, max: 100, step: 5, defaultValue: 0 },
  ],
  FEMINIZACION_FACIAL: [
    { id: 'frente',    label: 'Redondeo de frente',  min: 0,   max: 30, step: 1, defaultValue: 0 },
    { id: 'pomulos',   label: 'Relleno pómulos',     min: 0,   max: 30, step: 1, defaultValue: 0 },
    { id: 'mandibula', label: 'Reducción mandíbula', min: -30, max: 0,  step: 1, defaultValue: 0 },
    { id: 'menton',    label: 'Refinamiento mentón', min: -15, max: 10, step: 1, defaultValue: 0 },
  ],
}

export const TECHNIQUE_LABELS: Record<TecnicaSesion, string> = {
  QUIRURGICO:     'Quirúrgico',
  RINOMODELACION: 'Rinomodelación',
  ENDOSCOPICO:    'Endoscópico',
  IMPLANTE:       'Implante',
  FILLER:         'Filler',
  LIPOSUCCION:    'Liposucción',
  SUPERIOR:       'Superior',
  INFERIOR:       'Inferior',
  COMPLETO:       'Completo',
  LASER:          'Láser',
  MICRONEEDLING:  'Microneedling',
}

export function getSliderDefs(proc: Procedimiento): SliderDef[] {
  return SLIDERS_BY_PROCEDURE[proc]
}

export function getAvailableTechniques(proc: Procedimiento): TecnicaSesion[] {
  return TECHNIQUES_BY_PROCEDURE[proc]
}

export function getDefaultSliderValues(proc: Procedimiento): Record<string, number> {
  return Object.fromEntries(
    SLIDERS_BY_PROCEDURE[proc].map(s => [s.id, s.defaultValue])
  )
}

export const ALL_PROCEDURES = Object.keys(PROCEDURE_LABELS) as Procedimiento[]
