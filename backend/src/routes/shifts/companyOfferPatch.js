const COMPANY_OFFER_FIELDS = [
  "companyOfferVehicleId",
  "companyOfferAmount",
  "companyOfferNote",
];

/**
 * Build a Prisma update payload without turning an omitted optional field into
 * an implicit delete. An explicit null remains an intentional clear operation.
 */
export function buildCompanyOfferUpdateData(body = {}) {
  const data = {};
  for (const field of COMPANY_OFFER_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) data[field] = body[field];
  }
  return data;
}
