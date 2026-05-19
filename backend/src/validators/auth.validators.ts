import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const totpCodeSchema = z.object({
  code: z.string().length(6),
});
