import { JsonWebTokenError, TokenExpiredError, NotBeforeError } from "jsonwebtoken";

export interface JwtErrorResponse {
  status: 401;
  message: string;
}

export function handleJwtError(
  err: JsonWebTokenError | TokenExpiredError | NotBeforeError
): JwtErrorResponse {
  if (err instanceof TokenExpiredError) {
    return { status: 401, message: "Token expirado. Inicia sesión de nuevo." };
  }
  if (err instanceof NotBeforeError) {
    return { status: 401, message: "Token aún no activo." };
  }
  return { status: 401, message: "Token inválido." };
}
