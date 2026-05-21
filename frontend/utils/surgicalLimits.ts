import {
  getNasalDorsumAxis,
  getNasolabialAngle,
  rotateTipAroundSubnasal,
  computeNoseBbox,
  getFaceOrientationAngle,
} from "./cephalometry";
import type { ControlPoint, NoseBbox } from "@/lib/canvas/types";
import type { NoseLandmarks } from "@/lib/canvas/useFaceLandmarks";

interface Point {
  x: number;
  y: number;
}

const LIMITS = {
  nasolabialMin: 85,
  nasolabialMax: 115,
  projectionMin: 0.85,
  projectionMax: 1.15,
};

const DEFAULT_K = 0.45;
const ROT_TARGET_RATIO = 0.016;
const ROT_MAX_ANGLE_RAD = Math.PI / 18;
const ROT_TANH_DIVISOR = 7;
const SUPRAPTIP_TRANSFER = 0.35;
const ALAR_TRANSFER = 0.28;
const MOVE_EPSILON_PX = 0.1;

const SURGICAL_MASS = {
  anchor: 1.0,
  pivot: 4.0,
  activeDorsum: 6.5,
  activeTip: 8.0,
};

// ─── NUEVO: DETECCIÓN DE POSE AUTOMÁTICA ──────────────────────────────

/**
 * Analiza los landmarks de MediaPipe para determinar si la foto es Frontal o de Perfil.
 */
function detectPose(landmarks: NoseLandmarks): "frontal" | "profile" {
  const alarWidthX = Math.abs(landmarks.nostrilR.x - landmarks.nostrilL.x);
  const alarHeightY = Math.abs(landmarks.nostrilR.y - landmarks.nostrilL.y);

  // Distancia real entre alas
  const alarDistance = Math.sqrt(
    alarWidthX * alarWidthX + alarHeightY * alarHeightY,
  );

  // Longitud de la nariz (Base a Radix)
  const noseLength = Math.abs(landmarks.bridge.y - landmarks.base.y);

  // Si la distancia entre las alas es mayor al 45% de la longitud de la nariz, es frontal.
  // En una foto de perfil, un ala tapa a la otra y la distancia es menor.
  if (alarDistance > noseLength * 0.45) {
    return "frontal";
  }
  return "profile";
}

// ─── REGLAS FRONTALES (Osteotomía y Acortamiento) ───────────────────

function constrainFrontalGiba(
  sliderValue: number,
  landmarks: NoseLandmarks,
  K: number,
) {
  // Giba Frontal = Afinamiento lateral (Ostetomía)
  const isNarrowing = sliderValue < 0;
  const mag = Math.abs(sliderValue) * K * 0.3; // Factor de afinamiento más sutil

  // Encontramos el centro exacto del puente
  const centerX = (landmarks.nostrilL.x + landmarks.nostrilR.x) / 2;

  // Si reduce giba, empujamos los píxeles del dorso hacia el centro (afinar).
  // Si aumenta giba, los empujamos hacia afuera (ensanchar).
  const dir = isNarrowing ? 1 : -1;

  // Calculamos la dirección de compresión para el puente medio (simulando que está al centro)
  const currentDx = landmarks.bridgeMid.x - centerX;
  const compressionVector =
    currentDx !== 0 ? (currentDx / Math.abs(currentDx)) * -dir : 0;

  return {
    radixDest: { x: landmarks.bridge.x, y: landmarks.bridge.y }, // Radix no se mueve de frente
    bridgeMidDest: {
      x: landmarks.bridgeMid.x + compressionVector * mag,
      y: landmarks.bridgeMid.y, // Altura Y se mantiene en vista frontal
    },
  };
}

function constrainFrontalTipRotation(
  sliderValue: number,
  landmarks: NoseLandmarks,
  _maxAngleRad: number,
) {
  // Rotación Frontal = Levantamiento vertical puro (Acortamiento de columela)
  // Magnitud proporcional al tamaño nasal real (no a maxAngleRad × 200, que
  // producía ~35 px y deformaba todo el rostro vía MLS).
  const noseLen = Math.hypot(
    landmarks.tip.x - landmarks.base.x,
    landmarks.tip.y - landmarks.base.y,
  );
  // 0.15 (antes 0.08, demasiado tibio) → ~12-18 px en una nariz típica
  const deltaY = (sliderValue / 15) * (noseLen * 0.15);

  return {
    tipDest: {
      x: landmarks.tip.x,
      y: landmarks.tip.y - deltaY,
    },
    bridgeMidDest: {
      x: landmarks.bridgeMid.x,
      y: landmarks.bridgeMid.y - deltaY * SUPRAPTIP_TRANSFER,
    },
  };
}

