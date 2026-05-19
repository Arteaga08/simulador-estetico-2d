import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { JsonWebTokenError } from "jsonwebtoken";
import { handlePrismaError } from "./prismaErrors";
import { handleZodError } from "./zodErrors";
import { handleJwtError } from "./jwtErrors";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const { status, message } = handlePrismaError(err);
    res.status(status).json({ error: message });
    return;
  }

  if (err instanceof ZodError) {
    const { status, body } = handleZodError(err);
    res.status(status).json(body);
    return;
  }

  if (err instanceof JsonWebTokenError) {
    const { status, message } = handleJwtError(err);
    res.status(status).json({ error: message });
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.error(err);
  }

  res.status(500).json({ error: "Error interno del servidor." });
}
