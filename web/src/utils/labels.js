// web/src/utils/labels.js

export function isSchool(me) {
  return me?.companyKind === "SCHOOL";
}

export function isOrganization(me) {
  return me?.companyKind === "ORGANIZATION";
}

export function personLabel(me) {
  if (isSchool(me)) return "Öğrenci";
  if (isOrganization(me)) return "Konum";
  return "Personel";
}

export function peopleLabel(me) {
  if (isSchool(me)) return "Öğrenciler";
  if (isOrganization(me)) return "Konumlar";
  return "Personel";
}

export function hubLabelForKind(kind) {
  const normalized = String(kind || "").toUpperCase();
  if (normalized === "SCHOOL") return "Okul Konumu";
  if (normalized === "ORGANIZATION") return "Toplanma Konumu";
  return "Şirket Konumu";
}

export function hubLabel(me) {
  return hubLabelForKind(me?.companyKind);
}
