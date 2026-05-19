import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/rbac";
import { generalLimiter } from "../middleware/rateLimiter";
import { validateBody } from "../middleware/validate";
import { createPatientSchema, updatePatientSchema } from "../validators";
import { getClientIp, getUserAgent } from "../lib/requestHelpers";

const router = Router();

router.use(authMiddleware);
router.use(generalLimiter);

router.get(
  "/",
  requireRole("SURGEON", "ADMIN"),
  async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = String(req.query.search || "").trim();

    const where = search
      ? {
          OR: [
            { nombre: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.patient.count({ where }),
    ]);

    res.json({ data, total, page, limit });
  }
);

router.get(
  "/:id",
  requireRole("SURGEON", "ADMIN"),
  async (req: Request, res: Response) => {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id as string },
      include: {
        sessions: {
          orderBy: { createdAt: "desc" },
          include: {
            results: {
              select: {
                id: true,
                cloudinaryUrl: true,
                sliderConfig: true,
                angulos: true,
                shareToken: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!patient) {
      res.status(404).json({ error: "Paciente no encontrado." });
      return;
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: "PATIENT_VIEWED",
        resource: "patient",
        resourceId: patient.id,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      },
    });

    res.json(patient);
  }
);

router.post(
  "/",
  requireRole("SURGEON", "ADMIN"),
  validateBody(createPatientSchema),
  async (req: Request, res: Response) => {
    const patient = await prisma.patient.create({
      data: {
        ...req.body,
        fechaNacimiento: req.body.fechaNacimiento
          ? new Date(req.body.fechaNacimiento)
          : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: "PATIENT_CREATED",
        resource: "patient",
        resourceId: patient.id,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      },
    });

    res.status(201).json(patient);
  }
);

router.put(
  "/:id",
  requireRole("SURGEON", "ADMIN"),
  validateBody(updatePatientSchema),
  async (req: Request, res: Response) => {
    const existing = await prisma.patient.findUnique({
      where: { id: req.params.id as string },
    });
    if (!existing) {
      res.status(404).json({ error: "Paciente no encontrado." });
      return;
    }

    const patient = await prisma.patient.update({
      where: { id: req.params.id as string },
      data: {
        ...req.body,
        fechaNacimiento: req.body.fechaNacimiento
          ? new Date(req.body.fechaNacimiento)
          : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: "PATIENT_UPDATED",
        resource: "patient",
        resourceId: patient.id,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      },
    });

    res.json(patient);
  }
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  async (req: Request, res: Response) => {
    const existing = await prisma.patient.findUnique({
      where: { id: req.params.id as string },
    });
    if (!existing) {
      res.status(404).json({ error: "Paciente no encontrado." });
      return;
    }

    await prisma.patient.delete({ where: { id: req.params.id as string } });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: "PATIENT_DELETED",
        resource: "patient",
        resourceId: req.params.id as string,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      },
    });

    res.status(204).send();
  }
);

export default router;
