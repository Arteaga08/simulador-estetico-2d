/**
 * Sistema de coordenadas local al eje nasal.
 *
 * Todos los desplazamientos quirúrgicos se expresan en este espacio
 * para que sean independientes de la inclinación de la foto.
 *
 * axisY: vector unitario bridge → base (dirección "inferior" del paciente)
 * axisX: perpendicular a axisY, apunta al lateral derecho del paciente
 * origin: punto medio del eje nasal (usado como centro para ghost anchors)
 */

interface Point {
  x: number
  y: number
}

export interface NasalFrame {
  axisY: Point
  axisX: Point
  origin: Point
}

export function buildNasalFrame(bridge: Point, base: Point): NasalFrame {
  const dx = base.x - bridge.x
  const dy = base.y - bridge.y
  const len = Math.hypot(dx, dy)
  if (len < 1e-6) {
    return {
      axisY: { x: 0, y: 1 },
      axisX: { x: 1, y: 0 },
      origin: { x: (bridge.x + base.x) / 2, y: (bridge.y + base.y) / 2 },
    }
  }
  const axisY: Point = { x: dx / len, y: dy / len }
  // 90° CCW de axisY en coords de pantalla (Y-invertida) → apunta al lateral del paciente
  const axisX: Point = { x: -axisY.y, y: axisY.x }
  return {
    axisY,
    axisX,
    origin: { x: (bridge.x + base.x) / 2, y: (bridge.y + base.y) / 2 },
  }
}

/**
 * Desplaza un punto en el espacio nasal local y devuelve coords de pantalla.
 * deltaAxial > 0 → hacia la base (inferior); < 0 → hacia el bridge (superior)
 * deltaLateral > 0 → lateral derecho del paciente; < 0 → lateral izquierdo
 */
export function applyNasalDelta(
  pt: Point,
  deltaAxial: number,
  deltaLateral: number,
  frame: NasalFrame,
): Point {
  return {
    x: pt.x + frame.axisY.x * deltaAxial + frame.axisX.x * deltaLateral,
    y: pt.y + frame.axisY.y * deltaAxial + frame.axisX.y * deltaLateral,
  }
}

/**
 * Dado un vector perpendicular a un eje (dos opciones: perp y -perp),
 * devuelve el unitario que apunta "anatómicamente hacia arriba" (opuesto a axisY).
 * Reemplaza el hack `if (ny > 0) { nx = -nx; ny = -ny }`.
 */
export function chooseSuperiorPerp(
  perpX: number,
  perpY: number,
  frame: NasalFrame,
): Point {
  const len = Math.hypot(perpX, perpY)
  if (len < 1e-6) return { x: 0, y: -1 }
  // Elegir la dirección con dot(-axisY) > 0 → apunta hacia el bridge
  const dot = perpX * (-frame.axisY.x) + perpY * (-frame.axisY.y)
  const sign = dot >= 0 ? 1 : -1
  return { x: (sign * perpX) / len, y: (sign * perpY) / len }
}

/**
 * Determina el signo del ángulo de rotación clínica para que +slider
 * siempre rote la punta "anatómicamente arriba" (hacia el bridge),
 * independientemente de la orientación de la foto.
 *
 * Devuelve +1 o -1 para multiplicar al ángulo clínico antes de pasar a
 * rotateTipAroundSubnasal (que opera en coords de pantalla).
 */
export function rotationSignForSuperiorTip(
  tip: Point,
  base: Point,
  frame: NasalFrame,
): 1 | -1 {
  const ttx = tip.x - base.x
  const tty = tip.y - base.y
  // Perpendicular CCW de (tip - base): si el dot con (-axisY) es positivo,
  // la rotación CCW mueve la punta "hacia arriba" anatómicamente.
  const ccwDotNegAxisY = (-tty) * (-frame.axisY.x) + ttx * (-frame.axisY.y)
  return ccwDotNegAxisY >= 0 ? 1 : -1
}
