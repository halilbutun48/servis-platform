// backend/src/routes/geocode.js
// Lightweight geocode proxy (Nominatim) for UI "Adresten Bul"
import express from "express";
import { z } from "zod";
import { authRequired } from "../auth/middleware.js";

const schema = z.object({
  q: z.string().trim().min(3),
  country: z.string().trim().optional(), // default "tr"
});

export function geocodeRouter() {
  const r = express.Router();
  r.use(authRequired());

  r.post("/", async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const q = parsed.data.q;
    const country = (parsed.data.country || "tr").toLowerCase();

    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "json");
      url.searchParams.set("q", q);
      url.searchParams.set("limit", "1");
      url.searchParams.set("addressdetails", "0");
      if (country) url.searchParams.set("countrycodes", country);
      url.searchParams.set("accept-language", "tr");

      const ua = process.env.GEOCODE_USER_AGENT || "personel-servis-v1";
      const resp = await fetch(url.toString(), {
        headers: { "User-Agent": ua, Accept: "application/json" },
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        return res.status(502).json({ error: "geocode_upstream", status: resp.status, text: (txt || "").slice(0, 200) });
      }

      const arr = await resp.json().catch(() => []);
      const hit = Array.isArray(arr) && arr.length ? arr[0] : null;
      if (!hit) return res.status(404).json({ error: "notfound" });

      const lat = Number(hit.lat);
      const lng = Number(hit.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(502).json({ error: "geocode_bad_payload" });

      return res.json({ ok: true, lat, lng, displayName: String(hit.display_name || "") });
    } catch (e) {
      return res.status(500).json({ error: "geocode_error", message: String(e?.message || e) });
    }
  });

  return r;
}
