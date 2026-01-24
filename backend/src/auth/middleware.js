import { verifyToken } from "./jwt.js";
import { prisma } from "../prisma.js";

export function authRequired() {
  return async (req, res, next) => {
    try {
      const header = req.headers["authorization"] || "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : null;
      if (!token) return res.status(401).json({ error: "Missing token" });

      const decoded = verifyToken(token);
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user) return res.status(401).json({ error: "Invalid token" });

      req.user = user;
      next();
    } catch (e) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  };
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}
