import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";

export function createRateLimiter(
  windowMs: number,
  max: number,
  message: string
): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

export const authLimiter = createRateLimiter(
  15 * 60 * 1000,
  5,
  "Demasiados intentos. Intenta de nuevo en 15 minutos."
);

export const twoFactorLimiter = createRateLimiter(
  10 * 60 * 1000,
  3,
  "Demasiados intentos de verificación. Intenta de nuevo en 10 minutos."
);

export const cloudinaryLimiter = createRateLimiter(
  60 * 1000,
  10,
  "Límite de firmas alcanzado. Espera un momento."
);

export const generalLimiter = createRateLimiter(
  60 * 1000,
  100,
  "Demasiadas peticiones. Intenta más tarde."
);

export const adminLimiter = createRateLimiter(
  60 * 1000,
  30,
  "Límite de peticiones administrativas alcanzado. Espera un momento."
);
