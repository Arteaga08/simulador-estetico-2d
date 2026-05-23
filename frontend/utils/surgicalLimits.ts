/**
 * Reglas de simulación de rinoplastia basadas en TARGETS CLÍNICOS.
 *
 * Modelo: cada slider controla UNA métrica cefalométrica. El valor del slider
 * interpola entre la métrica actual del paciente y un target del canon (o su
 * anti-canon). Las funciones que aquí viven NO multiplican píxeles por
 * constantes mágicas — invocan `interpolateTarget` con el canon adecuado y
 * computan los destinos de landmarks que producen la métrica objetivo.
 *
 * Sliders y métricas:
 *   giba-nasal         → curvatura del dorso (px de desviación de bridgeMid
 *                        respecto a la línea radix→tip). Target canónico = 0.
 *   rotacion-punta     → ángulo nasolabial (grados).
 *   proyeccion-punta   → Goode ratio (proyección_tip / longitud_nasal).
 *   reduccion-global   → ancho_alar / ancho_facial (regla del quinto).
 *   adelgazar-dorso    → ancho_puente / ancho_alar (Crumley).
 *   reseccion-alar     → ancho_alar / distancia_canthal_externa.
 *   refinamiento-punta → ancho_punta / ancho_alar.
 *
 * Convención del slider: rango [-100, +100].
 *   +100 → métrica = canon (ideal estético del género del paciente)
 *      0 → métrica = original
 *   -100 → métrica = anti-canon (caricatura del extremo opuesto)
 */

import {
  getNasolabialAngle,
  rotateTipAroundSubnasal,
  computeNoseBbox,
} from "./cephalometry";
import type { ControlPoint, NoseBbox } from "@/lib/canvas/types";
import type { NoseLandmarks } from "@/lib/canvas/useFaceLandmarks";
import type { PatientGender } from "@/components/simulator/types";
import {
  getCanonForGender,
  interpolateTarget,
  ANTI_CANON_MULTIPLIER,
  type NasalCanon,
} from "@/lib/nasalCanon";

interface Point {
  x: number;
  y: number;
}

// ─── Calibración de pesos MLS (intencional del usuario, se conserva) ────────
const SURGICAL_MASS = {
  anchor: 50.0,       // ANTES 1.0. Ahora es peso de hueso masivo para bloquear la piel.
  pivot: 4.0,
  activeDorsum: 12.0, // era 6.5 — subido para que el dorso arrastre suficientes píxeles circundantes
  activeTip: 8.0,
};

const ALAR_TRANSFER = 0.28;
const MOVE_EPSILON_PX = 0.1;
// Desplazamiento máximo del tip por proyección, como fracción del largo nasal.
// Aumentar para efectos más dramáticos, reducir para resultados más sutiles.
const MAX_PROJECTION_DELTA_RATIO = 0.18;

// ─── Helpers de medición (extracción de métricas desde landmarks) ───────────

function measureDorsumCurvature(landmarks: NoseLandmarks): number {
  // Distancia perpendicular de bridgeMid a la recta radix→tip.
  // Positivo: bridgeMid está hacia el lado "exterior" de la cara (giba).
  const ax = landmarks.bridge.x;
  const ay = landmarks.bridge.y;
  const bx = landmarks.tip.x;
  const by = landmarks.tip.y;
  const px = landmarks.bridgeMid.x;
  const py = landmarks.bridgeMid.y;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return 0;
  // Producto cruzado (signed) / len → distancia con signo
  return ((px - ax) * dy - (py - ay) * dx) / len;
}

function measureGoodeRatio(landmarks: NoseLandmarks): number {
  // Goode ratio clínico: proyección horizontal subnasale→tip / distancia nasion→tip.
  // El denominador usa nasion (bridge, lm6), no subnasale — sin eso el ratio
  // sería siempre ~0.9-0.96 (coseno del ángulo) y el canon 0.55 produciría
  // una retracción masiva (~40%) en lugar del ajuste proporcional correcto.
  const noseLen = Math.hypot(
    landmarks.tip.x - landmarks.bridge.x,
    landmarks.tip.y - landmarks.bridge.y,
  );
  if (noseLen < 1e-6) return 0.55;
  const projection = Math.abs(landmarks.tip.x - landmarks.base.x);
  return projection / noseLen;
}

function measureNoseWidthRatio(landmarks: NoseLandmarks): number {
  const alarWidth = Math.abs(landmarks.nostrilR.x - landmarks.nostrilL.x);
  const faceWidth = landmarks.faceBoundingBox?.width ?? alarWidth * 5;
  if (faceWidth < 1e-6) return 0.20;
  return alarWidth / faceWidth;
}

