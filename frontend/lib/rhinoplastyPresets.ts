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
 * Presets quirúrgicos curados con valores que respetan cánones cefalométricos
 * clásicos (Powell-Humphries, Crumley). Cada combinación está diseñada para
 * producir un resultado balanceado sin requerir ajuste manual posterior.
 *
 * Convención de unidades:
 *   giba-nasal     en {−60..30}    negativo = reducir dorso
 *   rotacion-punta en {−15..15}    positivo = punta hacia arriba
 *   proyeccion-punta en {−20..40}  positivo = más proyectada
 *   reduccion-global / adelgazar-dorso / reseccion-alar en {−30..0}
 */
export const RHINOPLASTY_PRESETS: RhinoplastyPreset[] = [
  {
    id: 'femenina-refinada',
    label: 'Femenina refinada',
    appliesTo: ['perfil', 'tres-cuartos'],
    rationale: 'Dorso pronunciado, supratip break marcado, nasolabial ≈ 108°, Goode ≈ 0.55.',
    values: {
      'giba-nasal': -35,
      'rotacion-punta': 10,
      'proyeccion-punta': -10,
      'reseccion-alar': -12,
    },
  },
  {
    id: 'masculinizacion-dorsal',
    label: 'Masculinización dorsal',
    appliesTo: ['perfil', 'tres-cuartos'],
    rationale: 'Dorso recto definido, nasolabial ≈ 90°, sin reducción de alas.',
    values: {
      'giba-nasal': -15,
      'rotacion-punta': -3,
      'proyeccion-punta': 0,
    },
  },
  {
    id: 'reduccion-conservadora',
    label: 'Reducción conservadora',
    appliesTo: ['perfil', 'tres-cuartos'],
    rationale: 'Cambio moderado: giba visible, punta rotada, alas intactas.',
    values: {
      'giba-nasal': -18,
      'rotacion-punta': 5,
      'proyeccion-punta': -4,
    },
  },
  {
    id: 'refinamiento-punta',
    label: 'Refinamiento de punta',
    appliesTo: ['perfil', 'tres-cuartos'],
    rationale: 'Foco en punta: rotación cefálica marcada + reducción de proyección + alas leves.',
    values: {
      'giba-nasal': 0,
      'rotacion-punta': 9,
      'proyeccion-punta': -8,
      'reseccion-alar': -6,
    },
  },
  {
    id: 'frontal-armoniosa',
    label: 'Armonía frontal',
    appliesTo: ['frontal', 'tres-cuartos'],
    rationale: 'Dorso más delgado + base alar más estrecha + punta refinada.',
    values: {
      'reduccion-global': -12,
      'adelgazar-dorso': -10,
      'reseccion-alar': -10,
      'refinamiento-punta': -8,
      'rotacion-punta': 5,
    },
  },
  {
    id: 'frontal-nariz-pequena',
    label: 'Nariz pequeña',
    appliesTo: ['frontal'],
    rationale: 'Reducción global pronunciada con osteotomía y refinamiento.',
    values: {
      'reduccion-global': -22,
      'adelgazar-dorso': -8,
      'reseccion-alar': -8,
      'refinamiento-punta': -10,
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
