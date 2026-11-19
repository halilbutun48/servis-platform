const VEHICLE_CATEGORIES = new Set([
  "FUEL", "ADBLUE", "MAINTENANCE", "REPAIR", "TIRE_RIM", "MTV_TAX", "TRAFFIC_INSURANCE", "CASCO",
  "INSPECTION", "EMISSION_TEST", "MANDATORY_DOCUMENT", "LOAN_PRINCIPAL", "FINANCE_CHARGE", "LEASING",
  "RENT", "DEPRECIATION", "CLEANING", "ROADSIDE_ASSISTANCE", "GPS", "CAMERA", "VEHICLE_EQUIPMENT",
  "OTHER_VEHICLE",
]);

const DRIVER_CATEGORIES = new Set([
  "EMPLOYER_MONTHLY_COST", "BASE_SALARY", "BENEFIT", "OVERTIME", "PER_DIEM", "MEAL_ALLOWANCE", "SOCIAL_COST", "OTHER_DRIVER",
]);

const DIRECT_TRIP_CATEGORIES = new Set(["SERVICE_DIRECT", "ROUTE_FEE"]);
const TRIP_OR_VEHICLE_CATEGORIES = new Set(["HGS_TOLL", "PARKING"]);

function hasRelationId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0;
}

function hasShiftEvidence(entry = {}) {
  return Boolean(
    hasRelationId(entry.shiftId)
      || (Array.isArray(entry.allocationLines) && entry.allocationLines.some((line) => (
        hasRelationId(line?.shiftId)
        || String(line?.targetKind || "").toUpperCase() === "SHIFT"
        || (Array.isArray(line?.targets) && line.targets.some((target) => String(target?.type || "").toUpperCase() === "SHIFT"))
      ))),
  );
}

function ownershipDetail(kind, entry = {}) {
  switch (kind) {
    case "DIRECT_TRIP":
      return "Doğrudan sefer ilişkisi canonical kayıtta bulunuyor; dağıtım payı yalnız doğrulanmış hesaplamadan okunur.";
    case "VEHICLE":
      return hasShiftEvidence(entry)
        ? "Bu gider araç ve dönem sahibiyle kaydedildi; doğrulanmış kullanım payları servis maliyetlerine dahil edildi."
        : "Bu gider araç ve dönem sahibiyle kaydedildi. Servis maliyet payı henüz doğrulanmadı.";
    case "DRIVER":
      return hasShiftEvidence(entry)
        ? "Bu gider sürücü ve dönem sahibiyle kaydedildi; doğrulanmış kullanım payları servis maliyetlerine dahil edildi."
        : "Bu gider sürücü ve dönem sahibiyle kaydedildi. Servis maliyet payı henüz doğrulanmadı.";
    default:
      return "Bu gider firma genelinde kaydedildi; belirli bir araca veya vardiyaya otomatik olarak yüklenmedi.";
  }
}

export function resolveExpenseOwnership(entry = {}) {
  const categoryKey = String(entry.categoryKey || entry.category?.key || "").toUpperCase();
  const directTrip = hasShiftEvidence(entry);
  let kind = "COMPANY";

  if (directTrip && (DIRECT_TRIP_CATEGORIES.has(categoryKey) || TRIP_OR_VEHICLE_CATEGORIES.has(categoryKey))) {
    kind = "DIRECT_TRIP";
  } else if (VEHICLE_CATEGORIES.has(categoryKey)) {
    kind = "VEHICLE";
  } else if (DRIVER_CATEGORIES.has(categoryKey)) {
    kind = "DRIVER";
  } else if (hasRelationId(entry.vehicleId)) {
    kind = "VEHICLE";
  } else if (hasRelationId(entry.driverId)) {
    kind = "DRIVER";
  }

  const labels = {
    DIRECT_TRIP: "Doğrudan sefer gideri kaydedildi",
    VEHICLE: "Araç gideri kaydedildi",
    DRIVER: "Sürücü gideri kaydedildi",
    COMPANY: "Firma gideri kaydedildi",
  };

  return {
    kind,
    label: labels[kind],
    detail: ownershipDetail(kind, entry),
    hasShiftEvidence: directTrip,
    allocationLabel: directTrip ? "Vardiya/sefer bağlantısı doğrulandı" : "Servis payı ayrıca doğrulanmadı",
  };
}

export { hasShiftEvidence };