function measureBridgeAlarRatio(landmarks: NoseLandmarks): number {
  // Ancho del puente óseo (proxy: distancia horizontal entre los puntos
  // laterales fantasma a la altura del bridgeMid). Como inicialmente los
  // fantasmas se generan a ±halfWidth_alar*0.30, la métrica inicial del
  // paciente para este ratio es 0.30*2 = 0.60.
  // Lo medimos del ancho real del dorso si se pudiera, pero el proxy basta
  // para calibrar la interpolación.
  // Usamos como proxy: 2 × halfWidth_inicial / ancho_alar = 0.60
  return 0.60;
}

function measureAlarIntercanthalRatio(landmarks: NoseLandmarks): number {
  const alarWidth = Math.abs(landmarks.nostrilR.x - landmarks.nostrilL.x);
  // Distancia entre canthos externos: anchors[2] (lm33) y anchors[3] (lm263)
  if (!landmarks.anchors || landmarks.anchors.length < 4) return 1.0;
  const intercanthal = Math.abs(
    landmarks.anchors[3].x - landmarks.anchors[2].x,
  );
  if (intercanthal < 1e-6) return 1.0;
  return alarWidth / intercanthal;
}

function measureTipAlarRatio(_landmarks: NoseLandmarks): number {
  // Sin landmarks para "ancho de punta" reales, usamos el proxy lobular
  // que constrainTipNarrow genera. Inicial: halfTipWidth = ancho_alar × 0.25,
  // total = ancho_alar × 0.50.
  return 0.50;
}

// ─── Constraints por slider — cada uno apunta a un target del canon ────────

interface GibaDestinations {
  radixDest: Point;
  gibaApexSrc: Point;
  gibaApexDest: Point;
  bridgeMidDest: Point;
}

function constrainGibaToTarget(
  slider: number,
  landmarks: NoseLandmarks,
  canon: NasalCanon,
): GibaDestinations {
  const current = measureDorsumCurvature(landmarks);
  const target = interpolateTarget(
    slider,
    current,
    canon.dorsumCurvature,
    ANTI_CANON_MULTIPLIER.dorsumCurvature,
  );
  // Necesitamos mover bridgeMid sobre la NORMAL al eje radix→tip de manera
  // que su distancia perpendicular pase de `current` a `target`.
  const ax = landmarks.bridge.x;
  const ay = landmarks.bridge.y;
  const bx = landmarks.tip.x;
  const by = landmarks.tip.y;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    const apex = {
      x: landmarks.bridge.x + 0.55 * (landmarks.bridgeMid.x - landmarks.bridge.x),
      y: landmarks.bridge.y + 0.55 * (landmarks.bridgeMid.y - landmarks.bridge.y),
    };
    return {
      radixDest: { ...landmarks.bridge },
      gibaApexSrc: apex,
      gibaApexDest: { ...apex },
      bridgeMidDest: { ...landmarks.bridgeMid },
    };
  }
  // Vector normal unitario (90° a la izquierda del eje radix→tip)
  const nx = dy / len;
  const ny = -dx / len;
  const delta = target - current;
  // Punto sintético al 55% entre radix y supratip — donde anatómicamente está el ápex de la giba.
  const gibaApexSrc: Point = {
    x: landmarks.bridge.x + 0.55 * (landmarks.bridgeMid.x - landmarks.bridge.x),
    y: landmarks.bridge.y + 0.55 * (landmarks.bridgeMid.y - landmarks.bridge.y),
  };
  return {
    // Radix sigue parcialmente al apex (35%) — necesario para evitar el
    // valle topológico entre supra1 (zona superior, ~22%) y gibaApex (100%).
    // Sin esto el MLS interpola con ondulación visible (joroba residual).
    radixDest: {
      x: landmarks.bridge.x + nx * delta * 0.35,
      y: landmarks.bridge.y + ny * delta * 0.35,
    },
    // Ápex absorbe el 100% del delta — es el punto más prominente que debe bajar
    gibaApexSrc,
    gibaApexDest: {
      x: gibaApexSrc.x + nx * delta,
      y: gibaApexSrc.y + ny * delta,
    },
    // Supratip sigue parcialmente para suavizar la transición hacia la punta
    bridgeMidDest: {
      x: landmarks.bridgeMid.x + nx * delta * 0.65,
      y: landmarks.bridgeMid.y + ny * delta * 0.65,
    },
  };
}

interface TipRotationDestinations {
  tipDest: Point;
  bridgeMidDest: Point;
}

const SUPRATIP_TRANSFER = 0.35;

/** Delta angular clínico máximo en cada extremo del slider (15°). */
const MAX_ROTATION_RAD = Math.PI / 12;

/** Posición del ghost columela principal: 55% del camino base→tip. */
const COLUMELLA_GHOST_T = 0.55;

/** Magnitud máxima del desplazamiento perpendicular = 22% del largo nasal. */
const MAX_COLUMELLA_MOVE_RATIO = 0.22;

