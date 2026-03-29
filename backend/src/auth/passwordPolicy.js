const SIMPLE_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password1",
  "password123",
  "qwerty123",
  "qwerty1234",
  "vardis2026",
  "demo123",
]);

function hasLower(v) { return /[a-zçğıöşü]/.test(String(v || "")); }
function hasUpper(v) { return /[A-ZÇĞİÖŞÜ]/.test(String(v || "")); }
function hasDigit(v) { return /\d/.test(String(v || "")); }
function hasSpecial(v) { return /[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]/.test(String(v || "")); }

function normalizePieces(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9çğıöşü]/gi, " ")
    .split(/\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 3);
}

export function getPasswordPolicySummary() {
  return {
    minLength: 10,
    minKindCount: 3,
    kinds: ["kucuk_harf", "buyuk_harf", "rakam", "ozel_karakter"],
    helpText: "Yeni şifre en az 10 karakter olmalı. Büyük harf, küçük harf, rakam ve özel karakterden en az 3 tür içermelidir.",
  };
}

export function validatePasswordPolicy(newPassword, context = {}) {
  const value = String(newPassword || "");
  const errors = [];
  const summary = getPasswordPolicySummary();

  if (value.length < summary.minLength) {
    errors.push(`Yeni şifre en az ${summary.minLength} karakter olmalı.`);
  }

  const kindCount = [hasLower(value), hasUpper(value), hasDigit(value), hasSpecial(value)].filter(Boolean).length;
  if (kindCount < summary.minKindCount) {
    errors.push("Yeni şifre büyük harf, küçük harf, rakam ve özel karakterden en az 3 tür içermelidir.");
  }

  const lowered = value.toLowerCase();
  if (SIMPLE_PASSWORDS.has(lowered)) {
    errors.push("Yeni şifre çok kolay tahmin ediliyor. Daha güçlü bir şifre seçin.");
  }

  const pieces = [
    ...normalizePieces(context?.email),
    ...normalizePieces(context?.fullName),
  ];
  if (pieces.some((piece) => piece && lowered.includes(piece))) {
    errors.push("Yeni şifre e-posta veya ad bilgilerini içermemelidir.");
  }

  return { ok: errors.length === 0, errors, summary };
}
