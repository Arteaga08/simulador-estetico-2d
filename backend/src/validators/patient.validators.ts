import { z } from "zod";

export const createPatientSchema = z.object({
  nombre: z.string().min(1).max(100).trim(),
  email: z.string().email().toLowerCase(),
  telefono: z
    .string()
    .regex(/^\+?[0-9]{7,15}$/)
    .optional(),
  fechaNacimiento: z.string().datetime().optional(),
});

export const updatePatientSchema = createPatientSchema.partial();