interface ColumellaResult {
  ghostSrc: Point;
  ghostDest: Point;
  ghost2Src: Point;
  ghost2Dest: Point;
}

/**
 * Retracción columelar — efecto hamaca con ghost point.
 *
 * El tejido entre la base y el tip se desplaza perpendicular al eje base→tip,
 * mientras los extremos (tip y base) quedan inmóviles como muros. Esto simula
 * la corrección quirúrgica de columela colgante sin rotar la nariz completa.
 */
function constrainColumellaRetraction(
  slider: number,
  landmarks: NoseLandmarks,
): ColumellaResult | null {
  const normalized = Math.max(-1, Math.min(1, slider / 100));
  if (normalized === 0) return null;

  const dx = landmarks.tip.x - landmarks.base.x;
  const dy = landmarks.tip.y - landmarks.base.y;
  const noseLen = Math.hypot(dx, dy);
  if (noseLen < 1e-6) return null;

  // Ghost source al 45% desde base hacia tip
  const ghostSrc: Point = {
    x: landmarks.base.x + dx * COLUMELLA_GHOST_T,
    y: landmarks.base.y + dy * COLUMELLA_GHOST_T,
  };

  // Vector perpendicular apuntando "hacia arriba" en screen-coords (Y negativo)
  let nx = -dy;
  let ny = dx;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const nLen = Math.hypot(nx, ny);
  const unitNx = nx / nLen;
  const unitNy = ny / nLen;

  // Magnitud final del desplazamiento
  const magnitude = normalized * MAX_COLUMELLA_MOVE_RATIO * noseLen;

  // Segundo ghost al 25% base→tip (más cerca de la base) para esparcir el aplanamiento
  const ghost2T = 0.25;
  const ghost2Src: Point = {
    x: landmarks.base.x + dx * ghost2T,
    y: landmarks.base.y + dy * ghost2T,
  };
  const ghost2Magnitude = magnitude * 0.75;

  return {
    ghostSrc,
    ghostDest: {
      x: ghostSrc.x + unitNx * magnitude,
      y: ghostSrc.y + unitNy * magnitude,
    },
    ghost2Src,
    ghost2Dest: {
      x: ghost2Src.x + unitNx * ghost2Magnitude,
      y: ghost2Src.y + unitNy * ghost2Magnitude,
    },
  };
}

export function constrainTipRotationToTarget(
  slider: number,
  landmarks: NoseLandmarks,
  _canon: NasalCanon,
): TipRotationDestinations {
  // Detección de orientación: necesaria para que +slider rote la punta
  // hacia arriba en coords de pantalla independientemente del lado al
  // que mire el paciente.
  const dx = landmarks.tip.x - landmarks.base.x;
  const facingRight = dx > 0;

  // Slider normalizado a [-1, 1] con clamp de seguridad
  const normalized = Math.max(-1, Math.min(1, slider / 100));

  // Theta clínico: +1 → +15° (punta arriba), -1 → -15° (punta abajo)
  const clinicalTheta = normalized * MAX_ROTATION_RAD;

  // Corrección de signo para coords de pantalla (Y invertida).
  // Right-facing: clínica arriba = CW visual = ángulo negativo en math.
  const screenTheta = facingRight ? -clinicalTheta : clinicalTheta;

  // Arco circular del tip alrededor del subnasal (pivote fijo, radio preservado)
  const tipDest = rotateTipAroundSubnasal(
    landmarks.tip,
    landmarks.base,
    screenTheta,
  );

  // Arrastre del supratip con decay (mismo pivote, menor ángulo)
  const bridgeMidDest = rotateTipAroundSubnasal(
    landmarks.bridgeMid,
    landmarks.base,
    screenTheta * SUPRATIP_TRANSFER,
  );

  return { tipDest, bridgeMidDest };
}

interface ProjectionResult {
  /** Vector colinear al eje base→tip, a aplicar con decay en supratip/columela. */
  vectorDelta: Point;
  tipDest: Point;
}

