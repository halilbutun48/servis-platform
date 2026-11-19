/**
 * Narrow CONT-230 ownership reconciliation.
 *
 * This is intentionally not a new source-inventory generator. It records the
 * three proven route-boundary corrections so the historical acceptance ledger
 * cannot silently attribute a form marker to the wrong mounted surface.
 */

export const CONTINUATION_230_OWNERSHIP_RULES = Object.freeze({
  "ROLE/PERSONEL/my/FUNCTION/FORM_SUBMIT": Object.freeze({
    classification: "MOVED_OWNER",
    historicalRoute: "/personel/my",
    canonicalOwnerRoute: "/personel/live",
    canonicalOwnerComponent: "web/src/panels/shared/BoardingChangeRequestEntryCard.jsx",
    ownerEvidence: "MyRidePanel renders entryMode=summary and routes the supported form to /personel/live.",
  }),
  "ROLE/PERSONEL/my/FUNCTION/DATA_ENTRY": Object.freeze({
    classification: "MOVED_OWNER",
    historicalRoute: "/personel/my",
    canonicalOwnerRoute: "/personel/live",
    canonicalOwnerComponent: "web/src/panels/shared/BoardingChangeRequestEntryCard.jsx",
    ownerEvidence: "MyRidePanel renders entryMode=summary and routes the supported form to /personel/live.",
  }),
  "ROLE/ORGANIZATION/plans/FUNCTION/DATA_ENTRY": Object.freeze({
    classification: "LEGACY_OWNER_MISMATCH",
    historicalRoute: "/organization/plans",
    canonicalOwnerRoute: "/organization",
    canonicalOwnerComponent: "web/src/panels/company/GuidedPlanModal.jsx",
    ownerEvidence: "The legacy plans surface is read/review-only; supported creation is mounted in Planlama Merkezi.",
  }),
});

export const CONTINUATION_303_SCHOOL_SHIFTS_OWNERSHIP_RULES = Object.freeze({
  "ROLE/SCHOOL/shifts/FUNCTION/FORM_SUBMIT": Object.freeze({
    classification: "LEGACY_OWNER_MISMATCH",
    historicalRoute: "/school/shifts",
    canonicalOwnerRoute: "/school",
    canonicalOwnerComponent: "web/src/panels/company/GuidedPlanModal.jsx",
    ownerEvidence: "Public SCHOOL /school/shifts renders the shared shift surface with commercial lifecycle restricted; the visible Market #51 card says this account type cannot use offer/contract operations. Supported plan creation is mounted in the SCHOOL Planlama Merkezi.",
  }),
  "ROLE/SCHOOL/shifts/FUNCTION/DATA_ENTRY": Object.freeze({
    classification: "LEGACY_OWNER_MISMATCH",
    historicalRoute: "/school/shifts",
    canonicalOwnerRoute: "/school",
    canonicalOwnerComponent: "web/src/panels/company/GuidedPlanModal.jsx",
    ownerEvidence: "The current SCHOOL /school/shifts runtime has no supported form/data-entry control; its shared component is read/operation-only for SCHOOL, while the supported fields are mounted in the SCHOOL Planlama Merkezi.",
  }),
});

export const CONTINUATION_304_DRIVER_CHANGE_PIN_RULES = Object.freeze({
  "ROLE/DRIVER/change-pin/FUNCTION/DATA_READ_REFRESH": Object.freeze({
    classification: "LEGACY_FUNCTION_TYPE_MISMATCH",
    historicalRoute: "/driver/change-pin",
    canonicalOwnerRoute: "/driver/change-pin",
    canonicalOwnerComponent: "web/src/panels/driver/PinChangePanel.jsx",
    ownerEvidence: "The mounted DRIVER route exposes a PIN mutation form and validation feedback, but no independent user-triggered read/refresh action. The post-save loadMe refresh is part of the mutation lifecycle and is not a separate DATA_READ_REFRESH function.",
  }),
});

export const CONTINUATION_305_SCHOOL_AGREEMENTS_RULES = Object.freeze({
  "ROLE/SCHOOL/agreements/FUNCTION/FORM_SUBMIT": Object.freeze({
    classification: "LEGACY_FUNCTION_TYPE_MISMATCH",
    historicalRoute: "/school/agreements",
    canonicalOwnerRoute: "/school/agreements",
    canonicalOwnerComponent: "web/src/panels/company/AgreementsPanel.jsx",
    ownerEvidence: "The mounted SCHOOL agreements surface exposes list/filter/read and conditional decision actions; the Yazım tab only states the supported creation rule and does not expose a user-openable form trigger. The hidden shared AgreementWizard marker is not a SCHOOL form submit."
  }),
  "ROLE/SCHOOL/agreements/FUNCTION/DATA_ENTRY": Object.freeze({
    classification: "LEGACY_FUNCTION_TYPE_MISMATCH",
    historicalRoute: "/school/agreements",
    canonicalOwnerRoute: "/school/agreements",
    canonicalOwnerComponent: "web/src/panels/company/AgreementsPanel.jsx",
    ownerEvidence: "The current public SCHOOL route has no supported agreement data-entry form; visible inputs are filters/selection, while the shared AgreementWizard is not opened by a SCHOOL user action. Decision controls remain a separate BUTTON_ACTION contract."
  })
});

