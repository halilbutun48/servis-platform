function formatMoney(value, currencyCode = "TRY") {
  if (value === null || value === undefined || value === "") return "Hesaplanamadı";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "Hesaplanamadı";
  const suffix = currencyCode === "TRY" ? " ₺" : currencyCode ? ` ${currencyCode}` : "";
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(numeric / 100)}${suffix}`;
}

function humanizeReason(value) {
  return String(value || "")
    .replace(/current route metadata/gi, "güncel rota bilgisi")
    .replace(/route snapshot input hash/gi, "rota doğrulama bilgisi")
    .replace(/tariff effective date/gi, "tarife geçerlilik tarihi")
    .trim();
}

export function routePassageForDisplay({ baseline = null, result = null } = {}) {
  const selectedVehicleCount = result?.scenario?.requiredVehicleCount;
  const vehiclePassage = selectedVehicleCount !== null && selectedVehicleCount !== undefined
    ? result?.routePassage?.vehicleByCount?.[String(selectedVehicleCount)]
    : null;
  return vehiclePassage || result?.routePassage?.scenario || baseline?.routeEvidence?.baseline?.passage || null;
}

export function routePassageLabel(passage, currencyCode = "TRY") {
  if (!passage) return null;
  const passageBasis = String(passage.passageBasis || "").toUpperCase();
  const isPlanned = passageBasis === "PLANNED_ROUTE_TARIFF" || passageBasis === "PER_VEHICLE_PLANNED_ROUTE_TARIFF";
  const label = passageBasis === "PER_VEHICLE_PLANNED_ROUTE_TARIFF"
    ? "Seçili araç planının geçiş ücretleri"
    : isPlanned ? "Planlanan geçiş ücretleri" : "Geçiş ücretleri";
  const actualNote = isPlanned
    ? " Gerçekleşen HGS kaydı değildir; gerçekleşen durum GPS/HGS veya gider kaydıyla ayrıca doğrulanır."
    : "";
  const discovery = passage.automaticDiscovery || null;
  if (String(passage.status || "").toUpperCase() !== "PROVEN"
    && discovery?.discoveryStatus === "PAID_CORRIDOR_DETECTED"
    && discovery?.corridor) {
    const corridor = discovery.corridor;
    const missing = passage.missingReasons?.find((reason) => /HGS sınıfı/i.test(String(reason)))
      || "HGS sınıfı veya resmi tarife bağlamı doğrulanmadı.";
    return `${corridor.entryStation} → ${corridor.exitStation} ücretli koridoru tespit edildi; geçiş ücreti eklenmedi. ${missing}`;
  }
  if (String(passage.status || "").toUpperCase() === "PROVEN" && passage.totalMinor !== null && passage.totalMinor !== undefined) {
    return `${label}: ${formatMoney(passage.totalMinor, currencyCode)}.${actualNote}`;
  }
  const reason = passage.missingReasons?.[0] ? ` ${humanizeReason(passage.missingReasons[0])}` : "";
  return `${label} doğrulanmadı; rota maliyetine eklenmedi. Gerçekleşen HGS için GPS/HGS veya gider kaydı gerekir.${reason}`;
}
