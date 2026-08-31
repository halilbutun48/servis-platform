# Integration ownership map

Integration contracts are provider-independent. An external system may consume a canonical contract, but no vendor is the SeferPakt schema owner.

| Integration | Current owner | Status | Contract dimensions | Boundary |
|---|---|---|---|---|
| Accounting/ERP | `backend/src/routes/accountingExports.js`, `backend/src/finance/accountingExportContract.js`, [#14 capability evidence](../PROJECT_WIDE_GAP_AND_RELEASE_READINESS_AUDIT_01_CAPABILITY_MATRIX.json) | IMPLEMENTED_CONTRACT | EXPORT, API, PROVENANCE, IDEMPOTENCY, AUTH, AUDIT | Validated preview/package; no posting, payment or legal finalization |
| Telematics/vehicle tracking | `backend/src/telematics/providers.js`, `backend/src/routes/telematics.js` | IMPLEMENTED_PROVIDER_BOUNDARY | API, WEBHOOK, PROVENANCE, AUTH, AUDIT | Provider abstraction; production resilience belongs to #38 |
| Fuel/reference data | `backend/src/externalCost/providerRegistry.js`, `externalCostReferenceService.js` | IMPLEMENTED_PROVIDER_BOUNDARY | API, PROVENANCE, IDEMPOTENCY, AUTH, AUDIT | Reference/fallback data never becomes internal actual cost |
| Routing/OSRM | `backend/src/services/osrmRoute.js`, `backend/src/services/osrmTable.js` | IMPLEMENTED_PROVIDER_BOUNDARY | API, PROVENANCE, AUTH | Optional provider and explicit fallback/no-data behavior |
| HR/personnel | `backend/src/routes/personels.js`, `backend/src/routes/personelAccess.js` | IMPLEMENTED_INTERNAL_BOUNDARY | API, AUTH, AUDIT | Tenant and role scoped |
| School/organization systems | `backend/src/routes/schoolParentInvites.js`, `backend/src/routes/organization.js` | IMPLEMENTED_INTERNAL_BOUNDARY | API, PROVENANCE, AUTH, AUDIT | CompanyKind context; not fake backend roles |

## Contract rules

- Import, export, webhook, event and API behavior must have a named owner before implementation.
- Provenance, freshness, scope, idempotency, authentication and audit are part of an integration contract where applicable.
- Secrets and provider credentials belong to runtime configuration/secrets management, never documentation or committed fixtures.
- A future adapter may consume #6’s `ACCOUNTING_EXPORT_CONTRACT_V1`; provider-specific fields must remain adapter-owned.
- A provider outage must preserve no-data honesty or an explicitly labeled fallback; it must not fabricate a business actual.

## Future readiness

#6 is the provider-independent accounting export preparation owner. #16 indexes it. #38 owns production provider resilience, deployment secret policy and operational hardening. Vendor implementation, autonomous posting, automatic payment, and legal accounting acceptance are outside the current frontier.
