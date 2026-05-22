/**
 * 1. ORIENTACIÓN ESPACIAL ANATÓMICA
 * Calcula la desviación angular de la cabeza de la paciente en la fotografía.
 * Usa la Glabela y la Base (Subnasal) como plomo real del rostro.
 */
export function getFaceOrientationAngle(glabela, basePoint) {
  const dy = basePoint.y - glabela.y;
  const dx = basePoint.x - glabela.x;
  return Math.atan2(dx, dy); // Ángulo de rotación relativo a la vertical pura
}

/**
 * 2. LÍNEA VERTICAL VERDADERA CO-LINEAL
 * Adapta el plano de profundidad al ángulo de inclinación real del rostro.
 */
export function getTVL(glabela, basePoint) {
  const angle = getFaceOrientationAngle(glabela, basePoint);
  return {
    origin: glabela,
    dir: { x: Math.sin(angle), y: Math.cos(angle) },
    angle,
  };
}

/**
 * 3. CONTROLADOR DE LA NORMAL DEL DORSO
 * Modificado para rotar la matriz de empuje de la giba según la inclinación craneal.
 */
export function getNasalDorsumAxis(radix, pronasal, headAngle) {
  const dx = pronasal.x - radix.x;
  const dy = pronasal.y - radix.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len < 1e-6) {
    return { dorsum: { x: 0, y: 1 }, normal: { x: 1, y: 0 }, length: 0 };
  }

  const dorsum = { x: dx / len, y: dy / len };

  // Transformación trigonométrica: Ajusta el vector normal al plano inclinado de la cara
  const cosH = Math.cos(headAngle);
  const sinH = Math.sin(headAngle);

  const normal = {
    x: -dorsum.y * cosH - dorsum.x * sinH,
    y: dorsum.x * cosH - dorsum.y * sinH,
  };

  return { dorsum, normal, length: len };
}

export function getNasolabialAngle(subnasal, pronasal) {
  const dx = pronasal.x - subnasal.x;
  const dy = pronasal.y - subnasal.y;
  return Math.atan2(-dy, dx) * (180 / Math.PI);
}

export function getTipProjection(pronasal, tvl) {
  // Proyección ortogonal real sobre el vector director de la TVL inclinada
  const dx = pronasal.x - tvl.origin.x;
  const dy = pronasal.y - tvl.origin.y;
  return Math.abs(dx * tvl.dir.y - dy * tvl.dir.x);
}

export function getNasofrontalAngle(nasion, radix, pronasal) {
  const v1x = nasion.x - radix.x,
    v1y = nasion.y - radix.y;
  const v2x = pronasal.x - radix.x,
    v2y = pronasal.y - radix.y;
  const dot = v1x * v2x + v1y * v2y;
  const l1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const l2 = Math.sqrt(v2x * v2x + v2y * v2y);
  if (l1 < 1e-6 || l2 < 1e-6) return 0;
  const cosA = Math.max(-1, Math.min(1, dot / (l1 * l2)));
  return Math.acos(cosA) * (180 / Math.PI);
}

export function rotateTipAroundSubnasal(pronasal, subnasal, deltaAngleRad) {
  const dx = pronasal.x - subnasal.x;
  const dy = pronasal.y - subnasal.y;
  const r = Math.sqrt(dx * dx + dy * dy);
  const base = Math.atan2(dy, dx);
  const next = base + deltaAngleRad;
  return {
    x: subnasal.x + r * Math.cos(next),
    y: subnasal.y + r * Math.sin(next),
  };
}

export function computeNoseBbox(
  landmarks,
  canvasW,
  canvasH,
  marginFactor = 0.15, // Reducimos el margen artificial porque los anclajes ya expanden la caja
) {
  // AQUÍ ESTÁ LA MAGIA: Agregamos los anclajes al cálculo de la caja
  const pts = [
    landmarks.bridge,
    landmarks.bridgeMid,
    landmarks.tip,
    landmarks.nostrilL,
    landmarks.nostrilR,
    landmarks.base,
    ...(landmarks.anchors || []), // <-- ESTO EVITA EL CORTE FEO
  ];

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const nW = maxX - minX;
  const nH = maxY - minY;
  const mx = nW * marginFactor;
  const my = nH * marginFactor;

  return {
    x: Math.max(0, minX - mx),
    y: Math.max(0, minY - my),
    width: Math.min(canvasW, nW + mx * 2),
    height: Math.min(canvasH, nH + my * 2),
  };
}