function constrainProjectionToTarget(
  slider: number,
  landmarks: NoseLandmarks,
  canon: NasalCanon,
): ProjectionResult {
  const current = measureGoodeRatio(landmarks);
  const target = interpolateTarget(
    slider,
    current,
    canon.goodeRatio,
    ANTI_CANON_MULTIPLIER.goodeRatio,
  );
  if (current < 1e-6) {
    return { vectorDelta: { x: 0, y: 0 }, tipDest: { ...landmarks.tip } };
  }
  // Factor de escala del vector subnasal→tip para alcanzar target ratio.
  const factor = target / current;
  const dx = landmarks.tip.x - landmarks.base.x;
  const dy = landmarks.tip.y - landmarks.base.y;
  const rawX = landmarks.base.x + dx * factor;
  const rawY = landmarks.base.y + dy * factor;
  // Clamp: no mover el tip más de MAX_PROJECTION_DELTA_RATIO × largo nasal.
  const noseLen = Math.hypot(
    landmarks.tip.x - landmarks.bridge.x,
    landmarks.tip.y - landmarks.bridge.y,
  );
  const maxDelta = noseLen * MAX_PROJECTION_DELTA_RATIO;
  const deltaX = rawX - landmarks.tip.x;
  const deltaY = rawY - landmarks.tip.y;
  const deltaLen = Math.hypot(deltaX, deltaY);
  let tipDest: Point;
  if (deltaLen > maxDelta && deltaLen > 1e-6) {
    const s = maxDelta / deltaLen;
    tipDest = { x: landmarks.tip.x + deltaX * s, y: landmarks.tip.y + deltaY * s };
  } else {
    tipDest = { x: rawX, y: rawY };
  }
  return {
    vectorDelta: {
      x: tipDest.x - landmarks.tip.x,
      y: tipDest.y - landmarks.tip.y,
    },
    tipDest,
  };
}

interface UniformShrinkDestinations {
  bridgeDest: Point;
  bridgeMidDest: Point;
  tipDest: Point;
  nostrilLDest: Point;
  nostrilRDest: Point;
}

function constrainUniformShrinkToTarget(
  slider: number,
  landmarks: NoseLandmarks,
  canon: NasalCanon,
): UniformShrinkDestinations {
  const current = measureNoseWidthRatio(landmarks);
  const target = interpolateTarget(
    slider,
    current,
    canon.noseWidthRatio,
    ANTI_CANON_MULTIPLIER.noseWidthRatio,
  );
  if (current < 1e-6) {
    return {
      bridgeDest: { ...landmarks.bridge },
      bridgeMidDest: { ...landmarks.bridgeMid },
      tipDest: { ...landmarks.tip },
      nostrilLDest: { ...landmarks.nostrilL },
      nostrilRDest: { ...landmarks.nostrilR },
    };
  }
  const factor = target / current;
  // Centro de escalado: punto medio entre radix y tip en X, en su Y respectivo.
  const cx = (landmarks.bridge.x + landmarks.tip.x) / 2;
  const cy = (landmarks.bridge.y + landmarks.tip.y) / 2;
  const scaleP = (p: Point): Point => ({
    x: cx + (p.x - cx) * factor,
    y: cy + (p.y - cy) * factor,
  });
  return {
    bridgeDest: scaleP(landmarks.bridge),
    bridgeMidDest: scaleP(landmarks.bridgeMid),
    tipDest: scaleP(landmarks.tip),
    nostrilLDest: scaleP(landmarks.nostrilL),
    nostrilRDest: scaleP(landmarks.nostrilR),
  };
}

interface BridgeNarrowDestinations {
  bridgeDest: Point;
  bridgeMidDest: Point;
  lateralLeftSrc: Point;
  lateralLeftDest: Point;
  lateralRightSrc: Point;
  lateralRightDest: Point;
}

function constrainBridgeNarrowToTarget(
  slider: number,
  landmarks: NoseLandmarks,
  canon: NasalCanon,
): BridgeNarrowDestinations {
  const current = measureBridgeAlarRatio(landmarks);
  const target = interpolateTarget(
    slider,
    current,
    canon.bridgeAlarRatio,
    ANTI_CANON_MULTIPLIER.bridgeAlarRatio,
  );
  const factor = current < 1e-6 ? 1 : target / current;
  const midX = landmarks.base.x;
  // Geometría del fantasma: a ±halfWidth × factor del midX (en X), a la altura
  // del supratip (Y del bridgeMid).
  const halfWidth =
    Math.abs(landmarks.nostrilL.x - landmarks.nostrilR.x) * 0.30;
  const ghostY = landmarks.bridgeMid.y;
  return {
    bridgeDest: {
      x: midX + (landmarks.bridge.x - midX) * factor,
      y: landmarks.bridge.y,
    },
    bridgeMidDest: {
      x: midX + (landmarks.bridgeMid.x - midX) * factor,
      y: landmarks.bridgeMid.y,
    },
    lateralLeftSrc: { x: midX - halfWidth, y: ghostY },
    lateralLeftDest: { x: midX - halfWidth * factor, y: ghostY },
    lateralRightSrc: { x: midX + halfWidth, y: ghostY },
    lateralRightDest: { x: midX + halfWidth * factor, y: ghostY },
  };
}

interface AlarNarrowDestinations {
  nostrilLDest: Point;
  nostrilRDest: Point;
}