/**
 * Narrow CONT-234 finance ownership reconciliation.
 *
 * The historical marker count on FinancialOperationsPanel is not a buyer
 * finance-write acceptance. Buyer routes mount the company preview surface;
 * ROOM-only cost-entry controls live in RoomCostLedgerPanel. Buyer budget
 * lifecycle and conditional payment-declaration controls remain real product
 * surfaces and therefore stay in the effective inventory. They may move from
 * NOT_PROVEN to PASS_WITH_SCOPE when the bounded buyer budget flow is proven;
 * the complete finance contract is still required for PASS.
 */
export const CONTINUATION_234_FINANCE_OWNERSHIP_RULES = Object.freeze({
  "ROLE/COMPANY/financial-operations/FUNCTION/BUTTON_ACTION": Object.freeze({
    classification: "MIXED_OWNER_SCOPE",
    historicalRoute: "/company/financial-operations",
    canonicalOwnerRoute: "/company/financial-operations",
    canonicalOwnerComponent: "web/src/panels/shared/FinancialOperationsCompanyPreview.jsx",
    secondaryOwnerComponent: "web/src/components/CompanyInvoicePaymentPanel.jsx",
    excludedRoomOnlyComponent: "web/src/panels/shared/RoomCostLedgerPanel.jsx",
    ownerEvidence: "COMPANY buyer surface mounts budget lifecycle actions and conditionally mounts payment declaration; ROOM expense actions are not buyer controls.",
  }),
  "ROLE/COMPANY/financial-operations/FUNCTION/FORM_SUBMIT": Object.freeze({
    classification: "MIXED_OWNER_SCOPE",
    historicalRoute: "/company/financial-operations",
    canonicalOwnerRoute: "/company/financial-operations",
    canonicalOwnerComponent: "web/src/panels/shared/FinancialOperationsCompanyPreview.jsx",
    secondaryOwnerComponent: "web/src/components/CompanyInvoicePaymentPanel.jsx",
    excludedRoomOnlyComponent: "web/src/panels/shared/RoomCostLedgerPanel.jsx",
    ownerEvidence: "Buyer budget lifecycle uses explicit action buttons and payment declaration is conditional; the shared historical form marker is not a mounted buyer cost form.",
  }),
  "ROLE/COMPANY/financial-operations/FUNCTION/DATA_ENTRY": Object.freeze({
    classification: "MIXED_OWNER_SCOPE",
    historicalRoute: "/company/financial-operations",
    canonicalOwnerRoute: "/company/financial-operations",
    canonicalOwnerComponent: "web/src/panels/shared/FinancialOperationsCompanyPreview.jsx",
    secondaryOwnerComponent: "web/src/components/CompanyInvoicePaymentPanel.jsx",
    excludedRoomOnlyComponent: "web/src/panels/shared/RoomCostLedgerPanel.jsx",
    ownerEvidence: "Buyer budget inputs belong to the company preview; conditional payment-declaration inputs are separate and ROOM cost-entry inputs are not mounted for buyer routes.",
  }),
  "ROLE/SCHOOL/financial-operations/FUNCTION/BUTTON_ACTION": Object.freeze({
    classification: "MIXED_OWNER_SCOPE",
    historicalRoute: "/school/financial-operations",
    canonicalOwnerRoute: "/school/financial-operations",
    canonicalOwnerComponent: "web/src/panels/shared/FinancialOperationsCompanyPreview.jsx",
    secondaryOwnerComponent: "web/src/components/CompanyInvoicePaymentPanel.jsx",
    excludedRoomOnlyComponent: "web/src/panels/shared/RoomCostLedgerPanel.jsx",
    ownerEvidence: "SCHOOL is a buyer-kind company view; its budget lifecycle is supported, while ROOM expense/collection/internal-margin actions remain outside the tenant boundary.",
  }),
  "ROLE/SCHOOL/financial-operations/FUNCTION/FORM_SUBMIT": Object.freeze({
    classification: "MIXED_OWNER_SCOPE",
    historicalRoute: "/school/financial-operations",
    canonicalOwnerRoute: "/school/financial-operations",
    canonicalOwnerComponent: "web/src/panels/shared/FinancialOperationsCompanyPreview.jsx",
    secondaryOwnerComponent: "web/src/components/CompanyInvoicePaymentPanel.jsx",
    excludedRoomOnlyComponent: "web/src/panels/shared/RoomCostLedgerPanel.jsx",
    ownerEvidence: "SCHOOL buyer acceptance must follow its supported budget/payment-declaration contract; a shared historical onSubmit marker does not prove a SCHOOL expense form.",
  }),
  "ROLE/SCHOOL/financial-operations/FUNCTION/DATA_ENTRY": Object.freeze({
    classification: "MIXED_OWNER_SCOPE",
    historicalRoute: "/school/financial-operations",
    canonicalOwnerRoute: "/school/financial-operations",
    canonicalOwnerComponent: "web/src/panels/shared/FinancialOperationsCompanyPreview.jsx",
    secondaryOwnerComponent: "web/src/components/CompanyInvoicePaymentPanel.jsx",
    excludedRoomOnlyComponent: "web/src/panels/shared/RoomCostLedgerPanel.jsx",
    ownerEvidence: "SCHOOL budget inputs are buyer-scoped; ROOM cost, collection approval and internal profitability inputs are not granted to the school tenant.",
  }),
  "ROLE/ORGANIZATION/financial-operations/FUNCTION/BUTTON_ACTION": Object.freeze({
    classification: "MIXED_OWNER_SCOPE",
    historicalRoute: "/organization/financial-operations",
    canonicalOwnerRoute: "/organization/financial-operations",
    canonicalOwnerComponent: "web/src/panels/shared/FinancialOperationsCompanyPreview.jsx",
    secondaryOwnerComponent: "web/src/components/CompanyInvoicePaymentPanel.jsx",
    excludedRoomOnlyComponent: "web/src/panels/shared/RoomCostLedgerPanel.jsx",
    ownerEvidence: "ORGANIZATION resolves through company-kind buyer rendering; budget lifecycle actions are supported, while ROOM-only expense controls are excluded by role scope.",
  }),
  "ROLE/ORGANIZATION/financial-operations/FUNCTION/FORM_SUBMIT": Object.freeze({
    classification: "MIXED_OWNER_SCOPE",
    historicalRoute: "/organization/financial-operations",
    canonicalOwnerRoute: "/organization/financial-operations",
    canonicalOwnerComponent: "web/src/panels/shared/FinancialOperationsCompanyPreview.jsx",
    secondaryOwnerComponent: "web/src/components/CompanyInvoicePaymentPanel.jsx",
    excludedRoomOnlyComponent: "web/src/panels/shared/RoomCostLedgerPanel.jsx",
    ownerEvidence: "ORGANIZATION buyer writes, if supported, belong to the budget/payment-declaration owner; the historical shared form marker is not a ROOM expense submit owner.",
  }),
  "ROLE/ORGANIZATION/financial-operations/FUNCTION/DATA_ENTRY": Object.freeze({
    classification: "MIXED_OWNER_SCOPE",
    historicalRoute: "/organization/financial-operations",
    canonicalOwnerRoute: "/organization/financial-operations",
    canonicalOwnerComponent: "web/src/panels/shared/FinancialOperationsCompanyPreview.jsx",
    secondaryOwnerComponent: "web/src/components/CompanyInvoicePaymentPanel.jsx",
    excludedRoomOnlyComponent: "web/src/panels/shared/RoomCostLedgerPanel.jsx",
    ownerEvidence: "ORGANIZATION buyer budget inputs are distinct from ROOM expense inputs; remaining debt and invoice/payment evidence stay read-only or conditionally authorized.",
  }),
});

