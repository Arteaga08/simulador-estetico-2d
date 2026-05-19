import { Router, Request, Response } from "express";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/rbac";
import { cloudinaryLimiter } from "../middleware/rateLimiter";
import { validateBody } from "../middleware/validate";
import { signSchema } from "../validators";

const router = Router();

router.use(authMiddleware);

router.post(
  "/sign",
  requireRole("SURGEON", "ADMIN"),
  cloudinaryLimiter,
  validateBody(signSchema),
  async (req: Request, res: Response) => {
    const { patientId } = req.body;
    const publicId = `patients/${patientId}/${uuidv4()}`;
    const timestamp = Math.round(Date.now() / 1000);
    const uploadPreset = "medical_private";

    const paramsToSign = [
      `public_id=${publicId}`,
      `timestamp=${timestamp}`,
      `upload_preset=${uploadPreset}`,
    ]
      .sort()
      .join("&");

    const signature = crypto
      .createHash("sha1")
      .update(paramsToSign + process.env.CLOUDINARY_API_SECRET)
      .digest("hex");

    res.json({
      signature,
      timestamp,
      publicId,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      uploadPreset,
    });
  }
);

export default router;
