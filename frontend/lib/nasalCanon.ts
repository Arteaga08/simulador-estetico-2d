import type { PatientGender } from '@/components/simulator/types'

/**
 * Canon cefalométrico para rinoplastia.
 *
 * Cada slider del simulador controla UNA métrica clínica específica. El valor
 * del slider interpola entre:
 *   slider =    0  → métrica original del paciente (sin cambio)
 *   slider = +100  → métrica = valor del canon (ideal estético del género)
 *   slider = -100  → métrica = anti-canon (caricatura del extremo opuesto)
 *
 * Esto reemplaza el modelo anterior donde el slider = "X píxeles arbitrarios".
 * Cada constante aquí está fundamentada en literatura clínica clásica
 * (Powell-Humphries, Crumley, Goode, regla del quinto de Leonardo).
 */

export interface NasalCanon {
  // ─── Perfil ────────────────────────────────────────────────────────────────
  /** Ángulo nasolabial: vector Sn→Pn respecto a la horizontal, en grados. */
  nasolabialAngle: number
  /** Goode ratio: proyección perpendicular del tip a la TVL / longitud nasal. */
  goodeRatio: number
  /** Curvatura del dorso: desviación de bridgeMid respecto a la línea
   *  radix→tip, en píxeles. 0 = dorso perfectamente recto.
   *  Positivo = giba (bridgeMid se proyecta hacia afuera del rostro). */
  dorsumCurvature: number

  // ─── Frontal ───────────────────────────────────────────────────────────────
  /** Ancho_alar / ancho_facial (regla del quinto de Leonardo: 1/5 = 0.20). */
  noseWidthRatio: number
  /** Ancho del puente óseo / ancho alar (Crumley ratio). */
  bridgeAlarRatio: number
  /** Ancho alar / distancia entre canthos externos. */
  alarIntercanthalRatio: number
  /** Ancho de la punta lobular / ancho alar. */
  tipAlarRatio: number
}

/**
 * Canon femenino (Powell-Humphries):
 *   - Ángulo nasolabial 100-110° (centro 105°)
 *   - Dorso recto o ligerísima curva supratip
 *   - Punta refinada, alas estrechas
 *   - Proporción nariz/cara más pequeña que el masculino
 */
export const FEMININE_CANON: NasalCanon = {
  nasolabialAngle:       105,
  // Ratio Byrd canónico (P/L = 0.67). NOTA: el campo se llama `goodeRatio` por
  // legado, pero `measureGoodeRatio` en surgicalLimits.ts en realidad mide
  // Byrd (P horizontal / L nasion→tip), NO el Goode clásico (P / altura vertical).
  goodeRatio:            0.67,
  dorsumCurvature:       0,
  noseWidthRatio:        0.20,
  // bridgeAlarRatio: el proxy `measureBridgeAlarRatio` devuelve 0.60 hardcoded
  // (basado en la geometría inicial de los ghosts: 2 × 0.30 × alarWidth).
  // Para que +slider ESTRECHE el puente, el canon debe ser < 0.60.
  // 0.45 corresponde a un dorso refinado femenino (45% del ancho alar).
  bridgeAlarRatio:       0.45,
  alarIntercanthalRatio: 0.90,
  tipAlarRatio:          0.45,
}

/**
 * Canon masculino:
 *   - Ángulo nasolabial 90-100° (centro 95°), más vertical
 *   - Dorso recto (no curva femenina)
 *   - Punta más ancha, alas más prominentes
 *   - Proporción nariz/cara más generosa
 */
export const MASCULINE_CANON: NasalCanon = {
  nasolabialAngle:       95,
  // Ratio Byrd canónico — el ratio armónico P/L no difiere significativamente
  // por género; lo que cambia es el ángulo nasolabial.
  goodeRatio:            0.67,
  dorsumCurvature:       0,
  noseWidthRatio:        0.22,
  // Misma corrección que femenino: el proxy es 0.60, canon debe ser < 0.60
  // para que +slider estreche. Masculino mantiene el puente algo más ancho
  // que femenino (~55% del alar) pero todavía menos que el original.
  bridgeAlarRatio:       0.55,
  alarIntercanthalRatio: 1.00,
  tipAlarRatio:          0.55,
}

/**
 * Multiplicador para producir el "anti-canon" (slider = −100). Multiplica la
 * métrica ACTUAL del paciente (no la del canon). Por ejemplo, si la nariz
 * actual tiene ángulo nasolabial 95°, slider=−100 produce 95° × 0.80 = 76°
 * (punta caída). Si la nariz ya está flaca, slider=−100 produce ancho × 1.40.
 *
 * Anti-canon SIEMPRE empeora la métrica respecto del canon (más exagerada,
 * menos refinada). Es la "vista contraria" útil para mostrarle al paciente
 * cómo se vería sin la cirugía planeada.
 */
export const ANTI_CANON_MULTIPLIER = {
  nasolabialAngle:       0.80,
  goodeRatio:            1.35,
  dorsumCurvature:       5.0,
  noseWidthRatio:        1.40,
  bridgeAlarRatio:       1.30,
  alarIntercanthalRatio: 1.40,
  tipAlarRatio:          1.50,
} as const

export function getCanonForGender(gender: PatientGender): NasalCanon {
  return gender === 'F' ? FEMININE_CANON : MASCULINE_CANON
}

/**
 * Interpola la métrica objetivo a partir del slider [-100, +100], del valor
 * actual de la métrica y del canon.
 *
 *   slider = 0   → current
 *   slider = +100 → canon
 *   slider = -100 → current × antiMultiplier
 */
export function interpolateTarget(
  slider: number,
  current: number,
  canon: number,
  antiMultiplier: number,
): number {
  const t = slider / 100
  if (t >= 0) {
    return current + (canon - current) * t
  }
  const anti = current * antiMultiplier
  return current + (anti - current) * -t
}
