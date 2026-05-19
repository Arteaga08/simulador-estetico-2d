import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/rbac";
import { adminLimiter } from "../middleware/rateLimiter";
import { validateBody, validateQuery } from "../middleware/validate";

const router = Router();

router.use(authMiddleware);
router.use(requireRole("ADMIN"));
router.use(adminLimiter);

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "SURGEON"]),
});

const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "SURGEON"]).optional(),
});

const auditLogQuerySchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const listUsersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// ─── Users ────────────────────────────────────────────────────────────────────

router.get(
  "/users",
  validateQuery(listUsersQuerySchema),
  async (req: Request, res: Response) => {
    const { page, limit } = req.query as unknown as z.infer<typeof listUsersQuerySchema>;

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count(),
    ]);

    res.json({ data, total, page, limit });
  }
);

router.get("/users/:id", async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id as string },
    select: {
      id: true,
      email: true,
      role: true,
      twoFactorEnabled: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado." });
    return;
  }

  res.json(user);
});

router.post(
  "/users",
  validateBody(createUserSchema),
  async (req: Request, res: Response) => {
    const { email, password, role } = req.body as z.infer<typeof createUserSchema>;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "Ya existe un usuario con ese email." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, role },
      select: {
        id: true,
        email: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  }
);

router.put(
  "/users/:id",
  validateBody(updateUserSchema),
  async (req: Request, res: Response) => {
    const { role } = req.body as z.infer<typeof updateUserSchema>;

    const existing = await prisma.user.findUnique({
      where: { id: req.params.id as string },
    });
    if (!existing) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.params.id as string },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
        twoFactorEnabled: true,
        updatedAt: true,
      },
    });

    res.json(user);
  }
);

router.delete("/users/:id", async (req: Request, res: Response) => {
  if (req.user!.userId === (req.params.id as string)) {
    res.status(400).json({ error: "No puedes eliminar tu propio usuario." });
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { id: req.params.id as string },
  });
  if (!existing) {
    res.status(404).json({ error: "Usuario no encontrado." });
    return;
  }

  await prisma.user.delete({ where: { id: req.params.id as string } });
  res.status(204).send();
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────

router.get(
  "/audit-logs",
  validateQuery(auditLogQuerySchema),
  async (req: Request, res: Response) => {
    const { userId, action, from, to, page, limit } =
      req.query as unknown as z.infer<typeof auditLogQuerySchema>;

    const where = {
      ...(userId && { userId }),
      ...(action && { action: action as never }),
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, role: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ data, total, page, limit });
  }
);

export default router;
