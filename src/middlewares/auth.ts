import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthRequest, JwtPayload, errorResponse } from "../types";
import { AppError } from "./errorHandler";

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res
      .status(401)
      .json(
        errorResponse(
          "UNAUTHORIZED",
          "Missing or invalid Authorization header",
        ),
      );
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res
        .status(401)
        .json(
          errorResponse(
            "TOKEN_EXPIRED",
            "Your session has expired. Please log in again.",
          ),
        );
      return;
    }
    res.status(401).json(errorResponse("INVALID_TOKEN", "Invalid token"));
  }
}

// ─── JWT helpers ────────────────────────────────────────────────────────────────
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    throw new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
  }
}
