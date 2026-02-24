// backend/src/routes/geocode.js
// M33.4: Simple geocode endpoint (DEV-friendly)
// Default provider: Nominatim (OpenStreetMap)
// NOTE: For production, prefer a paid/provider key or self-hosted Nominatim.

import express from "express";
import { z } from "zod";
import { authRequired, requireRole } from "../auth/middleware.js";

const bodySchema = z.object({
  q: z.string().trim().min(3).max(250),
});

export function geocodeRouter() {
  const r = express.Router();

  r.use(authRequired(), requireRole("COMPANY", "SUPER_ADMIN"));

  // POST /api/geocode
  // body: { q: "address text" }
  r.post("/", async (req, res) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

    const q = parsed.data.q;

    const base = String(process.env.GEOCODE_URL || "https://nominatim.openstreetmap.org/search");
    const ua = String(process.env.GEOCODE_USER_AGENT || "personel-servis-v1-dev");

    const url = `${base}?format=json&limit=1&q=${encodeURIComponent(q)}`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);

    try {
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": ua,
          "Accept": "application/json",
        },
        signal: ctrl.signal,
      });

      const text = await resp.text();
      if (!resp.ok) return res.json({ ok: false, error: `geocode:${resp.status}`, detail: text.slice(0, 200) });

      const arr = text ? JSON.parse(text) : [];
      const first = Array.isArray(arr) ? arr[0] : null;
      const lat = first ? Number(first.lat) : NaN;
      const lng = first ? Number(first.lon) : NaN;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.json({ ok: false, error: "notFound" });

      return res.json({
        ok: true,
        provider: "nominatim",
        query: q,
        lat,
        lng,
        displayName: String(first.display_name || ""),
      });
    } catch (e) {
      return res.json({ ok: false, error: "geocode:fetchFailed", detail: e?.message || String(e) });
    } finally {
      clearTimeout(t);
    }
  });

  return r;
}
