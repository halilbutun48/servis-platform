// web/src/utils/labels.js

export function isSchool(me) {
  return me?.companyKind === "SCHOOL";
}

// Singular noun used in headings and steps.
export function personLabel(me) {
  return isSchool(me) ? "Öğrenci" : "Personel";
}

// Plural noun used in list contexts.
export function peopleLabel(me) {
  return isSchool(me) ? "Öğrenciler" : "Personel";
}
