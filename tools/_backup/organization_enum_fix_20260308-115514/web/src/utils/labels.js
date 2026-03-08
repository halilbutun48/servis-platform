// web/src/utils/labels.js

export function isSchool(me) {
  return me?.companyKind === "SCHOOL";
}

export function isOrganization(me) {
  return me?.companyKind === "ORGANIZATION";
}

// Singular noun used in headings and steps.
export function personLabel(me) {
  if (isSchool(me)) return "Öğrenci";
  if (isOrganization(me)) return "Lokasyon";
  return "Personel";
}

// Plural noun used in list contexts.
export function peopleLabel(me) {
  if (isSchool(me)) return "Öğrenciler";
  if (isOrganization(me)) return "Lokasyonlar";
  return "Personel";
}
