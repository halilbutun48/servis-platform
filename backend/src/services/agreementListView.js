export function buildAgreementListItemsWithCommercialBackbone(items, commercialBackboneByAgreementId) {
  return items.map((item) => ({
    ...item,
    commercialBackbone: commercialBackboneByAgreementId[Number(item.id)] || null,
  }));
}
