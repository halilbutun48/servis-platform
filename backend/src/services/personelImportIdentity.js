function normalizeIdentityPart(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function buildCompanyPersonelNaturalLookup({ companyId, fullName, homeAddress, homeLat, homeLng }) {
  const lookup = {
    companyId: Number(companyId),
    fullName: normalizeIdentityPart(fullName),
  };
  const address = normalizeIdentityPart(homeAddress);
  if (address) {
    lookup.homeAddress = address;
    return lookup;
  }

  if (typeof homeLat === "number" && Number.isFinite(homeLat) && typeof homeLng === "number" && Number.isFinite(homeLng)) {
    lookup.homeLat = homeLat;
    lookup.homeLng = homeLng;
  }
  return lookup;
}
