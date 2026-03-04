//backend/src/routes/auth.js

import express from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma.js";
import { signToken } from "../auth/jwt.js";
import { loginSchema } from "../validators.js";

const DISABLED_PREFIX = "$DISABLED$";
function isDisabledHash(hash) {
  return String(hash || "").startsWith(DISABLED_PREFIX);
}



function getReqIp(req) {
  try {
    const xfwd = req.headers["x-forwarded-for"]?.toString() || "";
    return xfwd.split(",")[0]?.trim() || req.socket?.remoteAddress || null;
  } catch {
    return null;
  }
}

async function recordLoginAudit({ req, email, user, action, reason }) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: user?.id || null,
        actorRole: user?.role || null,
        action,
        entity: "User",
        entityId: user?.id || null,
        meta: {
          email,
          reason: reason || null,
          ip: getReqIp(req),
          ua: req.headers["user-agent"]?.toString() || null,
        },
      },
    });
  } catch {
    // swallow
  }
}

export const authRouter = express.Router();

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await recordLoginAudit({ req, email, user: null, action: "AUTH_LOGIN_FAIL", reason: "USER_NOT_FOUND" });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (isDisabledHash(user.passwordHash)) {
    await recordLoginAudit({ req, email, user, action: "AUTH_LOGIN_DISABLED", reason: "DISABLED" });
    return res.status(403).json({ error: "Account disabled" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    await recordLoginAudit({ req, email, user, action: "AUTH_LOGIN_FAIL", reason: "BAD_PASSWORD" });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({ userId: user.id, role: user.role });
  await recordLoginAudit({ req, email, user, action: "AUTH_LOGIN_OK", reason: null });
  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      companyId: user.companyId,
      roomId: user.roomId,
    },
  });
});