function constrainFrontalProjection(
  sliderValue: number,
  landmarks: NoseLandmarks,
) {
  // Proyección Frontal = Estrechamiento de la punta y alas (Tip refinement)
  const mag = (sliderValue / 40) * 8; // Píxeles de compresión lateral

  const centerX = (landmarks.nostrilL.x + landmarks.nostrilR.x) / 2;
  const currentDx = landmarks.tip.x - centerX;
  const compressionVector =
    currentDx !== 0
      ? (currentDx / Math.abs(currentDx)) * (sliderValue < 0 ? -1 : 1)
      : 0;

  return {
    x: landmarks.tip.x + compressionVector * mag,
    y: landmarks.tip.y,
  };
}

// ─── REGLAS DE PERFIL (Cefalometría Estricta) ───────────────────────

function constrainProfileGiba(
  sliderValue: number,
  landmarks: NoseLandmarks,
  K: number,
  headAngle: number,
) {
  const { normal } = getNasalDorsumAxis(
    landmarks.bridge,
    landmarks.tip,
    headAngle,
  );
  const Keff = sliderValue > 0 ? K * 0.5 : K;
  // Clamp clínico: la giba no puede mover el radix más del 25% del largo
  // nasal — más allá deforma todo el rostro vía MLS (D8d).
  const noseLen = Math.hypot(
    landmarks.tip.x - landmarks.base.x,
    landmarks.tip.y - landmarks.base.y,
  );
  const maxMag = noseLen * 0.25;
  const rawMag = sliderValue * Keff;
  const mag = Math.max(-maxMag, Math.min(maxMag, rawMag));

  return {
    radixDest: {
      x: landmarks.bridge.x + normal.x * mag,
      y: landmarks.bridge.y + normal.y * mag,
    },
    bridgeMidDest: {
      x: landmarks.bridgeMid.x + normal.x * mag * 0.65,
      y: landmarks.bridgeMid.y + normal.y * mag * 0.65,
    },
  };
}

export function constrainProfileTipRotation(
  sliderValue: number,
  landmarks: NoseLandmarks,
  maxAngleRad: number,
) {
  const pronasal = landmarks.tip;
  const subnasal = landmarks.base;
  const bridgeMid = landmarks.bridgeMid;

  let deltaRad = Math.tanh(sliderValue / ROT_TANH_DIVISOR) * maxAngleRad;
  let tipCandidate = rotateTipAroundSubnasal(pronasal, subnasal, deltaRad);

  const angle = getNasolabialAngle(subnasal, tipCandidate);
  if (
    deltaRad !== 0 &&
    (angle < LIMITS.nasolabialMin || angle > LIMITS.nasolabialMax)
  ) {
    const currentAngle = getNasolabialAngle(subnasal, pronasal);
    const clampedAngle = Math.max(
      LIMITS.nasolabialMin,
      Math.min(LIMITS.nasolabialMax, angle),
    );
    deltaRad = (clampedAngle - currentAngle) * (Math.PI / 180);
    tipCandidate = rotateTipAroundSubnasal(pronasal, subnasal, deltaRad);
  }

  const bridgeMidDest = rotateTipAroundSubnasal(
    bridgeMid,
    subnasal,
    deltaRad * SUPRAPTIP_TRANSFER,
  );
  return { tipDest: tipCandidate, bridgeMidDest };
}

// ─── PRIMITIVAS FRONTALES EXPLÍCITAS ────────────────────────────────
// Estas funciones son llamadas por sliders dedicados con semántica clara:
//   reduccion-global → constrainUniformShrink
//   adelgazar-dorso  → constrainBridgeNarrow
//   reseccion-alar   → constrainAlarNarrow
// A diferencia de constrainFrontal* (que reinterpretan los sliders de perfil),
// estas operaciones devuelven deltas explícitos que el builder compone.

