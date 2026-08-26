// web/src/lib/markers/vehicleMarkerC.js
import L from "leaflet";
import busSvgUrl from "../../assets/bus.svg";

function escHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ✅ Icon cache: status/heading değişince icon güncellensin
const _iconCache = new Map();
const CACHE_MAX = 2000;

function cacheGet(key) {
  return _iconCache.get(key);
}

function cacheSet(key, val) {
  _iconCache.set(key, val);
  // basit limit (LRU değil ama yeterli)
  if (_iconCache.size > CACHE_MAX) {
    const firstKey = _iconCache.keys().next().value;
    if (firstKey) _iconCache.delete(firstKey);
  }
}

export function makeVehicleMarkerC({ plate, status = "online", heading = 0 }) {
  const st = String(status || "online").toLowerCase(); // online|stale|offline
  const safePlate = escHtml(plate && String(plate).trim() ? plate : "ARAC");

  const h = Number(heading);
  const rot = Number.isFinite(h) ? h : 0;

  // heading çok sık değişebileceği için bucket’layalım (10 derece)
  const rotBucket = Math.round(rot / 10) * 10;

  // ✅ Cache key: plate + status + heading bucket
  const cacheKey = `${safePlate}|${st}|${rotBucket}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const labelText = st === "online" ? "Canlı" : st === "stale" ? "Güncel değil" : st === "offline" ? "Çevrim dışı" : "Bekleniyor";

  const html = `
    <div class="vmc vmc--${st}">
      <div class="vmc-label">
        <span class="vmc-dot" aria-hidden="true"></span>
        <span class="vmc-plate">${safePlate}</span>
        <span class="vmc-pill">
          <span class="vmc-pillDot" aria-hidden="true"></span>
          ${labelText}
        </span>
      </div>

      <div class="vmc-pinWrap" aria-hidden="true">
        <div class="vmc-halo"></div>
        <div class="vmc-pulse"></div>

        <div class="vmc-pin">
          <!-- Bus / Minibus -->
          <img class="vmc-busSvg" src="${busSvgUrl}" alt="" aria-hidden="true" />
        </div>

        <div class="vmc-tip"></div>
      </div>
    </div>
  `;

  const icon = new L.DivIcon({
    className: "vmc-root",
    html,
    iconSize: [240, 96],
    iconAnchor: [28, 82],
    popupAnchor: [0, -78],
  });

  cacheSet(cacheKey, icon);
  return icon;
}
