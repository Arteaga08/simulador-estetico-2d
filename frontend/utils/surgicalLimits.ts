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
import {
  applyNasalDelta,
  buildNasalFrame,
  rotationSignForSuperiorTip,
  type NasalFrame,
} from "./nasalCoordinateFrame";
import { classifyFaceView, type FaceView } from "./viewClassifier";

interface Point {
  x: number;
  y: number;
}

// ─── Calibración de pesos MLS (intencional del usuario, se conserva) ────────
const SURGICAL_MASS = {
  anchor: 50.0,
  pivot: 4.0,
  activeDorsum: 20.0,
  activeTip: 20.0,
  rhinionPivot: 8.0,
};

const ALAR_TRANSFER = 0.28;
const MOVE_EPSILON_PX = 0.1;
// Desplazamiento máximo del tip por proyección, como fracción del largo nasal.
// Aumentar para efectos más dramáticos, reducir para resultados más sutiles.
const MAX_PROJECTION_DELTA_RATIO = 0.30;

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
  // Ratio Byrd (P/L): proyección horizontal (subnasale→tip) / largo nasion→tip.
  // Canon armónico = 0.67. Subnasale (lm2) es el plano facial lateral de referencia;
  // equivalente al alar-facial groove de Byrd en fotos de perfil y más estable.
  const noseLen = Math.hypot(
    landmarks.tip.x - landmarks.bridge.x,
    landmarks.tip.y - landmarks.bridge.y,
  );
  if (noseLen < 1e-6) return 0.67;
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
  // anchors[1]=lm133 (inner left eye), anchors[2]=lm362 (inner right eye)
  if (!landmarks.anchors || landmarks.anchors.length < 3) return 1.0;
  const intercanthal = Math.hypot(
    landmarks.anchors[2].x - landmarks.anchors[1].x,
    landmarks.anchors[2].y - landmarks.anchors[1].y,
  );
  if (intercanthal < 1e-6) return 1.0;
  return alarWidth / intercanthal;
}

/**
 * Distancia intercantal (lm133 ↔ lm362) como escala ósea de referencia.
 * Esta medida es invariante al encuadre de la foto — no cambia si el paciente
 * tiene mucho cabello, sombrero, o si la cámara captó más cuello.
 * Fallback a longitud nasal cuando no hay ojos visibles en la imagen.
 */
