//backend/src/routes/admin.js
import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";

/**
 * SUPER_ADMIN — Overview stats
 * GET /api/admin/stats
 */
export function adminRouter() {
  const r = express.Router();

  r.get("/stats", authRequired, requireRole("SUPER_ADMIN"), async (req, res) => {
    const [companies, rooms, vehicles, drivers] = await Promise.all([
      prisma.company.count(),
      prisma.room.count(),
      prisma.vehicle.count(),
      prisma.driver.count(),
    ]);

    res.json({ companies, rooms, vehicles, drivers });
  });

  return r;
}