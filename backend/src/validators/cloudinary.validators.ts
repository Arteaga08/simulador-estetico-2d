import { z } from "zod";

export const signSchema = z.object({
  patientId: z.string().min(1),
});
