import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { PanelRole } from "@prisma/client";

export type AuthPayload = {
  sub: number;
  email: string;
  role: PanelRole;
};

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthPayload;
  }
}

function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return s;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign({ sub: payload.sub, email: payload.email, role: payload.role }, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload & AuthPayload;
  return {
    sub: decoded.sub,
    email: decoded.email,
    role: decoded.role,
  };
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Brak tokena autoryzacji" });
    return;
  }
  try {
    req.auth = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Nieprawidłowy token" });
  }
}

export function requireRole(...roles: PanelRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) {
      res.status(401).json({ error: "Brak autoryzacji" });
      return;
    }
    if (!roles.includes(auth.role)) {
      res.status(403).json({ error: "Brak uprawnień" });
      return;
    }
    next();
  };
}
