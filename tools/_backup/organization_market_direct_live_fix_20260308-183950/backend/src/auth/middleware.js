import { verifyToken } from "./jwt.js";
import { prisma } from "../prisma.js";

function readToken(req) {
  // 1) Authorization: Bearer <token>
  const header = req.headers["authorization"] || "";
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    const t = header.slice(7).trim();
    if (t) return t;
  }

  // 2) x-auth-token: <token> (web tarafı bunu kullanıyor)
  const xt = req.headers["x-auth-token"];
  if (typeof xt === "string" && xt.trim()) return xt.trim();

  // 3) bazen proxy vs. farklı casing ile gelebilir
  const xt2 = req.headers["X-Auth-Token"];
  if (typeof xt2 === "string" && xt2.trim()) return xt2.trim();

  return null;
}

export function authRequired() {
  return async (req, res, next) => {
    try {
      const token = readToken(req);
      if (!token) return res.status(401).json({ error: "Missing token" });

      const decoded = verifyToken(token);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });
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