export const CONTINUATION_230_HISTORICAL_COUNTS = Object.freeze({
  total: 644,
  pass: 586,
  passWithScope: 17,
  notProven: 41,
  open: 58,
});

export const CONTINUATION_230_EFFECTIVE_COUNTS = Object.freeze({
  total: 641,
  pass: 586,
  passWithScope: 17,
  notProven: 38,
  open: 55,
});

export const CONTINUATION_230_ROUTE_COUNTS = Object.freeze({
  total: 95,
  fullyAccepted: 60,
  passWithScope: 4,
  notProven: 31,
  open: 35,
});

export function getCont230OwnershipRule(id) {
  return CONTINUATION_230_OWNERSHIP_RULES[String(id || "")] || null;
}

export function getCont303SchoolShiftsOwnershipRule(id) {
  return CONTINUATION_303_SCHOOL_SHIFTS_OWNERSHIP_RULES[String(id || "")] || null;
}

export function getCont304DriverChangePinRule(id) {
  return CONTINUATION_304_DRIVER_CHANGE_PIN_RULES[String(id || "")] || null;
}

export function getCont305SchoolAgreementsRule(id) {
  return CONTINUATION_305_SCHOOL_AGREEMENTS_RULES[String(id || "")] || null;
}

export function getCont234FinanceOwnershipRule(id) {
  return CONTINUATION_234_FINANCE_OWNERSHIP_RULES[String(id || "")] || null;
}

export function isExcludedFromEffectiveInventory(id) {
  return Boolean(getCont230OwnershipRule(id) || getCont303SchoolShiftsOwnershipRule(id) || getCont304DriverChangePinRule(id) || getCont305SchoolAgreementsRule(id));
}