export function computeAnatomicalReference(landmarks: NoseLandmarks): number {
  if (!landmarks.anchors || landmarks.anchors.length < 3) {
    return Math.hypot(
      landmarks.tip.x - landmarks.bridge.x,
      landmarks.tip.y - landmarks.bridge.y,
    );
  }
  const intercanthal = Math.hypot(
    landmarks.anchors[2].x - landmarks.anchors[1].x,
    landmarks.anchors[2].y - landmarks.anchors[1].y,
  );
  if (intercanthal < 10) {
    return Math.hypot(
      landmarks.tip.x - landmarks.bridge.x,
      landmarks.tip.y - landmarks.bridge.y,
    );
  }
  return intercanthal;
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
/** Magnitud máxima del desplazamiento columelar = 10% del largo nasal. */
const MAX_COLUMELLA_MOVE_RATIO = 0.10;

interface ColumellaResult {
  // Delta a aplicar directamente sobre finalBase (base = subnasal se mueve)
  baseDelta: Point;
  // Ghost secundario al 20% base→tip para falloff suave en la columela media
  smoothSrc: Point;
  smoothDest: Point;
}

/**
 * Retracción columelar — mueve el punto subnasal (base) hacia el bridge.
 *
 * Dirección: base→bridge (hacia arriba en perfil). +100 retracta (sube el subnasal),
 * -100 proyecta (baja, mostrando más columela). El tip permanece anclado.
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

  // Dirección: base→bridge (arriba en perfil = retracción columelar).
  const bx = landmarks.bridge.x - landmarks.base.x;
  const by = landmarks.bridge.y - landmarks.base.y;
  const bridgeBaseDist = Math.hypot(bx, by);
  if (bridgeBaseDist < 1e-6) return null;
  const unitNx = bx / bridgeBaseDist;
  const unitNy = by / bridgeBaseDist;

  const magnitude = normalized * MAX_COLUMELLA_MOVE_RATIO * noseLen;

  // Ghost en la columela media para que la deformación decaiga suavemente
  const smoothT = 0.20;
  const smoothSrc: Point = {
    x: landmarks.base.x + dx * smoothT,
    y: landmarks.base.y + dy * smoothT,
  };

  return {
    baseDelta: { x: unitNx * magnitude, y: unitNy * magnitude },
    smoothSrc,
    smoothDest: {
      x: smoothSrc.x + unitNx * magnitude * 0.45,
      y: smoothSrc.y + unitNy * magnitude * 0.45,
    },
  };
}

export function constrainTipRotationToTarget(
  slider: number,
  landmarks: NoseLandmarks,
  _canon: NasalCanon,
  frame: NasalFrame,
  view: FaceView = 'perfil',
): TipRotationDestinations {
  const normalized = Math.max(-1, Math.min(1, slider / 100));
  const clinicalTheta = normalized * MAX_ROTATION_RAD;

  if (view === 'frontal') {
    // En frontal, "rotación de punta" se expresa como ACORTAMIENTO de la nariz:
    // la punta se desplaza hacia el bridge a lo largo del eje nasal.
    // En perfil, rotar la punta 15° produce un arco vertical de noseLen·sin(15°);
    // en frontal ese mismo movimiento se ve como un acortamiento equivalente.
    // +slider → punta sube (hacia bridge) → deltaAxial negativo.
    // FRONTAL_LIFT_AMPLIFY: en frontal el lift es intrínsecamente menos visible
    // que la rotación en perfil (el ojo capta peor un acortamiento que un arco).
    // Amplificamos 2.0× para que el lift sea claramente perceptible en frontal
    // sin tocar el rango clínico de rotación en perfil (15° sigue siendo el
    // techo allí). A slider=+100 con efecto=100: lift ≈ 52% del largo nasal.
    const FRONTAL_LIFT_AMPLIFY = 2.0;
    const noseLen = Math.hypot(
      landmarks.tip.x - landmarks.base.x,
      landmarks.tip.y - landmarks.base.y,
    );
    const deltaAxial =
      -noseLen * Math.sin(clinicalTheta) * FRONTAL_LIFT_AMPLIFY;
    const tipDest = applyNasalDelta(landmarks.tip, deltaAxial, 0, frame);
    // Supratip absorbe SUPRATIP_TRANSFER (35%) del lift — la transición
    // dorso↔punta se suaviza, evitando un "step" en el supratip break.
    const bridgeMidDest = applyNasalDelta(
      landmarks.bridgeMid,
      deltaAxial * SUPRATIP_TRANSFER,
      0,
      frame,
    );
    return { tipDest, bridgeMidDest };
  }

  // Perfil: rotación 2D clásica alrededor del subnasal.
  const sign = rotationSignForSuperiorTip(landmarks.tip, landmarks.base, frame);
  const screenTheta = sign * clinicalTheta;

  const tipDest = rotateTipAroundSubnasal(
    landmarks.tip,
    landmarks.base,
    screenTheta,
  );

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
  // Proyección pura: solo mover en X (horizontal), Y del tip permanece fijo.
  // Mover en el vector completo base→tip introduce tilt — la medición es solo horizontal.
  const noseLen = Math.hypot(
    landmarks.tip.x - landmarks.bridge.x,
    landmarks.tip.y - landmarks.bridge.y,
  );
  const maxDelta = noseLen * MAX_PROJECTION_DELTA_RATIO;
  const sign = landmarks.tip.x < landmarks.base.x ? -1 : 1;
  const rawDeltaX = sign * (target - current) * noseLen;
  const clampedDeltaX = Math.max(-maxDelta, Math.min(maxDelta, rawDeltaX));
  const tipDest: Point = {
    x: landmarks.tip.x + clampedDeltaX,
    y: landmarks.tip.y,
  };
  return {
    vectorDelta: { x: clampedDeltaX, y: 0 },
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
  nostrilXOffset: number = 0,
  bridgeMidYOffset: number = 0,
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
  // MLS opera sobre la imagen original: qx/qy SIEMPRE deben ser posiciones
  // anatómicas originales (donde el píxel realmente existe en la foto). Solo
  // px/py reflejan el destino combinado de todos los sliders activos.
  const halfWidth_orig =
    Math.abs(landmarks.nostrilL.x - landmarks.nostrilR.x) * 0.30;
  const halfWidth_def = Math.abs(
    (landmarks.nostrilR.x - nostrilXOffset) - (landmarks.nostrilL.x + nostrilXOffset)
  ) * 0.30;
  const ghostY_orig = landmarks.bridgeMid.y;
  const ghostY_def = landmarks.bridgeMid.y + bridgeMidYOffset;
  return {
    bridgeDest: {
      x: midX + (landmarks.bridge.x - midX) * factor,
      y: landmarks.bridge.y,
    },
    bridgeMidDest: {
      x: midX + (landmarks.bridgeMid.x - midX) * factor,
      y: landmarks.bridgeMid.y,
    },
    lateralLeftSrc: { x: midX - halfWidth_orig, y: ghostY_orig },
    lateralLeftDest: { x: midX - halfWidth_def * factor, y: ghostY_def },
    lateralRightSrc: { x: midX + halfWidth_orig, y: ghostY_orig },
    lateralRightDest: { x: midX + halfWidth_def * factor, y: ghostY_def },
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

// ─── Cierre alar (medialización del cuerpo del ala) ─────────────────────────
// Diferencia clínica vs. Resección alar: ésta última remueve tejido en la base
// alar (Weir excision), moviendo lm[102]/lm[331]. Cierre alar medializa el
// CUERPO del ala (sutura cinch) sin mover la base. Visualmente: la curva
// externa del ala se vuelve más recta, la base queda donde estaba.

interface CierreAlarDestinations {
  domeLeftSrc: Point;
  domeLeftDest: Point;
  domeRightSrc: Point;
  domeRightDest: Point;
}

function constrainCierreAlarToTarget(
  slider: number,
  landmarks: NoseLandmarks,
  canon: NasalCanon,
  tipYOffset: number = 0,
  nostrilXOffset: number = 0,
): CierreAlarDestinations {
  const current = measureAlarIntercanthalRatio(landmarks);
  const target = interpolateTarget(
    slider,
    current,
    canon.alarIntercanthalRatio,
    ANTI_CANON_MULTIPLIER.alarIntercanthalRatio,
  );
  const factor = current < 1e-6 ? 1 : target / current;
  const midX = landmarks.base.x;
  // MLS opera sobre la imagen original: qx/qy = posiciones anatómicas originales;
  // px/py = destino combinado de todos los sliders activos.
  const alarHalfWidth_orig =
    Math.abs(landmarks.nostrilL.x - landmarks.nostrilR.x) / 2;
  const alarHalfWidth_def = Math.abs(
    (landmarks.nostrilR.x - nostrilXOffset) - (landmarks.nostrilL.x + nostrilXOffset)
  ) / 2;
  const domeOffset_orig = alarHalfWidth_orig * 0.80;
  const domeOffset_def = alarHalfWidth_def * 0.80;
  const tipY_orig = landmarks.tip.y;
  const tipY_def = landmarks.tip.y + tipYOffset;
  const domeY_orig = tipY_orig + (landmarks.nostrilL.y - tipY_orig) * 0.35;
  const domeY_def = tipY_def + (landmarks.nostrilL.y - tipY_def) * 0.35;
  return {
    domeLeftSrc:  { x: midX - domeOffset_orig, y: domeY_orig },
    domeLeftDest: { x: midX - domeOffset_def * factor, y: domeY_def },
    domeRightSrc:  { x: midX + domeOffset_orig, y: domeY_orig },
    domeRightDest: { x: midX + domeOffset_def * factor, y: domeY_def },
  };
}

interface TipNarrowDestinations {
  tipDest: Point;
  lobuleLeftSrc: Point;
  lobuleLeftDest: Point;
  lobuleRightSrc: Point;
  lobuleRightDest: Point;
  // Dome ghosts en la zona supratip-tip: estrechan el VOLUMEN cartilaginoso
  // (cúpulas de los cartílagos laterales inferiores), no solo el ápex.
  // Sin éstos la punta apex se afina pero la zona arriba sigue viéndose
  // bulbosa — feedback clínico 2026-05-27.
  domeLeftSrc: Point;
  domeLeftDest: Point;
  domeRightSrc: Point;
  domeRightDest: Point;
  // Lateral crus ghosts: pared lateral cartilaginosa, entre la punta y las
  // narinas. Cubre el "gap" entre dome y nostril pivot — la zona que el
  // cirujano marca como "demasiado ancha" en frontal. Anatómicamente
  // corresponde al cuerpo del cartílago lateral inferior.
  crusLeftSrc: Point;
  crusLeftDest: Point;
  crusRightSrc: Point;
  crusRightDest: Point;
  // Supratip narrow ghosts: estrechan el ancho del supratip (justo encima del
  // tip, a nivel de bridgeMid en Y). Extiende la cadena de narrowing del tip
  // verticalmente hacia el dorso medio — la zona que el ojo percibe como
  // "ancha encima de la punta" en frontal.
  supratipLeftSrc: Point;
  supratipLeftDest: Point;
  supratipRightSrc: Point;
  supratipRightDest: Point;
}

function constrainTipNarrowToTarget(
  slider: number,
  landmarks: NoseLandmarks,
  canon: NasalCanon,
  tipYOffset: number = 0,
  bridgeMidYOffset: number = 0,
  nostrilXOffset: number = 0,
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
  // MLS opera sobre la imagen original: qx/qy = posiciones anatómicas en la foto
  // (sin offsets), px/py = destino combinado de todos los sliders. Con esto los
  // ghosts refuerzan el efecto de Reducción/Rotación/Giba en vez de pelearlo.
  const halfTipWidth_orig =
    Math.abs(landmarks.nostrilL.x - landmarks.nostrilR.x) * 0.25;
  const halfTipWidth_def = Math.abs(
    (landmarks.nostrilR.x - nostrilXOffset) - (landmarks.nostrilL.x + nostrilXOffset)
  ) * 0.25;
  const tipY_orig = landmarks.tip.y;
  const tipY_def = landmarks.tip.y + tipYOffset;
  const bridgeMidY_orig = landmarks.bridgeMid.y;
  const bridgeMidY_def = landmarks.bridgeMid.y + bridgeMidYOffset;
  // Dome: 35% tip→bridgeMid
  const domeY_orig = tipY_orig + (bridgeMidY_orig - tipY_orig) * 0.35;
  const domeY_def = tipY_def + (bridgeMidY_def - tipY_def) * 0.35;
  const halfDomeWidth_orig = halfTipWidth_orig * 0.85;
  const halfDomeWidth_def = halfTipWidth_def * 0.85;
  // Lateral crus: 35% tip→nostril (nostril Y no se mueve significativamente)
  const nostrilY = (landmarks.nostrilL.y + landmarks.nostrilR.y) / 2;
  const crusY_orig = tipY_orig + (nostrilY - tipY_orig) * 0.35;
  const crusY_def = tipY_def + (nostrilY - tipY_def) * 0.35;
  const halfCrusWidth_orig = halfTipWidth_orig * 1.35;
  const halfCrusWidth_def = halfTipWidth_def * 1.35;
  // Supratip narrow: nivel bridgeMid
  const halfSupratipWidth_orig = halfTipWidth_orig * 0.95;
  const halfSupratipWidth_def = halfTipWidth_def * 0.95;
  return {
    tipDest: {
      x: midX + (landmarks.tip.x - midX) * factor,
      y: landmarks.tip.y,
    },
    lobuleLeftSrc: { x: midX - halfTipWidth_orig, y: tipY_orig },
    lobuleLeftDest: { x: midX - halfTipWidth_def * factor, y: tipY_def },
    lobuleRightSrc: { x: midX + halfTipWidth_orig, y: tipY_orig },
    lobuleRightDest: { x: midX + halfTipWidth_def * factor, y: tipY_def },
    domeLeftSrc: { x: midX - halfDomeWidth_orig, y: domeY_orig },
    domeLeftDest: { x: midX - halfDomeWidth_def * factor, y: domeY_def },
    domeRightSrc: { x: midX + halfDomeWidth_orig, y: domeY_orig },
    domeRightDest: { x: midX + halfDomeWidth_def * factor, y: domeY_def },
    crusLeftSrc: { x: midX - halfCrusWidth_orig, y: crusY_orig },
    crusLeftDest: { x: midX - halfCrusWidth_def * factor, y: crusY_def },
    crusRightSrc: { x: midX + halfCrusWidth_orig, y: crusY_orig },
    crusRightDest: { x: midX + halfCrusWidth_def * factor, y: crusY_def },
    supratipLeftSrc: { x: midX - halfSupratipWidth_orig, y: bridgeMidY_orig },
    supratipLeftDest: { x: midX - halfSupratipWidth_def * factor, y: bridgeMidY_def },
    supratipRightSrc: { x: midX + halfSupratipWidth_orig, y: bridgeMidY_orig },
    supratipRightDest: { x: midX + halfSupratipWidth_def * factor, y: bridgeMidY_def },
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

  // ─── Escala anatómica + frame nasal + clasificación de vista ─────────────
  const intercanthal = computeAnatomicalReference(landmarks);
  const noseFrame = buildNasalFrame(landmarks.bridge, landmarks.base);
  const view = classifyFaceView(landmarks);

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
  const cierre = s("cierre-alar");
  const refinamiento = s("refinamiento-punta");

  // Destinos acumulativos
  let finalRadix: Point = { ...landmarks.bridge };
  let finalBridgeMid: Point = { ...landmarks.bridgeMid };
  const finalRhinion: Point = { ...landmarks.rhinion };
  let finalTip: Point = { ...landmarks.tip };
  let extraNostrilL: Point = { x: 0, y: 0 };
  let extraNostrilR: Point = { x: 0, y: 0 };

  let bridgeGhosts: BridgeNarrowDestinations | null = null;
  let tipGhosts: TipNarrowDestinations | null = null;
  let cierreAlarGhosts: CierreAlarDestinations | null = null;
  let gibaApexSrc: Point | null = null;
  let gibaApexDest: Point | null = null;
  // Delta NORMAL puro de giba sobre el ápex (independiente del resto de sliders).
  // Lo usa la cadena supraradix para extender la curvatura hacia glabella sin
  // arrastrar proy/rot/reducción al dorso óseo.
  let gibaSpecificApexDelta: Point = { x: 0, y: 0 };
  let projectionBaseDeltaX = 0;   // fracción del delta de proyección que absorbe el subnasal
  let columellaGhost: ColumellaResult | null = null;
  // Contribuciones de Refinamiento al tip (X only, narrowing horizontal).
  // Se EXCLUYE de: alar-transfer (las alas no deben rebotar) Y subtip
  // (la columela no debe seguir hacia adentro). Clínicamente Refinamiento
  // actúa sobre las cúpulas cartilaginosas del ápex; el subnasal/columela
  // mantienen su ancho original.
  let refinamientoTipDeltaX = 0;
  // Contribuciones de Reducción al tip (toda la nariz se encoge).
  // Se EXCLUYE de alar-transfer (extraNostrilL/R ya lleva su parte) pero
  // SÍ se aplica al subtip — la columela debe achicarse con el resto.
  let reduccionTipDeltaX = 0;
  let reduccionTipDeltaY = 0;

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
    // Solo capturamos src del ápex y su delta normal puro.
    // El rhinion y el dest combinado del ápex se calculan abajo, tras
    // acumular las contribuciones de TODOS los sliders del dorso.
    gibaApexSrc = g.gibaApexSrc;
    gibaSpecificApexDelta = {
      x: g.gibaApexDest.x - g.gibaApexSrc.x,
      y: g.gibaApexDest.y - g.gibaApexSrc.y,
    };
  }
  if (rot !== 0) {
    const r = constrainTipRotationToTarget(rot, landmarks, canon, noseFrame, view);
    finalTip.x += r.tipDest.x - landmarks.tip.x;
    finalTip.y += r.tipDest.y - landmarks.tip.y;
    finalBridgeMid.x += r.bridgeMidDest.x - landmarks.bridgeMid.x;
    finalBridgeMid.y += r.bridgeMidDest.y - landmarks.bridgeMid.y;
  }
  if (proy !== 0) {
    const p = constrainProjectionToTarget(proy, landmarks, canon);
    // Tip: 100% — punto más saliente
    finalTip.x += p.vectorDelta.x;
    finalTip.y += p.vectorDelta.y;
    // Supratip: 40% — la nariz se proyecta como unidad, no solo la punta
    finalBridgeMid.x += p.vectorDelta.x * 0.40;
    finalBridgeMid.y += p.vectorDelta.y * 0.40;
    // Base (subnasal): 35% — acompaña la proyección para resultado natural
    projectionBaseDeltaX = p.vectorDelta.x * 0.35;
  }

  // ─── FRONTAL — sliders de proporciones ───────────────────────────────────
  if (reduccion !== 0) {
    const u = constrainUniformShrinkToTarget(reduccion, landmarks, canon);
    finalRadix.x += u.bridgeDest.x - landmarks.bridge.x;
    finalRadix.y += u.bridgeDest.y - landmarks.bridge.y;
    finalBridgeMid.x += u.bridgeMidDest.x - landmarks.bridgeMid.x;
    finalBridgeMid.y += u.bridgeMidDest.y - landmarks.bridgeMid.y;
    const redTipDX = u.tipDest.x - landmarks.tip.x;
    const redTipDY = u.tipDest.y - landmarks.tip.y;
    finalTip.x += redTipDX;
    finalTip.y += redTipDY;
    reduccionTipDeltaX += redTipDX;
    reduccionTipDeltaY += redTipDY;
    extraNostrilL.x += u.nostrilLDest.x - landmarks.nostrilL.x;
    extraNostrilL.y += u.nostrilLDest.y - landmarks.nostrilL.y;
    extraNostrilR.x += u.nostrilRDest.x - landmarks.nostrilR.x;
    extraNostrilR.y += u.nostrilRDest.y - landmarks.nostrilR.y;
  }
  if (adelgazar !== 0) {
    const b = constrainBridgeNarrowToTarget(
      adelgazar, landmarks, canon,
      extraNostrilL.x,
      finalBridgeMid.y - landmarks.bridgeMid.y,
    );
    finalRadix.x += b.bridgeDest.x - landmarks.bridge.x;
    finalBridgeMid.x += b.bridgeMidDest.x - landmarks.bridgeMid.x;
    bridgeGhosts = b;
  }
  if (cierre !== 0) {
    cierreAlarGhosts = constrainCierreAlarToTarget(
      cierre, landmarks, canon,
      finalTip.y - landmarks.tip.y,
      extraNostrilL.x,
    );
  }
  if (reseccion !== 0) {
    const a = constrainAlarNarrowToTarget(reseccion, landmarks, canon);
    extraNostrilL.x += a.nostrilLDest.x - landmarks.nostrilL.x;
    extraNostrilR.x += a.nostrilRDest.x - landmarks.nostrilR.x;
  }
  if (refinamiento !== 0) {
    const t = constrainTipNarrowToTarget(
      refinamiento, landmarks, canon,
      finalTip.y - landmarks.tip.y,
      finalBridgeMid.y - landmarks.bridgeMid.y,
      extraNostrilL.x,
    );
    const refTipDX = t.tipDest.x - landmarks.tip.x;
    finalTip.x += refTipDX;
    refinamientoTipDeltaX += refTipDX;
    tipGhosts = t;
  }

  // ─── PROPAGACIÓN COMBINADA AL DORSO (auxiliares siguen al supratip) ───────
  // finalBridgeMid ya acumuló las contribuciones de los 5 sliders del dorso.
  // Los control points auxiliares (rhinion, ápex sintético) deben seguir ese
  // delta combinado para que no se "peleen" cuando el cirujano mezcla sliders.
  const supratipDeltaX = finalBridgeMid.x - landmarks.bridgeMid.x;
  const supratipDeltaY = finalBridgeMid.y - landmarks.bridgeMid.y;
  const hasSupratipMovement =
    Math.abs(supratipDeltaX) > MOVE_EPSILON_PX ||
    Math.abs(supratipDeltaY) > MOVE_EPSILON_PX;

  // Rhinion (K-area): pivote suave del dorso, sigue al supratip al 50% siempre.
  // Antes solo seguía durante Giba — eso rompía la curva del dorso en
  // Proyección/Rotación/Reducción/Adelgazar puros.
  finalRhinion.x = landmarks.rhinion.x + supratipDeltaX * 0.5;
  finalRhinion.y = landmarks.rhinion.y + supratipDeltaY * 0.5;

  // gibaApex (55% bridge→supratip): siempre se inyecta cuando hay movimiento
  // en el dorso, no solo cuando Giba está activa. Su destino combina:
  //   - el delta total del supratip (todos los sliders del dorso)
  //   - el "extra" giba-específico (el 35% del normal-delta que el ápex
  //     absorbe por encima del supratip durante Giba pura)
  if (hasSupratipMovement || gibaApexSrc) {
    if (!gibaApexSrc) {
      gibaApexSrc = {
        x: landmarks.bridge.x + 0.55 * (landmarks.bridgeMid.x - landmarks.bridge.x),
        y: landmarks.bridge.y + 0.55 * (landmarks.bridgeMid.y - landmarks.bridge.y),
      };
    }
    gibaApexDest = {
      x: gibaApexSrc.x + supratipDeltaX + gibaSpecificApexDelta.x * 0.35,
      y: gibaApexSrc.y + supratipDeltaY + gibaSpecificApexDelta.y * 0.35,
    };
  }

  // ─── ALAR TRANSFER (acoplamiento físico tip → alas) ──────────────────────
  // Las alas absorben una fracción del movimiento del tip para evitar el
  // "rubber band" — pero SOLO de sliders rigid-body (Rotación, Proyección,
  // Giba). Refinamiento y Reducción ya mueven las alas directamente vía
  // extraNostrilL/R; incluir su contribución aquí causaría doble-propagación.
  const tipDeltaX = finalTip.x - landmarks.tip.x;
  const tipDeltaY = finalTip.y - landmarks.tip.y;
  const tipRigidDeltaX = tipDeltaX - refinamientoTipDeltaX - reduccionTipDeltaX;
  const tipRigidDeltaY = tipDeltaY - reduccionTipDeltaY;
  const noseLenPx = Math.hypot(
    landmarks.tip.x - landmarks.base.x,
    landmarks.tip.y - landmarks.base.y,
  );
  const maxAlarOffset = noseLenPx * 0.10;
  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));
  const alarOffset = {
    x: clamp(tipRigidDeltaX * ALAR_TRANSFER, -maxAlarOffset, maxAlarOffset),
    y: clamp(tipRigidDeltaY * ALAR_TRANSFER, -maxAlarOffset, maxAlarOffset),
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
    x: landmarks.base.x + alarOffset.x + (columellaGhost?.baseDelta.x ?? 0) + projectionBaseDeltaX,
    y: landmarks.base.y + alarOffset.y + (columellaGhost?.baseDelta.y ?? 0),
  };

  // Sub-tip / break columelar: se posiciona linealmente entre finalBase y
  // finalTip al 35%. Esto preserva la geometría infratip (lóbulo cartilaginoso
  // bajo el tip) sin importar qué slider esté activo.
  // Importante: el subtip NO sigue a Refinamiento. Clínicamente, refinar la
  // punta afecta las cúpulas cartilaginosas del ápex; la columela/subnasal
  // mantienen su ancho original. Si dejáramos que el subtip siguiera a
  // finalTip cuando solo Refinamiento está activo, la zona columelar se
  // "pincharía" hacia adentro (bug reportado por cirujano 2026-05-27).
  const SUBTIP_BLEND = 0.35;
  const tipForSubtipX = finalTip.x - refinamientoTipDeltaX;
  const finalSubtip: Point = {
    x: finalBase.x + (tipForSubtipX - finalBase.x) * SUBTIP_BLEND,
    y: finalBase.y + (finalTip.y - finalBase.y) * SUBTIP_BLEND,
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

  // Rhinion (K-area, transición hueso↔cartílago): pivote del dorso.
  // Sin movimiento durante Proyección/Refinamiento; sigue al supratip durante Giba.
  points.push({
    px: finalRhinion.x,
    py: finalRhinion.y,
    qx: landmarks.rhinion.x,
    qy: landmarks.rhinion.y,
    w: SURGICAL_MASS.rhinionPivot,
  });

  // Sub-tip / break columelar (35% base→tip): control point cartilaginoso.
  // Reemplaza los antiguos ghosts virtuales de sub-tip + columela. Su posición
  // se actualiza con cada cambio de finalTip/finalBase para mantener la
  // geometría infratip y evitar discontinuidades MLS en la zona blanda.
  points.push({
    px: finalSubtip.x,
    py: finalSubtip.y,
    qx: landmarks.subtip.x,
    qy: landmarks.subtip.y,
    w: SURGICAL_MASS.activeTip,
  });

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

    // Supraradix: extiende el efecto de GIBA al área entre radix y glabela.
    // Cadena de gradiente: glabella(ancla) → supra2(30%) → supra1(55%) → gibaApex(100%).
    // Importante: usa el delta giba-específico (no el combinado del ápex), porque
    // proyección/rotación/reducción NO deben propagarse al dorso óseo superior —
    // ese hueso queda fijo durante esos sliders.
    const apexDX = gibaSpecificApexDelta.x;
    const apexDY = gibaSpecificApexDelta.y;
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
    // Nota: el sub-tip cartilaginoso ya se inyecta arriba como landmark real
    // (no como ghost). La columela de proyección también queda absorbida por
    // ese control point + el finalBase con projectionBaseDeltaX.
  }

  // Retracción columelar: la base (subnasal) se mueve vía finalBase.
  // El tip permanece anclado. Ghost suave en la columela media para falloff natural.
  if (columellaGhost) {
    // Tip anclado: la punta no se mueve mientras retrae la base
    points.push({
      px: finalTip.x,
      py: finalTip.y,
      qx: finalTip.x,
      qy: finalTip.y,
      w: SURGICAL_MASS.anchor,
    });
    // Ghost al 20% base→tip: falloff suave (45% del delta de la base)
    points.push({
      px: columellaGhost.smoothDest.x,
      py: columellaGhost.smoothDest.y,
      qx: columellaGhost.smoothSrc.x,
      qy: columellaGhost.smoothSrc.y,
      w: SURGICAL_MASS.activeTip,
    });
  }

  // Fantasmas de osteotomía lateral.
  // Mismo fade-in que los ghosts del tip: sin rampa, los 2 ghosts laterales
  // con w=20 aparecen de golpe al pasar de 0 a ±1, reconfigurando el campo
  // MLS en la zona del puente y produciendo un snap visual desproporcionado
  // al desplazamiento físico (que a ±1 es de fracción de píxel).
  if (bridgeGhosts) {
    // Ventana de fade de 25 (más amplia que los otros sliders con window=15):
    // los bridge ghosts producen un snap residual aún con peso bajo porque el
    // área del puente tiene pocos control points circundantes, por lo que
    // su sola aparición reconfigura más localmente el campo MLS. Window=25
    // hace que el peso crezca más despacio en valores pequeños.
    const adelgazarFade = Math.min(1, Math.abs(adelgazar) / 25);
    const adelgazarGhostW = SURGICAL_MASS.activeDorsum * adelgazarFade;
    points.push({
      px: bridgeGhosts.lateralLeftDest.x,
      py: bridgeGhosts.lateralLeftDest.y,
      qx: bridgeGhosts.lateralLeftSrc.x,
      qy: bridgeGhosts.lateralLeftSrc.y,
      w: adelgazarGhostW,
    });
    points.push({
      px: bridgeGhosts.lateralRightDest.x,
      py: bridgeGhosts.lateralRightDest.y,
      qx: bridgeGhosts.lateralRightSrc.x,
      qy: bridgeGhosts.lateralRightSrc.y,
      w: adelgazarGhostW,
    });
  }

  // Cierre alar (medialización del cuerpo del ala). Dos ghosts a la altura
  // media entre tip y nostril, en la curva externa del ala. Peso bajo
  // (pivot=4) porque es soft-tissue; rampa de 15 puntos como los otros
  // ghosts condicionales para evitar snap al cruzar 0.
  if (cierreAlarGhosts) {
    const cierreFade = Math.min(1, Math.abs(cierre) / 15);
    const cierreGhostW = SURGICAL_MASS.pivot * cierreFade;
    points.push({
      px: cierreAlarGhosts.domeLeftDest.x,
      py: cierreAlarGhosts.domeLeftDest.y,
      qx: cierreAlarGhosts.domeLeftSrc.x,
      qy: cierreAlarGhosts.domeLeftSrc.y,
      w: cierreGhostW,
    });
    points.push({
      px: cierreAlarGhosts.domeRightDest.x,
      py: cierreAlarGhosts.domeRightDest.y,
      qx: cierreAlarGhosts.domeRightSrc.x,
      qy: cierreAlarGhosts.domeRightSrc.y,
      w: cierreGhostW,
    });
  }

  // Fantasmas de refinamiento de punta.
  // El peso de cada ghost se rampa con la magnitud del slider para evitar el
  // "snap" cuando el slider pasa de 0 a ±1: sin el ramp, 6 control points con
  // w=20 aparecen de golpe en el campo MLS, reconfigurando localmente la
  // deformación aunque su desplazamiento físico sea de fracción de píxel.
  // Con ramp lineal en |slider|∈[0,15], la transición es continua.
  if (tipGhosts) {
    const refFade = Math.min(1, Math.abs(refinamiento) / 15);
    const refGhostW = SURGICAL_MASS.activeTip * refFade;
    // Lobule: ápex de la punta (estrecha el punto más prominente)
    points.push({
      px: tipGhosts.lobuleLeftDest.x,
      py: tipGhosts.lobuleLeftDest.y,
      qx: tipGhosts.lobuleLeftSrc.x,
      qy: tipGhosts.lobuleLeftSrc.y,
      w: refGhostW,
    });
    points.push({
      px: tipGhosts.lobuleRightDest.x,
      py: tipGhosts.lobuleRightDest.y,
      qx: tipGhosts.lobuleRightSrc.x,
      qy: tipGhosts.lobuleRightSrc.y,
      w: refGhostW,
    });
    // Dome: cúpulas de los cartílagos laterales inferiores (35% tip→supratip).
    // Estrechan el VOLUMEN cartilaginoso de la punta, no solo el ápex puntual.
    points.push({
      px: tipGhosts.domeLeftDest.x,
      py: tipGhosts.domeLeftDest.y,
      qx: tipGhosts.domeLeftSrc.x,
      qy: tipGhosts.domeLeftSrc.y,
      w: refGhostW,
    });
    points.push({
      px: tipGhosts.domeRightDest.x,
      py: tipGhosts.domeRightDest.y,
      qx: tipGhosts.domeRightSrc.x,
      qy: tipGhosts.domeRightSrc.y,
      w: refGhostW,
    });
    // Crus lateral: pared lateral cartilaginosa entre punta y narinas (35%
    // tip→nostril). Cierra la silueta que el cirujano marca como bulbosa.
    points.push({
      px: tipGhosts.crusLeftDest.x,
      py: tipGhosts.crusLeftDest.y,
      qx: tipGhosts.crusLeftSrc.x,
      qy: tipGhosts.crusLeftSrc.y,
      w: refGhostW,
    });
    points.push({
      px: tipGhosts.crusRightDest.x,
      py: tipGhosts.crusRightDest.y,
      qx: tipGhosts.crusRightSrc.x,
      qy: tipGhosts.crusRightSrc.y,
      w: refGhostW,
    });
    // Supratip narrow: nivel de bridgeMid, estrecha la zona "ancha encima
    // de la punta". Cierra la cadena vertical de narrowing del Refinamiento:
    // supratip → dome → lobule → crus.
    points.push({
      px: tipGhosts.supratipLeftDest.x,
      py: tipGhosts.supratipLeftDest.y,
      qx: tipGhosts.supratipLeftSrc.x,
      qy: tipGhosts.supratipLeftSrc.y,
      w: refGhostW,
    });
    points.push({
      px: tipGhosts.supratipRightDest.x,
      py: tipGhosts.supratipRightDest.y,
      qx: tipGhosts.supratipRightSrc.x,
      qy: tipGhosts.supratipRightSrc.y,
      w: refGhostW,
    });
  }

  // ─── GHOST ANCHORS — Frontera de tensión cero ────────────────────────────
  // Radio adaptativo: justo fuera de la pirámide nasal activa, bien dentro
  // del anillo de anchors faciales (ojos, mejillas, philtrum).
  // Crea un "muro de concreto" continuo entre la nariz y el resto de la cara.
  const nosePts = [
    landmarks.bridge, landmarks.bridgeMid, landmarks.tip,
    landmarks.nostrilL, landmarks.nostrilR, landmarks.base,
  ];
  const noseMidX = nosePts.reduce((s, p) => s + p.x, 0) / nosePts.length;
  const noseMidY = nosePts.reduce((s, p) => s + p.y, 0) / nosePts.length;
  const maxNoseRadius = Math.max(...nosePts.map(p =>
    Math.hypot(p.x - noseMidX, p.y - noseMidY),
  ));
  // Anillo de tensión: 1.5× intercanthal fuera del borde nasal.
  // A esta distancia el ghost (w=4) no puede competir con el tip activo (w=20)
  // cerca del tip — permite que la deformación se propague naturalmente.
  const tensionRadius = maxNoseRadius + intercanthal * 1.5;

  const N_GHOST = 8;
  for (let i = 0; i < N_GHOST; i++) {
    const angle = (i / N_GHOST) * Math.PI * 2;
    const gx = noseMidX + Math.cos(angle) * tensionRadius;
    const gy = noseMidY + Math.sin(angle) * tensionRadius;
    if (gx >= 0 && gx < canvasW && gy >= 0 && gy < canvasH) {
      points.push({ px: gx, py: gy, qx: gx, qy: gy, w: 4.0 });
    }
  }

  const noseBbox = computeNoseBbox(landmarks, canvasW, canvasH);
  const anatomicalBlendZone = Math.max(20, Math.round(intercanthal * 0.25));
  return { points, noseBbox: { ...noseBbox, blendZone: anatomicalBlendZone } };
}

// Backward-compat: tests anteriores importan constrainProfileTipRotation con
// signature (slider, landmarks, maxAngleRad). Lo mantenemos como wrapper que
// emula la firma vieja para no romper los tests del régimen anterior.
export function constrainProfileTipRotation(
  sliderValue: number,
  landmarks: NoseLandmarks,
  _maxAngleRad: number,
): TipRotationDestinations {
  const frame = buildNasalFrame(landmarks.bridge, landmarks.base);
  return constrainTipRotationToTarget(
    sliderValue,
    landmarks,
    getCanonForGender("F"),
    frame,
  );
}
