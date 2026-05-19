import { Router, Request, Response } from "express";
import { Procedimiento, TecnicaSesion } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/rbac";
import { generalLimiter } from "../middleware/rateLimiter";
import { validateBody } from "../middleware/validate";
import { createSessionSchema } from "../validators";
import { getClientIp, getUserAgent } from "../lib/requestHelpers";

const router = Router({ mergeParams: true });

router.use(authMiddleware);
router.use(generalLimiter);

router.post(
  "/",
  requireRole("SURGEON", "ADMIN"),
  validateBody(createSessionSchema),
  async (req: Request, res: Response) => {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.patientId as string },
    });
    if (!patient) {
      res.status(404).json({ error: "Paciente no encontrado." });
      return;
    }

    const session = await prisma.session.create({
      data: {
        patientId: patient.id,
        procedimiento: req.body.procedimiento ?? Procedimiento.RINOPLASTIA,
        modo: req.body.modo ?? TecnicaSesion.QUIRURGICO,
        notas: req.body.notas,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: "SESSION_CREATED",
        resource: "session",
        resourceId: session.id,
        metadata: { patientId: patient.id },
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      },
    });

    res.status(201).json(session);
  }
);

export default router;