function constrainAlarNarrowToTarget(
  slider: number,
  landmarks: NoseLandmarks,
  canon: NasalCanon,
): AlarNarrowDestinations {
  const current = measureAlarIntercanthalRatio(landmarks);
  const target = interpolateTarget(
    slider,
    current,
    canon.alarIntercanthalRatio,
    ANTI_CANON_MULTIPLIER.alarIntercanthalRatio,
  );
  const factor = current < 1e-6 ? 1 : target / current;
  const midX = landmarks.base.x;
  return {
    nostrilLDest: {
      x: midX + (landmarks.nostrilL.x - midX) * factor,
      y: landmarks.nostrilL.y,
    },
    nostrilRDest: {
      x: midX + (landmarks.nostrilR.x - midX) * factor,
      y: landmarks.nostrilR.y,
    },
  };
}

interface TipNarrowDestinations {
  tipDest: Point;
  lobuleLeftSrc: Point;
  lobuleLeftDest: Point;
  lobuleRightSrc: Point;
  lobuleRightDest: Point;
}

function constrainTipNarrowToTarget(
  slider: number,
  landmarks: NoseLandmarks,
  canon: NasalCanon,
): TipNarrowDestinations {
  const current = measureTipAlarRatio(landmarks);
  const target = interpolateTarget(
    slider,
    current,
    canon.tipAlarRatio,
    ANTI_CANON_MULTIPLIER.tipAlarRatio,
  );
  const factor = current < 1e-6 ? 1 : target / current;
  const midX = landmarks.base.x;
  const halfTipWidth =
    Math.abs(landmarks.nostrilL.x - landmarks.nostrilR.x) * 0.25;
  return {
    tipDest: {
      x: midX + (landmarks.tip.x - midX) * factor,
      y: landmarks.tip.y,
    },
    lobuleLeftSrc: { x: midX - halfTipWidth, y: landmarks.tip.y },
    lobuleLeftDest: { x: midX - halfTipWidth * factor, y: landmarks.tip.y },
    lobuleRightSrc: { x: midX + halfTipWidth, y: landmarks.tip.y },
    lobuleRightDest: { x: midX + halfTipWidth * factor, y: landmarks.tip.y },
  };
}

// ─── Acoplamiento clínico (heurística mínima) ───────────────────────────────

export interface CouplingResult {
  values: Record<string, number>;
  autoAdjusted: string[];
}

export function applyClinicalCoupling(
  sliders: Record<string, number>,
): CouplingResult {
  const out: Record<string, number> = { ...sliders };
  const autoAdjusted: string[] = [];
  // Quitar giba siempre rota el tip arriba anatómicamente.
  // Progresivo: giba 30 → +0 rot, giba 60 → ~21 rot, giba 100 → ~50 rot.
  const giba = out["giba-nasal"] ?? 0;
  const rot = out["rotacion-punta"] ?? 0;
  if (giba >= 30) {
    const suggestedRot = Math.round((giba - 30) * 0.71);
    if (rot < suggestedRot) {
      out["rotacion-punta"] = suggestedRot;
      autoAdjusted.push("rotacion-punta");
    }
  }
  return { values: out, autoAdjusted };
}

// ─── Builder principal ──────────────────────────────────────────────────────

export interface BuildResult {
  points: ControlPoint[];
  noseBbox: NoseBbox;
}

