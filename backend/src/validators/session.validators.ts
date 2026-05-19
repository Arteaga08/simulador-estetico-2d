import { z } from "zod";
import { Procedimiento, TecnicaSesion } from "@prisma/client";
import { TECNICAS_POR_PROCEDIMIENTO } from "../lib/procedures";

export const createSessionSchema = z
  .object({
    procedimiento: z.nativeEnum(Procedimiento).optional(),
    modo: z.nativeEnum(TecnicaSesion).optional(),
    notas: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.procedimiento && data.modo) {
      const tecnicasValidas = TECNICAS_POR_PROCEDIMIENTO.get(data.procedimiento);
      if (tecnicasValidas && !tecnicasValidas.includes(data.modo)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["modo"],
          message: `La técnica '${data.modo}' no es válida para '${data.procedimiento}'. Válidas: ${tecnicasValidas.join(", ")}`,
        });
      }
    }
  });
