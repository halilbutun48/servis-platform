// backend/src/middleware/apiRequestLog.js
import { prisma } from "../prisma.js";
import { verifyToken } from "../auth/jwt.js";

function tryUserFromReq(req) {
  try {
    const auth = req.headers.authorization || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    const token = m?.[1] || req.headers["x-auth-token"];
    if (!token) return null;

    const decoded = verifyToken(String(token));
    // normalize: {id} or {userId}
    const id = decoded?.id ?? decoded?.userId ?? null;
    const role = decoded?.role ?? null;

    return id ? { id: Number(id), role } : null;
  } catch {
    return null;
  }
}

export function apiRequestLog() {
  return (req, res, next) => {
    const t0 = Date.now();

    res.on("finish", () => {
      // fire-and-forget (do not block response)
      (async () => {
        try {
          const path = req.originalUrl || req.url || "";

          // skip noisy
          if (
            req.method === "OPTIONS" ||
            path.startsWith("/health") ||
            path.startsWith("/ws") ||
            path === "/favicon.ico"
          ) {
            return;
          }

          const durationMs = Date.now() - t0;
          const user = req.user || tryUserFromReq(req);

          const xfwd = req.headers["x-forwarded-for"]?.toString() || "";
          const ip = req.edgeClientIp || xfwd.split(",")[0]?.trim() || req.socket?.remoteAddress || null;

          await prisma.apiRequest.create({
            data: {
              method: req.method,
              path,
              status: res.statusCode,
              durationMs,
              ip,
              userAgent: req.headers["user-agent"]?.toString() || null,
              userId: user?.id || null,
              role: user?.role || null,
            },
          });
        } catch {
          // swallow
        }
      })();
    });

    next();
  };
}