/**
 * Reducción global: escala uniforme de la nariz hacia su centro geométrico.
 * Slider negativo achica; +0 no cambia nada. Mapeo: −30 → factor 0.85.
 */
function constrainUniformShrink(sliderValue: number, landmarks: NoseLandmarks) {
  const factor = 1 + sliderValue / 200;
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

/**
 * Adelgazar dorso (osteotomía lateral): comprime el dorso nasal hacia el eje
 * vertical del subnasal. En frontal el bridge ya está sobre el midX, así que
 * comprimirlo solo no produce delta visible — necesitamos **puntos fantasma
 * laterales** que sí tienen distancia al midX y representan las paredes del
 * hueso nasal. Slider negativo → más delgado. −20 → factor 0.8.
 */
function constrainBridgeNarrow(sliderValue: number, landmarks: NoseLandmarks) {
  const factor = 1 + sliderValue / 100;
  // Eje de simetría: subnasal (sí está en la línea media facial)
  const midX = landmarks.base.x;
  // 0.30 (antes 0.5) — proxy más estricto del ancho óseo del puente, no del
  // ancho alar completo. Evita que el fantasma cubra la zona ocular.
  const halfWidth = Math.abs(landmarks.nostrilL.x - landmarks.nostrilR.x) * 0.30;
  // Bajamos los fantasmas del Radix (cerca de las cejas) al Supratip — la
  // osteotomía debe actuar sobre el puente, no sobre los ojos.
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
    lateralLeftSrc:  { x: midX - halfWidth,          y: ghostY },
    lateralLeftDest: { x: midX - halfWidth * factor, y: ghostY },
    lateralRightSrc:  { x: midX + halfWidth,          y: ghostY },
    lateralRightDest: { x: midX + halfWidth * factor, y: ghostY },
  };
}

/**
 * Refinamiento de punta: afina el lóbulo nasal comprimiendo el tip y dos
 * puntos fantasma laterales (lóbulo izquierdo/derecho) hacia el eje del
 * subnasal. Solo válido en frontal/¾, no afecta el dorso.
 * Slider negativo → punta más delgada. −20 → factor 0.8.
 */
function constrainTipNarrow(sliderValue: number, landmarks: NoseLandmarks) {
  // Sensibilidad mitad de respuesta por unidad: slider=−20 → factor 0.9 (antes 0.8).
  const factor = 1 + sliderValue / 200;
  const midX = landmarks.base.x;
  // 0.25 (antes 0.35) — fantasma más pequeño, no invade la zona alar.
  const halfTipWidth = Math.abs(landmarks.nostrilL.x - landmarks.nostrilR.x) * 0.25;
  return {
    tipDest: {
      x: midX + (landmarks.tip.x - midX) * factor,
      y: landmarks.tip.y,
    },
    lobuleLeftSrc:  { x: midX - halfTipWidth,          y: landmarks.tip.y },
    lobuleLeftDest: { x: midX - halfTipWidth * factor, y: landmarks.tip.y },
    lobuleRightSrc:  { x: midX + halfTipWidth,          y: landmarks.tip.y },
    lobuleRightDest: { x: midX + halfTipWidth * factor, y: landmarks.tip.y },
  };
}

/**
 * Resección alar (Weir): mueve nostrilL/R hacia el eje del subnasal.
 * Slider negativo → alas más juntas. −20 → factor 0.8.
 */
