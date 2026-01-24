import L from "leaflet";

function escHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

let _uid = 0;

export function makeVehicleMarkerC({ plate, status = "online", heading = 0 }) {
  const st = String(status || "online").toLowerCase(); // online|stale|offline
  const safePlate = escHtml(plate && String(plate).trim() ? plate : "ARAC");

  const h = Number(heading);
  const rot = Number.isFinite(h) ? h : 0;

  // Ayni sayfada birden fazla marker olunca <defs id> cakismasin
  _uid = (_uid + 1) % 1000000;
  const gid = `vmcBusG_${_uid}`;

  const html = `
    <div class="vmc vmc--${st}">
      <div class="vmc-label">
        <span class="vmc-dot" aria-hidden="true"></span>
        <span class="vmc-plate">${safePlate}</span>
        <span class="vmc-pill">
          <span class="vmc-pillDot" aria-hidden="true"></span>
          ${st.toUpperCase()}
        </span>
      </div>

      <div class="vmc-pinWrap" aria-hidden="true">
        <div class="vmc-halo"></div>
        <div class="vmc-pulse"></div>

        <div class="vmc-pin">
          <!-- heading oku (arkada doner) -->
          <div class="vmc-nav" style="transform: rotate(${rot}deg)">
            <svg class="vmc-navSvg" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2l7 20-7-4-7 4 7-20z" fill="var(--vmc-accent)" opacity="0.30"></path>
              <path d="M12 3.8l5.6 16-5.6-3.2-5.6 3.2 5.6-16z" fill="none" stroke="rgba(15,23,42,.45)" stroke-width="1"></path>
            </svg>
          </div>

          <!-- Bus / Minibus -->
          <svg class="vmc-busSvg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="var(--vmc-accent)"></stop>
                <stop offset="1" stop-color="var(--vmc-accent-dark)"></stop>
              </linearGradient>
            </defs>

            <!-- body -->
            <path
              d="M18 6h28c6 0 10 4 10 10v30c0 6-4 10-10 10H18c-6 0-10-4-10-10V16c0-6 4-10 10-10z"
              fill="url(#${gid})"
              stroke="#0f172a"
              stroke-width="2"
            ></path>

            <!-- windshield -->
            <path
              d="M18 14h28a6 6 0 0 1 6 6v12H12V20a6 6 0 0 1 6-6z"
              fill="rgba(255,255,255,.88)"
              stroke="#0f172a"
              stroke-width="2"
            ></path>

            <!-- mid line -->
            <path d="M16 34h32" stroke="rgba(15,23,42,.55)" stroke-width="2" stroke-linecap="round"></path>

            <!-- grill -->
            <path
              d="M20 42h24a4 4 0 0 1 4 4v8H16v-8a4 4 0 0 1 4-4z"
              fill="rgba(2,6,23,.06)"
              stroke="#0f172a"
              stroke-width="2"
            ></path>
            <path d="M26 46h12" stroke="#0f172a" stroke-width="2" stroke-linecap="round"></path>

            <!-- headlights -->
            <path d="M15 41h6" stroke="#0f172a" stroke-width="2" stroke-linecap="round"></path>
            <path d="M43 41h6" stroke="#0f172a" stroke-width="2" stroke-linecap="round"></path>

            <!-- wheels -->
            <circle cx="20" cy="56" r="4" fill="#0f172a"></circle>
            <circle cx="44" cy="56" r="4" fill="#0f172a"></circle>
            <circle cx="20" cy="56" r="2" fill="#ffffff" opacity="0.85"></circle>
            <circle cx="44" cy="56" r="2" fill="#ffffff" opacity="0.85"></circle>
          </svg>
        </div>

        <div class="vmc-tip"></div>
      </div>
    </div>
  `;

  return new L.DivIcon({
    className: "vmc-root",
    html,
    iconSize: [240, 96],
    iconAnchor: [28, 82],
    popupAnchor: [0, -78],
  });
}