export function buildRhinoplastyControlPoints(
  sliderValues: Record<string, number>,
  intensity: number,
  landmarks: NoseLandmarks,
  canvasW: number,
  canvasH: number,
  gender: PatientGender,
): BuildResult {
  const scale = intensity / 100;
  const canon = getCanonForGender(gender);
  const { values: coupled } = applyClinicalCoupling(sliderValues);

  // El slider efectivo se escala por intensidad: intensidad 100 = slider pleno,
  // intensidad 50 = la mitad del recorrido hacia el target.
  const s = (id: string) => (coupled[id] ?? 0) * scale;

  const giba = s("giba-nasal");
  const rot = s("rotacion-punta");
  const proy = s("proyeccion-punta");
  const retraccion = s("retraccion-columelar");
  const reduccion = s("reduccion-global");
  const adelgazar = s("adelgazar-dorso");
  const reseccion = s("reseccion-alar");
  const refinamiento = s("refinamiento-punta");

  // Destinos acumulativos
  let finalRadix: Point = { ...landmarks.bridge };
  let finalBridgeMid: Point = { ...landmarks.bridgeMid };
  let finalTip: Point = { ...landmarks.tip };
  let extraNostrilL: Point = { x: 0, y: 0 };
  let extraNostrilR: Point = { x: 0, y: 0 };

  let bridgeGhosts: BridgeNarrowDestinations | null = null;
  let tipGhosts: TipNarrowDestinations | null = null;
  let gibaApexSrc: Point | null = null;
  let gibaApexDest: Point | null = null;
  let projectionVector: Point | null = null;
  let columellaGhost: ColumellaResult | null = null;

  if (retraccion !== 0) {
    columellaGhost = constrainColumellaRetraction(retraccion, landmarks);
  }

  // ─── PERFIL — sliders cefalométricos ─────────────────────────────────────
  if (giba !== 0) {
    const g = constrainGibaToTarget(giba, landmarks, canon);
    finalRadix.x += g.radixDest.x - landmarks.bridge.x;
    finalRadix.y += g.radixDest.y - landmarks.bridge.y;
    finalBridgeMid.x += g.bridgeMidDest.x - landmarks.bridgeMid.x;
    finalBridgeMid.y += g.bridgeMidDest.y - landmarks.bridgeMid.y;
    gibaApexSrc = g.gibaApexSrc;
    gibaApexDest = g.gibaApexDest;
  }
  if (rot !== 0) {
    const r = constrainTipRotationToTarget(rot, landmarks, canon);
    finalTip.x += r.tipDest.x - landmarks.tip.x;
    finalTip.y += r.tipDest.y - landmarks.tip.y;
    finalBridgeMid.x += r.bridgeMidDest.x - landmarks.bridgeMid.x;
    finalBridgeMid.y += r.bridgeMidDest.y - landmarks.bridgeMid.y;
  }
  if (proy !== 0) {
    const p = constrainProjectionToTarget(proy, landmarks, canon);
    // Tip: 100% del vector colinear base→tip
    finalTip.x += p.vectorDelta.x;
    finalTip.y += p.vectorDelta.y;
    // Supratip: 50% del vector — decay hacia el dorso
    finalBridgeMid.x += p.vectorDelta.x * 0.50;
    finalBridgeMid.y += p.vectorDelta.y * 0.50;
    // Guardar el vector para el control point de columela
    projectionVector = p.vectorDelta;
  }

  // ─── FRONTAL — sliders de proporciones ───────────────────────────────────
  if (reduccion !== 0) {
    const u = constrainUniformShrinkToTarget(reduccion, landmarks, canon);
    finalRadix.x += u.bridgeDest.x - landmarks.bridge.x;
    finalRadix.y += u.bridgeDest.y - landmarks.bridge.y;
    finalBridgeMid.x += u.bridgeMidDest.x - landmarks.bridgeMid.x;
    finalBridgeMid.y += u.bridgeMidDest.y - landmarks.bridgeMid.y;
    finalTip.x += u.tipDest.x - landmarks.tip.x;
    finalTip.y += u.tipDest.y - landmarks.tip.y;
    extraNostrilL.x += u.nostrilLDest.x - landmarks.nostrilL.x;
    extraNostrilL.y += u.nostrilLDest.y - landmarks.nostrilL.y;
    extraNostrilR.x += u.nostrilRDest.x - landmarks.nostrilR.x;
    extraNostrilR.y += u.nostrilRDest.y - landmarks.nostrilR.y;
  }
  if (adelgazar !== 0) {
    const b = constrainBridgeNarrowToTarget(adelgazar, landmarks, canon);
    finalRadix.x += b.bridgeDest.x - landmarks.bridge.x;
    finalBridgeMid.x += b.bridgeMidDest.x - landmarks.bridgeMid.x;
    bridgeGhosts = b;
  }
  if (reseccion !== 0) {
    const a = constrainAlarNarrowToTarget(reseccion, landmarks, canon);
    extraNostrilL.x += a.nostrilLDest.x - landmarks.nostrilL.x;
    extraNostrilR.x += a.nostrilRDest.x - landmarks.nostrilR.x;
  }
  if (refinamiento !== 0) {
    const t = constrainTipNarrowToTarget(refinamiento, landmarks, canon);
    finalTip.x += t.tipDest.x - landmarks.tip.x;
    tipGhosts = t;
  }

  // ─── ALAR TRANSFER (acoplamiento físico tip → alas) ──────────────────────
  // Las alas absorben una fracción del movimiento del tip para evitar el
  // "rubber band" pero respetando los deltas explícitos de slider.
  const tipDeltaX = finalTip.x - landmarks.tip.x;
  const tipDeltaY = finalTip.y - landmarks.tip.y;
  const noseLenPx = Math.hypot(
    landmarks.tip.x - landmarks.base.x,
    landmarks.tip.y - landmarks.base.y,
  );
  const maxAlarOffset = noseLenPx * 0.10;
  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));
  const alarOffset = {
    x: clamp(tipDeltaX * ALAR_TRANSFER, -maxAlarOffset, maxAlarOffset),
    y: clamp(tipDeltaY * ALAR_TRANSFER, -maxAlarOffset, maxAlarOffset),
  };

  const finalNostrilL: Point = {
    x: landmarks.nostrilL.x + alarOffset.x + extraNostrilL.x,
    y: landmarks.nostrilL.y + alarOffset.y + extraNostrilL.y,
  };
  const finalNostrilR: Point = {
    x: landmarks.nostrilR.x + alarOffset.x + extraNostrilR.x,
    y: landmarks.nostrilR.y + alarOffset.y + extraNostrilR.y,
  };
  const finalBase: Point = {
    x: landmarks.base.x + alarOffset.x,
    y: landmarks.base.y + alarOffset.y,
  };

  // ─── INYECCIÓN DE CONTROL POINTS MLS ────────────────────────────────────
  const points: ControlPoint[] = [];

  // Anchors faciales estáticos
  if (landmarks.anchors) {
    for (const a of landmarks.anchors) {
      points.push({
        px: a.x,
        py: a.y,
        qx: a.x,
        qy: a.y,
        w: SURGICAL_MASS.anchor,
      });
    }
  }

  // Pivotes alares + base subnasal
  points.push({
    px: finalNostrilL.x,
    py: finalNostrilL.y,
    qx: landmarks.nostrilL.x,
    qy: landmarks.nostrilL.y,
    w: SURGICAL_MASS.pivot,
  });
  points.push({
    px: finalNostrilR.x,
    py: finalNostrilR.y,
    qx: landmarks.nostrilR.x,
    qy: landmarks.nostrilR.y,
    w: SURGICAL_MASS.pivot,
  });
  points.push({
    px: finalBase.x,
    py: finalBase.y,
    qx: landmarks.base.x,
    qy: landmarks.base.y,
    w: SURGICAL_MASS.pivot,
  });

  // Dorso activo
  if (
    Math.abs(finalRadix.x - landmarks.bridge.x) > MOVE_EPSILON_PX ||
    Math.abs(finalRadix.y - landmarks.bridge.y) > MOVE_EPSILON_PX
  ) {
    points.push({
      px: finalRadix.x,
      py: finalRadix.y,
      qx: landmarks.bridge.x,
      qy: landmarks.bridge.y,
      w: SURGICAL_MASS.activeDorsum,
    });
  }
  if (
    Math.abs(finalBridgeMid.x - landmarks.bridgeMid.x) > MOVE_EPSILON_PX ||
    Math.abs(finalBridgeMid.y - landmarks.bridgeMid.y) > MOVE_EPSILON_PX
  ) {
    points.push({
      px: finalBridgeMid.x,
      py: finalBridgeMid.y,
      qx: landmarks.bridgeMid.x,
      qy: landmarks.bridgeMid.y,
      w: SURGICAL_MASS.activeDorsum,
    });
  }
  if (gibaApexSrc && gibaApexDest) {
    points.push({
      px: gibaApexDest.x,
      py: gibaApexDest.y,
      qx: gibaApexSrc.x,
      qy: gibaApexSrc.y,
      w: SURGICAL_MASS.activeDorsum,
    });

    // Supraradix: extiende el efecto de giba al área entre radix y glabela.
    // Cadena de gradiente: glabella(ancla) → supra2(30%) → supra1(55%) → gibaApex(100%).
    const apexDX = gibaApexDest.x - gibaApexSrc.x;
    const apexDY = gibaApexDest.y - gibaApexSrc.y;
    const glabella = landmarks.anchors?.[0];
    if (
      glabella &&
      (Math.abs(apexDX) > MOVE_EPSILON_PX || Math.abs(apexDY) > MOVE_EPSILON_PX)
    ) {
      // Cadena monótona arriba del bridge (35%) hacia glabella (0%):
      //   glabella(0%) → supra2(14%) → supra1(22%) → bridge(35%) → gibaApex(100%)
      // Mantiene la pendiente descendente del campo de deformación sin valles.
      const supraSrc: Point = {
        x: landmarks.bridge.x + (glabella.x - landmarks.bridge.x) * 0.45,
        y: landmarks.bridge.y + (glabella.y - landmarks.bridge.y) * 0.45,
      };
      points.push({
        px: supraSrc.x + apexDX * 0.22,
        py: supraSrc.y + apexDY * 0.22,
        qx: supraSrc.x,
        qy: supraSrc.y,
        w: 5.0,
      });
      const supra2Src: Point = {
        x: landmarks.bridge.x + (glabella.x - landmarks.bridge.x) * 0.65,
        y: landmarks.bridge.y + (glabella.y - landmarks.bridge.y) * 0.65,
      };
      points.push({
        px: supra2Src.x + apexDX * 0.14,
        py: supra2Src.y + apexDY * 0.14,
        qx: supra2Src.x,
        qy: supra2Src.y,
        w: 4.0,
      });
    }
  }

  // Tip activo
  if (
    Math.abs(tipDeltaX) > MOVE_EPSILON_PX ||
    Math.abs(tipDeltaY) > MOVE_EPSILON_PX
  ) {
    points.push({
      px: finalTip.x,
      py: finalTip.y,
      qx: landmarks.tip.x,
      qy: landmarks.tip.y,
      w: SURGICAL_MASS.activeTip,
    });

    // Sub-tip: extiende el movimiento del tip hacia la columela (sin tocar la base).
    // Sigue 45% del delta del tip — evita el "escalón" entre tip activo y base estática.
    const subTipSrc: Point = {
      x: landmarks.tip.x + (landmarks.base.x - landmarks.tip.x) * 0.45,
      y: landmarks.tip.y + (landmarks.base.y - landmarks.tip.y) * 0.45,
    };
    points.push({
      px: subTipSrc.x + tipDeltaX * 0.45,
      py: subTipSrc.y + tipDeltaY * 0.45,
      qx: subTipSrc.x,
      qy: subTipSrc.y,
      w: 4.0,
    });
  }

  // Columela de proyección: refuerza la cadena con el vector colinear puro.
  // Posicionado al 35% tip→base, sigue 40% del vector de proyección.
  // Asegura que la zona de la columela acompañe la magnitud sin desviarse en dirección.
  if (projectionVector) {
    const columelaSrc: Point = {
      x: landmarks.tip.x + (landmarks.base.x - landmarks.tip.x) * 0.35,
      y: landmarks.tip.y + (landmarks.base.y - landmarks.tip.y) * 0.35,
    };
    points.push({
      px: columelaSrc.x + projectionVector.x * 0.40,
      py: columelaSrc.y + projectionVector.y * 0.40,
      qx: columelaSrc.x,
      qy: columelaSrc.y,
      w: 4.0,
    });
  }

  // Retracción columelar: efecto hamaca con ghost point.
  // Tip y base actúan como muros de masa alta — la deformación queda confinada
  // a la zona columelar sin rotar la nariz completa.
  if (columellaGhost) {
    // Muro 1: tip anclado en su posición final
    points.push({
      px: finalTip.x,
      py: finalTip.y,
      qx: finalTip.x,
      qy: finalTip.y,
      w: SURGICAL_MASS.anchor,
    });
    // Muro 2: base anclada en su posición final
    points.push({
      px: finalBase.x,
      py: finalBase.y,
      qx: finalBase.x,
      qy: finalBase.y,
      w: SURGICAL_MASS.anchor,
    });
    // Ghost columela 1: principal al 45% base→tip
    points.push({
      px: columellaGhost.ghostDest.x,
      py: columellaGhost.ghostDest.y,
      qx: columellaGhost.ghostSrc.x,
      qy: columellaGhost.ghostSrc.y,
      w: SURGICAL_MASS.activeTip,
    });
    // Ghost columela 2: secundario al 30% base→tip — esparce el aplanamiento
    points.push({
      px: columellaGhost.ghost2Dest.x,
      py: columellaGhost.ghost2Dest.y,
      qx: columellaGhost.ghost2Src.x,
      qy: columellaGhost.ghost2Src.y,
      w: SURGICAL_MASS.activeTip * 0.75,
    });
  }

  // Fantasmas de osteotomía lateral
  if (bridgeGhosts) {
    points.push({
      px: bridgeGhosts.lateralLeftDest.x,
      py: bridgeGhosts.lateralLeftDest.y,
      qx: bridgeGhosts.lateralLeftSrc.x,
      qy: bridgeGhosts.lateralLeftSrc.y,
      w: SURGICAL_MASS.activeDorsum,
    });
    points.push({
      px: bridgeGhosts.lateralRightDest.x,
      py: bridgeGhosts.lateralRightDest.y,
      qx: bridgeGhosts.lateralRightSrc.x,
      qy: bridgeGhosts.lateralRightSrc.y,
      w: SURGICAL_MASS.activeDorsum,
    });
  }

  // Fantasmas de refinamiento de punta
  if (tipGhosts) {
    points.push({
      px: tipGhosts.lobuleLeftDest.x,
      py: tipGhosts.lobuleLeftDest.y,
      qx: tipGhosts.lobuleLeftSrc.x,
      qy: tipGhosts.lobuleLeftSrc.y,
      w: SURGICAL_MASS.activeTip,
    });
    points.push({
      px: tipGhosts.lobuleRightDest.x,
      py: tipGhosts.lobuleRightDest.y,
      qx: tipGhosts.lobuleRightSrc.x,
      qy: tipGhosts.lobuleRightSrc.y,
      w: SURGICAL_MASS.activeTip,
    });
  }

  const noseBbox = computeNoseBbox(landmarks, canvasW, canvasH);
  return { points, noseBbox };
}

// Backward-compat: tests anteriores importan constrainProfileTipRotation con
// signature (slider, landmarks, maxAngleRad). Lo mantenemos como wrapper que
// emula la firma vieja para no romper los tests del régimen anterior.
export function constrainProfileTipRotation(
  sliderValue: number,
  landmarks: NoseLandmarks,
  _maxAngleRad: number,
): TipRotationDestinations {
  return constrainTipRotationToTarget(
    sliderValue,
    landmarks,
    getCanonForGender("F"),
  );
}
