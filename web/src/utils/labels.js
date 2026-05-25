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

function firstText(...values) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function readPersonFields(candidate) {
  if (!candidate) return "";
  if (typeof candidate === "string") return candidate.trim();
  if (typeof candidate !== "object") return "";
  return firstText(
    candidate.personLabel,
    candidate.fullName,
    candidate.name,
    candidate.label,
    candidate.passengerName,
    candidate.riderName,
  );
}

export function resolvePersonDisplayLabel(...inputs) {
  let fallback = "Kişi bilgisi yok";
  if (inputs.length > 0 && typeof inputs[inputs.length - 1] === "string") {
    fallback = firstText(inputs.pop()) || fallback;
  }

  for (const input of inputs) {
    if (typeof input === "string") {
      const text = input.trim();
      if (text) return text;
      continue;
    }
    if (!input || typeof input !== "object") continue;

    const nested = firstText(
      readPersonFields(input),
      readPersonFields(input.personel),
      readPersonFields(input.personnel),
      readPersonFields(input.person),
      readPersonFields(input.student),
      readPersonFields(input.employee),
    );
    if (nested) return nested;
  }

  return fallback;
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
