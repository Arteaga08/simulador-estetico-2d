import "dotenv/config";
import express from "express";
import helmet from "helmet";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/errorHandler";
import { generalLimiter } from "./middleware/rateLimiter";
import authRoutes from "./routes/auth";
import patientRoutes from "./routes/patients";
import sessionRoutes from "./routes/sessions";
import cloudinaryRoutes from "./routes/cloudinary";
import adminRoutes from "./routes/admin";
import proceduresRoutes from "./routes/procedures";

const app = express();

app.use(helmet());
app.use(corsMiddleware);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/procedures", proceduresRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/patients/:patientId/sessions", sessionRoutes);
app.use("/api/cloudinary", cloudinaryRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorHandler);

export default app;
