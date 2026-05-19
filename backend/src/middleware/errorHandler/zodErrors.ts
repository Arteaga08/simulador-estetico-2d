import { ZodError } from "zod";

export interface ZodErrorResponse {
  status: 400;
  body: {
    error: string;
    details: ZodError["issues"];
  };
}

export function handleZodError(err: ZodError): ZodErrorResponse {
  return {
    status: 400,
    body: {
      error: "Datos de entrada inválidos.",
      details: err.issues,
    },
  };
}