function constrainAlarNarrow(sliderValue: number, landmarks: NoseLandmarks) {
  const factor = 1 + sliderValue / 100;
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

// ─── ACOPLAMIENTOS CLÍNICOS ENTRE SLIDERS ────────────────────────────
// En cirugía real ciertos cambios SIEMPRE se acompañan: reducir giba sin
// reorientar el supratip produce una "nariz operada-pero-fea". Esta función
// aplica las reglas mínimas para preservar la armonía estética.

export interface CouplingResult {
  values: Record<string, number>
  /** IDs de sliders cuyo valor fue ajustado automáticamente respecto al input. */
  autoAdjusted: string[]
}

export function applyClinicalCoupling(
  sliders: Record<string, number>,
): CouplingResult {
  const out: Record<string, number> = { ...sliders }
  const autoAdjusted: string[] = []

  // Regla 1: giba fuerte (≤ −20) requiere rotación cefálica ≥ +5 para
  // preservar el supratip break. Es el patrón "femenino refinado" clásico.
  const giba = out['giba-nasal'] ?? 0
  const rot = out['rotacion-punta'] ?? 0
  if (giba <= -20 && rot < 5) {
    out['rotacion-punta'] = 5
    autoAdjusted.push('rotacion-punta')
  }

  // Regla 2: resección alar ≥ |10| acompaña reducción leve de proyección
  // para mantener la armonía de la base. Aplica solo si el usuario no
  // estableció una proyección positiva explícita.
  const alar = out['reseccion-alar'] ?? 0
  const proy = out['proyeccion-punta'] ?? 0
  if (alar <= -10 && proy > -5) {
    out['proyeccion-punta'] = -5
    autoAdjusted.push('proyeccion-punta')
  }

  return { values: out, autoAdjusted }
}

function constrainProfileProjection(
  sliderValue: number,
  landmarks: NoseLandmarks,
  headAngle: number,
): Point {
  const pronasal = landmarks.tip;
  const subnasal = landmarks.base;

  const dx = pronasal.x - subnasal.x;
  const dy = pronasal.y - subnasal.y;

  const rawFactor =
    sliderValue > 0
      ? 1 + (sliderValue / 40) * (LIMITS.projectionMax - 1)
      : 1 + (sliderValue / 20) * (1 - LIMITS.projectionMin);
  const factor = Math.max(
    LIMITS.projectionMin,
    Math.min(LIMITS.projectionMax, rawFactor),
  );

  const dropCorrectionY =
    sliderValue < 0 ? Math.abs(sliderValue) * Math.sin(headAngle) * 0.28 : 0;

  return {
    x: subnasal.x + dx * factor,
    y: subnasal.y + dy * factor - dropCorrectionY,
  };
}

// ─── BUILDER PRINCIPAL ──────────────────────────────────────────────

export function buildRhinoplastyControlPoints(
  sliderValues: any,
  intensity: number,
  landmarks: NoseLandmarks,
  canvasW: number,
  canvasH: number,
) {
  const scale = intensity / 100;
  const refSize = Math.min(canvasW, canvasH);
  const K = (refSize / 800) * DEFAULT_K;

  const headAngle = getFaceOrientationAngle(landmarks.bridge, landmarks.base);
  const pose = detectPose(landmarks);

  const noseLenPx = Math.sqrt(
    (landmarks.tip.x - landmarks.base.x) ** 2 +
      (landmarks.tip.y - landmarks.base.y) ** 2,
  );
  const targetRotPx = refSize * ROT_TARGET_RATIO;
  const maxRotAngle = Math.min(
    Math.atan(targetRotPx / Math.max(noseLenPx, 1)),
    ROT_MAX_ANGLE_RAD,
  );

  const points: ControlPoint[] = [];

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

  // Acoplamiento clínico: ajusta sliders dependientes (p.ej. giba fuerte →
  // rotación cefálica mínima) ANTES de calcular destinos para preservar la
  // armonía estética del resultado.
  const { values: coupled } = applyClinicalCoupling(sliderValues as Record<string, number>);

  const giba = (coupled["giba-nasal"] ?? 0) * scale;
  const rot = (coupled["rotacion-punta"] ?? 0) * scale;
  const proy = (coupled["proyeccion-punta"] ?? 0) * scale;
  // Primitivas explícitas (frontal + ¾): no se reinterpretan según pose.
  const reduccion = (coupled["reduccion-global"] ?? 0) * scale;
  const adelgazar = (coupled["adelgazar-dorso"] ?? 0) * scale;
  const reseccion = (coupled["reseccion-alar"] ?? 0) * scale;
  const refinamiento = (coupled["refinamiento-punta"] ?? 0) * scale;

  let finalRadix: Point = { x: landmarks.bridge.x, y: landmarks.bridge.y };
  let finalBridgeMid: Point = {
    x: landmarks.bridgeMid.x,
    y: landmarks.bridgeMid.y,
  };
  let finalTip: Point = { x: landmarks.tip.x, y: landmarks.tip.y };
  // Las alas y la base parten en su posición original; se mueven por:
  //   (a) primitivas alar/global explícitas, (b) ALAR_TRANSFER físico derivado
  //   del movimiento del tip al final del builder.
  let extraNostrilLX = 0, extraNostrilLY = 0;
  let extraNostrilRX = 0, extraNostrilRY = 0;

  // EJECUCIÓN BIFURCADA SEGÚN LA POSE DETECTADA
  if (pose === "frontal") {
    if (giba !== 0) {
      const g = constrainFrontalGiba(giba, landmarks, K);
      finalRadix = g.radixDest;
      finalBridgeMid = g.bridgeMidDest;
    }
    let rotTipDest: Point | null = null;
    if (rot !== 0) {
      const r = constrainFrontalTipRotation(rot, landmarks, maxRotAngle);
      rotTipDest = r.tipDest;
      finalBridgeMid.y += r.bridgeMidDest.y - landmarks.bridgeMid.y;
    }
    if (rotTipDest) finalTip = rotTipDest;
    if (proy !== 0) {
      finalTip = constrainFrontalProjection(proy, {
        ...landmarks,
        tip: finalTip,
      });
    }
  } else {
    // Es Perfil
    if (giba !== 0) {
      const g = constrainProfileGiba(giba, landmarks, K, headAngle);
      finalRadix = g.radixDest;
      finalBridgeMid = g.bridgeMidDest;
    }
    let rotTipDest: Point | null = null;
    if (rot !== 0) {
      const r = constrainProfileTipRotation(rot, landmarks, maxRotAngle);
      rotTipDest = r.tipDest;
      finalBridgeMid.x += r.bridgeMidDest.x - landmarks.bridgeMid.x;
      finalBridgeMid.y += r.bridgeMidDest.y - landmarks.bridgeMid.y;
    }
    if (rotTipDest) finalTip = rotTipDest;
    if (proy !== 0) {
      finalTip = constrainProfileProjection(
        proy,
        { ...landmarks, tip: finalTip },
        headAngle,
      );
    }
  }

  // ─── PRIMITIVAS EXPLÍCITAS (independientes de pose) ─────────────────
  // Cada slider acumula su delta sobre los destinos finales. El builder
  // confía en que la UI solo expone sliders válidos para la pose actual.

  if (reduccion !== 0) {
    const u = constrainUniformShrink(reduccion, landmarks);
    finalRadix.x += u.bridgeDest.x - landmarks.bridge.x;
    finalRadix.y += u.bridgeDest.y - landmarks.bridge.y;
    finalBridgeMid.x += u.bridgeMidDest.x - landmarks.bridgeMid.x;
    finalBridgeMid.y += u.bridgeMidDest.y - landmarks.bridgeMid.y;
    finalTip.x += u.tipDest.x - landmarks.tip.x;
    finalTip.y += u.tipDest.y - landmarks.tip.y;
    extraNostrilLX += u.nostrilLDest.x - landmarks.nostrilL.x;
    extraNostrilLY += u.nostrilLDest.y - landmarks.nostrilL.y;
    extraNostrilRX += u.nostrilRDest.x - landmarks.nostrilR.x;
    extraNostrilRY += u.nostrilRDest.y - landmarks.nostrilR.y;
  }

  // Puntos de control fantasma para osteotomía (definidos fuera del if para
  // poder inyectarlos abajo donde se construyen los demás control points).
  let bridgeNarrowGhosts: {
    leftSrc: Point; leftDest: Point;
    rightSrc: Point; rightDest: Point;
  } | null = null;

  if (adelgazar !== 0) {
    const b = constrainBridgeNarrow(adelgazar, landmarks);
    finalRadix.x += b.bridgeDest.x - landmarks.bridge.x;
    finalBridgeMid.x += b.bridgeMidDest.x - landmarks.bridgeMid.x;
    bridgeNarrowGhosts = {
      leftSrc: b.lateralLeftSrc,
      leftDest: b.lateralLeftDest,
      rightSrc: b.lateralRightSrc,
      rightDest: b.lateralRightDest,
    };
  }

  if (reseccion !== 0) {
    const a = constrainAlarNarrow(reseccion, landmarks);
    extraNostrilLX += a.nostrilLDest.x - landmarks.nostrilL.x;
    extraNostrilRX += a.nostrilRDest.x - landmarks.nostrilR.x;
  }

  // Refinamiento de punta: comprime tip + fantasmas lobulares laterales.
  let tipNarrowGhosts: {
    leftSrc: Point; leftDest: Point;
    rightSrc: Point; rightDest: Point;
  } | null = null;

  if (refinamiento !== 0) {
    const t = constrainTipNarrow(refinamiento, landmarks);
    finalTip.x += t.tipDest.x - landmarks.tip.x;
    // y permanece — el refinamiento solo afina, no levanta
    tipNarrowGhosts = {
      leftSrc: t.lobuleLeftSrc,
      leftDest: t.lobuleLeftDest,
      rightSrc: t.lobuleRightSrc,
      rightDest: t.lobuleRightDest,
    };
  }

  // ─── LOGICA DE SUAVIZADO ALAR (físico, derivado de movimiento del tip) ─
  const tipDeltaX = finalTip.x - landmarks.tip.x;
  const tipDeltaY = finalTip.y - landmarks.tip.y;

  // En frontal, las alas absorben más movimiento lateral (afinar la nariz)
  const currentAlarTransfer = pose === "frontal" ? 0.45 : ALAR_TRANSFER;
  // Cap absoluto al offset alar (D8d): ningún tipDelta puede empujar las
  // alas más del 10% del largo nasal — más allá arrastra el rostro entero.
  const maxAlarOffset = noseLenPx * 0.10;
  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));
  const alarOffset = {
    x: clamp(tipDeltaX * currentAlarTransfer, -maxAlarOffset, maxAlarOffset),
    y: clamp(tipDeltaY * currentAlarTransfer, -maxAlarOffset, maxAlarOffset),
  };

  const finalNostrilL = {
    x: landmarks.nostrilL.x + alarOffset.x + extraNostrilLX,
    y: landmarks.nostrilL.y + alarOffset.y + extraNostrilLY,
  };
  const finalNostrilR = {
    x: landmarks.nostrilR.x + alarOffset.x + extraNostrilRX,
    y: landmarks.nostrilR.y + alarOffset.y + extraNostrilRY,
  };
  const finalBase = {
    x: landmarks.base.x + alarOffset.x,
    y: landmarks.base.y + alarOffset.y,
  };

  // ─── INYECCIÓN DE MATRICES MLS ─────────────────────────────────────
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

  // Radix: emitido cuando se movió por giba, reducción global o cualquier otro
  // efecto acumulado. La condición previa (solo si giba !== 0) ignoraba el
  // movimiento por reducción-global → ahora cualquier delta > epsilon emite.
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

  // Puntos fantasma de osteotomía lateral (D8b): inyectados como puntos MLS
  // independientes — sí tienen distancia al midX y por ende producen delta
  // visible incluso cuando bridge.x === midX (caso típico en frontal).
  if (bridgeNarrowGhosts) {
    points.push({
      px: bridgeNarrowGhosts.leftDest.x,
      py: bridgeNarrowGhosts.leftDest.y,
      qx: bridgeNarrowGhosts.leftSrc.x,
      qy: bridgeNarrowGhosts.leftSrc.y,
      w: SURGICAL_MASS.activeDorsum,
    });
    points.push({
      px: bridgeNarrowGhosts.rightDest.x,
      py: bridgeNarrowGhosts.rightDest.y,
      qx: bridgeNarrowGhosts.rightSrc.x,
      qy: bridgeNarrowGhosts.rightSrc.y,
      w: SURGICAL_MASS.activeDorsum,
    });
  }

  // Puntos fantasma de refinamiento de punta (D8c): comprimen el lóbulo
  // a la altura del tip sin afectar el dorso.
  if (tipNarrowGhosts) {
    points.push({
      px: tipNarrowGhosts.leftDest.x,
      py: tipNarrowGhosts.leftDest.y,
      qx: tipNarrowGhosts.leftSrc.x,
      qy: tipNarrowGhosts.leftSrc.y,
      w: SURGICAL_MASS.activeTip,
    });
    points.push({
      px: tipNarrowGhosts.rightDest.x,
      py: tipNarrowGhosts.rightDest.y,
      qx: tipNarrowGhosts.rightSrc.x,
      qy: tipNarrowGhosts.rightSrc.y,
      w: SURGICAL_MASS.activeTip,
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
  }

  const noseBbox = computeNoseBbox(landmarks, canvasW, canvasH);
  return { points, noseBbox };
}
