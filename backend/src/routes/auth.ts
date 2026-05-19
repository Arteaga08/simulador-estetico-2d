import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { prisma } from "../lib/prisma";
import { authMiddleware, JwtPayload } from "../middleware/authMiddleware";
import { authLimiter, twoFactorLimiter } from "../middleware/rateLimiter";
import { validateBody } from "../middleware/validate";
import { loginSchema, totpCodeSchema } from "../validators";
import { getClientIp } from "../lib/requestHelpers";

const router = Router();

function signToken(payload: JwtPayload, expiresIn: string): string {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn,
  } as jwt.SignOptions);
}

router.post(
  "/login",
  authLimiter,
  validateBody(loginSchema),
  async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const ip = getClientIp(req);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      if (user) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "LOGIN_FAILED",
            resource: "user",
            resourceId: user.id,
            ipAddress: ip,
            userAgent: req.headers["user-agent"],
          },
        });
      }
      res.status(401).json({ error: "Credenciales incorrectas." });
      return;
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN_SUCCESS",
        resource: "user",
        resourceId: user.id,
        ipAddress: ip,
        userAgent: req.headers["user-agent"],
      },
    });

    if (!user.twoFactorEnabled) {
      const tempToken = signToken(
        { userId: user.id, role: user.role, purpose: "setup" },
        "10m"
      );
      res.json({ requiresTwoFactorSetup: true, tempToken });
      return;
    }

    const tempToken = signToken(
      { userId: user.id, role: user.role, purpose: "verify" },
      "5m"
    );
    res.json({ requiresTwoFactor: true, tempToken });
  }
);

router.post(
  "/2fa/setup",
  authMiddleware,
  async (req: Request, res: Response) => {
    if (req.user?.purpose !== "setup") {
      res.status(403).json({ error: "Token no autorizado para este paso." });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });
    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }

    const secret = authenticator.generateSecret();
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret },
    });

    const otpauthUrl = authenticator.keyuri(user.email, "SimuladorEstetico", secret);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

    res.json({ otpauthUrl, qrDataUrl });
  }
);

router.post(
  "/2fa/verify",
  authMiddleware,
  twoFactorLimiter,
  validateBody(totpCodeSchema),
  async (req: Request, res: Response) => {
    const { code } = req.body;

    if (req.user?.purpose !== "setup" && req.user?.purpose !== "verify") {
      res.status(403).json({ error: "Token no autorizado para este paso." });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });
    if (!user || !user.twoFactorSecret) {
      res.status(400).json({ error: "2FA no configurado." });
      return;
    }

    const ip = getClientIp(req);
    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: isValid ? "TWO_FACTOR_SUCCESS" : "TWO_FACTOR_FAILED",
        resource: "user",
        resourceId: user.id,
        ipAddress: ip,
        userAgent: req.headers["user-agent"],
      },
    });

    if (!isValid) {
      res.status(401).json({ error: "Código 2FA incorrecto." });
      return;
    }

    if (!user.twoFactorEnabled) {
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: true },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "TWO_FACTOR_SETUP",
          resource: "user",
          resourceId: user.id,
          ipAddress: ip,
          userAgent: req.headers["user-agent"],
        },
      });
    }

    const token = signToken({ userId: user.id, role: user.role }, "8h");
    res.json({ token, role: user.role });
  }
);

export default router;
