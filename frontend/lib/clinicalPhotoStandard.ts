/**
 * Clinical photo standard for rhinoplasty simulation.
 *
 * Every threshold the upload pipeline checks against lives here as a named
 * constant. Changing the standard = editing one file. Numbers used inline
 * inside checks are a smell — point back to a constant here instead.
 *
 * Standards are based on common plastic-surgery photographic documentation
 * practice (Frankfort horizontal, neutral background, 1.5m distance, soft
 * frontal lighting). Numbers are conservative — designed for soft warnings,
 * not hard rejection.
 */
export const PHOTO_STANDARD = {
  /** Minimum image resolution on the shortest side (px). */
  minResolution: 800,

  /** Maximum aspect ratio (wider÷narrower). 16:9 ≈ 1.78. Rejects very
   *  panoramic crops where the face is squeezed. */
  maxAspectRatio: 1.78,

  /** Face bounding box must occupy at least this fraction of image height. */
  minFaceFraction: 0.25,

  /** Face bounding box must occupy at most this fraction of image height.
   *  Above this the close-up usually crops chin or forehead. */
  maxFaceFraction: 0.85,

  /** Acceptable median luma (0-255) for the whole image. Outside this range
   *  the photo is either too dark or blown out. */
  brightnessMedianRange: [70, 200] as [number, number],

  /** Ratio std/mean of the luma histogram. High values = patchy lighting
   *  (harsh shadows / overexposed highlights). */
  brightnessUniformityMax: 0.40,

  /** Standard deviation of luma sampled at the image border (excluding the
   *  face bbox). Solid clinical backdrops give std < 20; cluttered scenes
   *  (street, furniture) easily exceed 50. */
  backgroundComplexityMax: 35,
} as const

/** Human-readable label per quality code, used in the warnings banner. */
export const QUALITY_LABELS: Record<string, string> = {
  'low-resolution': 'Resolución baja',
  'unusual-aspect': 'Proporción inusual',
  'face-too-small': 'Cara muy pequeña en el encuadre',
  'face-too-large': 'Cara muy cerca (close-up)',
  'too-dark': 'Iluminación insuficiente',
  'too-bright': 'Imagen sobreexpuesta',
  'uneven-lighting': 'Iluminación desigual',
  'complex-background': 'Fondo complejo',
  'view-mismatch': 'Vista detectada distinta a la etiquetada',
  'no-face-detected': 'No se detectó rostro',
}

/** Actionable tip per quality code — one sentence the surgeon can act on. */
export const QUALITY_TIPS: Record<string, string> = {
  'low-resolution': `Sube una foto de al menos ${PHOTO_STANDARD.minResolution}px en el lado corto para que la detección sea precisa.`,
  'unusual-aspect': 'Usa una foto en orientación vertical o cuadrada; las panorámicas distorsionan las proporciones nasales.',
  'face-too-small': 'Acércate o recorta la imagen para que la cara ocupe al menos un cuarto del encuadre.',
  'face-too-large': 'Aleja la cámara: el rostro debe verse completo (frente, cuello) sin recortarse.',
  'too-dark': 'Aumenta la iluminación ambiente o usa una fuente de luz frontal suave.',
  'too-bright': 'Reduce la intensidad de la luz o evita el flash directo; la imagen está sobreexpuesta.',
  'uneven-lighting': 'Evita sombras duras: usa luz frontal difusa, no cenital ni contraluz.',
  'complex-background': 'Coloca al paciente frente a una pared lisa de color sólido (gris, azul o blanco).',
  'view-mismatch': 'La vista detectada no coincide con la etiquetada. Verifica el ángulo o cambia la etiqueta.',
  'no-face-detected': 'MediaPipe no encontró un rostro. Revisa iluminación, encuadre y ángulo, o coloca los puntos manualmente.',
}
