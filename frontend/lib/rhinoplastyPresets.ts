import type { FaceView } from '@/utils/viewClassifier'

export interface RhinoplastyPreset {
  id: string
  label: string
  /** Pose(s) en las que el preset produce un resultado coherente. */
  appliesTo: FaceView[]
  /** Valores objetivo de cada slider; los faltantes quedan en 0. */
  values: Record<string, number>
  /** Breve descripción clínica del resultado esperado. */
  rationale: string
}

/**
 * Presets quirúrgicos en régimen clinical-target.
 *
 * Convención: todos los sliders están en rango [-100, +100] donde:
 *   +100 = métrica = canon (ideal del género del paciente)
 *      0 = sin cambio
 *   -100 = métrica = anti-canon (caricatura del extremo opuesto)
 *
 * Los valores aquí son "% del camino hacia el canon", no magnitudes mágicas.
 * Como el canon depende del género, el mismo preset produce resultados
 * armónicos para paciente F y paciente M (ej: rot=+80 lleva al nasolabial
 * a 102° en F y a 94° en M).
 */
export const RHINOPLASTY_PRESETS: RhinoplastyPreset[] = [
  {
    id: 'ideal-completo',
    label: 'Ideal completo',
    appliesTo: ['perfil'],
    rationale: 'Acerca todas las métricas al canon del género (85% del camino).',
    values: {
      'giba-nasal':        85,
      'rotacion-punta':    80,
      'proyeccion-punta':  70,
      'reseccion-alar':    60,
    },
  },
  {
    id: 'masculinizacion',
    label: 'Masculinización',
    appliesTo: ['perfil'],
    rationale: 'Aplica solo al canon masculino: dorso recto, nasolabial 95°.',
    values: {
      'giba-nasal':       70,
      'rotacion-punta':   60,
      'proyeccion-punta': 40,
    },
  },
  {
    id: 'reduccion-conservadora',
    label: 'Reducción conservadora',
    appliesTo: ['perfil'],
    rationale: 'Mid-camino hacia el canon (50%). Cambio sutil pero balanceado.',
    values: {
      'giba-nasal':        50,
      'rotacion-punta':    50,
      'proyeccion-punta':  40,
    },
  },
  {
    id: 'refinamiento-punta-preset',
    label: 'Refinamiento de punta',
    appliesTo: ['perfil'],
    rationale: 'Solo rotación + Goode + alas, sin tocar el dorso.',
    values: {
      'rotacion-punta':    80,
      'proyeccion-punta':  60,
      'reseccion-alar':    50,
    },
  },
  {
    id: 'frontal-armoniosa',
    label: 'Armonía frontal',
    appliesTo: ['frontal'],
    rationale: 'Proporciones nasales acercadas al canon en el plano coronal.',
    values: {
      'reduccion-global':    75,
      'adelgazar-dorso':     80,
      'reseccion-alar':      75,
      'refinamiento-punta':  70,
      'rotacion-punta':      50,
    },
  },
  {
    id: 'frontal-nariz-pequena',
    label: 'Nariz pequeña',
    appliesTo: ['frontal'],
    rationale: 'Énfasis en reducción global + refinamiento de punta.',
    values: {
      'reduccion-global':    95,
      'adelgazar-dorso':     70,
      'reseccion-alar':      70,
      'refinamiento-punta':  85,
    },
  },
]

export function getPresetsForView(view: FaceView | null): RhinoplastyPreset[] {
  if (view === null) return RHINOPLASTY_PRESETS
  return RHINOPLASTY_PRESETS.filter(p => p.appliesTo.includes(view))
}

export function getPresetById(id: string): RhinoplastyPreset | undefined {
  return RHINOPLASTY_PRESETS.find(p => p.id === id)
}
