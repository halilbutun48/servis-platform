import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { getObservabilityManifest, buildObservabilitySkeletonSummary, buildRoomObservabilitySummary, buildRoomObservabilityDrivers, buildRoomObservabilityIssues } from "../ops/observabilityManifest.js";

export function observabilityRouter() {
  const r = express.Router();

  r.get("/manifest", authRequired(), async (_req, res) => {
    return res.json(getObservabilityManifest());
  });

  r.get("/health-summary", authRequired(), async (_req, res) => {
    return res.json(buildObservabilitySkeletonSummary());
  });

  r.get("/event-types", authRequired(), async (_req, res) => {
    return res.json({
      items: getObservabilityManifest().mobileHealthEventTypes,
      gpsSource: "SURUCUNUN_TELEFON_GPSI",
    });
  });

  r.get("/recent-events", authRequired(), requireRole("SUPER_ADMIN"), async (_req, res) => {
    const rows = await prisma.auditLog.findMany({
      where: {
        action: {
          in: [
            "AUTH_LOGIN_OK",
            "AUTH_LOGIN_FAIL",
            "AUTH_LOGIN_DISABLED",
            "AUTH_LOGIN_DEVICE_REQUIRED",
            "AUTH_LOGIN_DEVICE_MISMATCH",
            "AUTH_DRIVER_PIN_LOCKED",
          ],
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 8,
      select: { id: true, createdAt: true, action: true },
    });

    const labelOf = (action) => {
      switch (String(action || "")) {
        case "AUTH_LOGIN_OK":
          return "Giriş başarılı";
        case "AUTH_LOGIN_FAIL":
          return "Giriş hatası";
        case "AUTH_LOGIN_DISABLED":
          return "Pasif hesap giriş denemesi";
        case "AUTH_LOGIN_DEVICE_REQUIRED":
          return "Cihaz doğrulaması gerekli";
        case "AUTH_LOGIN_DEVICE_MISMATCH":
          return "Cihaz uyuşmazlığı";
        case "AUTH_DRIVER_PIN_LOCKED":
          return "Sürücü PIN kilidi";
        default:
          return String(action || "-");
      }
    };

    const severityOf = (action) => {
      const a = String(action || "");
      if (a === "AUTH_LOGIN_OK") return "INFO";
      if (a === "AUTH_LOGIN_DEVICE_REQUIRED") return "MEDIUM";
      return "HIGH";
    };

    return res.json({
      items: rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        type: row.action,
        label: labelOf(row.action),
        severity: severityOf(row.action),
      })),
    });
  });

r.get("/room/summary", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
  return res.json(await buildRoomObservabilitySummary(req.user));
});

r.get("/room/drivers", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
  return res.json({ items: await buildRoomObservabilityDrivers(req.user) });
});

r.get("/room/issues", authRequired(), requireRole("ROOM", "SUPER_ADMIN"), async (req, res) => {
  return res.json({ items: await buildRoomObservabilityIssues(req.user) });
});

  return r;
}
