function monthFromDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getUTCMonth() + 1;
}

function monthFromTemplateName(value) {
  const name = String(value || "").toUpperCase();
  if (name.includes("JANUARY") || name.includes("OCAK")) return 1;
  if (name.includes("FEBRUARY") || name.includes("ŞUBAT") || name.includes("SUBAT")) return 2;
  if (name.includes("MARCH") || name.includes("MART")) return 3;
  if (name.includes("APRIL") || name.includes("NİSAN") || name.includes("NISAN")) return 4;
  if (name.includes("MAY") || name.includes("MAYIS")) return 5;
  if (name.includes("JUNE") || name.includes("HAZİRAN") || name.includes("HAZIRAN")) return 6;
  if (name.includes("JULY") || name.includes("TEMMUZ")) return 7;
  if (name.includes("AUGUST") || name.includes("AĞUSTOS") || name.includes("AGUSTOS")) return 8;
  if (name.includes("SEPTEMBER") || name.includes("EYLÜL") || name.includes("EYLUL")) return 9;
  if (name.includes("OCTOBER") || name.includes("EKİM") || name.includes("EKIM")) return 10;
  if (name.includes("NOVEMBER") || name.includes("KASIM")) return 11;
  if (name.includes("DECEMBER") || name.includes("ARALIK")) return 12;
  return null;
}

export function getReadableRouteTemplateLabel(template = {}) {
  const month = monthFromTemplateName(template.name);
  const monthLabels = {
    1: "Ocak",
    2: "Şubat",
    3: "Mart",
    4: "Nisan",
    5: "Mayıs",
    6: "Haziran",
    7: "Temmuz",
    8: "Ağustos",
    9: "Eylül",
    10: "Ekim",
    11: "Kasım",
    12: "Aralık",
  };
  return month ? `${monthLabels[month]} dönem rota planı` : "Kayıtlı rota planı";
}

export function getPreferredRouteTemplateId(templates = [], shiftStartAt = null) {
  const shiftMonth = monthFromDate(shiftStartAt);
  if (!shiftMonth) return null;
  const match = (Array.isArray(templates) ? templates : []).find((template) => (
    Number.isSafeInteger(Number(template?.id))
    && monthFromTemplateName(template?.name) === shiftMonth
  ));
  return match ? Number(match.id) : null;
}
