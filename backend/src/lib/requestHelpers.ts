import { Request } from "express";

export function getClientIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

export function getUserAgent(req: Request): string | undefined {
  const ua = req.headers["user-agent"];
  return Array.isArray(ua) ? ua[0] : ua;
}
