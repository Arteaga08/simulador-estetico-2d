import { Router } from "express";
import { PROCEDURES } from "../lib/procedures";

const router = Router();

router.get("/", (_req, res) => {
  res.json(PROCEDURES);
});

export default router;
