import { Prisma } from "@prisma/client";

export interface AppError {
  status: number;
  message: string;
}

export function handlePrismaError(err: Prisma.PrismaClientKnownRequestError): AppError {
  switch (err.code) {
    case "P2002":
      return { status: 409, message: "Ya existe un registro con esos datos." };
    case "P2025":
      return { status: 404, message: "Registro no encontrado." };
    case "P2003":
      return { status: 400, message: "Referencia a recurso inexistente." };
    default:
      return { status: 500, message: "Error de base de datos." };
  }
}
