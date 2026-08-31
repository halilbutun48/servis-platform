# Role, context and tenant model

Authentication role and user-facing context are different concepts. In particular, `SCHOOL` and `ORGANIZATION` are CompanyKind values represented by the backend `COMPANY` role; they are not backend auth roles.

## Role matrix

| Auth role | User-facing name | Primary context | Boundary |
|---|---|---|---|
| `SUPER_ADMIN` | Süper Yönetici | Platform/operator | Platform-scoped administration; sensitive operations remain approval/audit controlled |
| `COMPANY` | Hizmet Alan Firma | Company tenant | Company-owned planning, budget and service-cost surfaces |
| `ROOM` | Turizm/Taşımacılık Firması | Room tenant | Commercial, offer, route, shift, profitability and operation surfaces |
| `DRIVER` | Sürücü | Assigned operation | Assigned route/shift and field evidence |
| `PERSONEL` | Personel | Linked personnel context | Authorized personnel/boarding context |
| `PARENT` | Veli | Authorized parent/child context | Parent-child access only through the canonical relationship |

Contextual labels:

- `AUTH_ROLE=COMPANY + CompanyKind=SCHOOL` → **Okul**
- `AUTH_ROLE=COMPANY + CompanyKind=ORGANIZATION` → **Organizasyon**

There is no `SCHOOL` or `ORGANIZATION` enum value in the backend `Role` auth contract. The source owner is `backend/prisma/schema/identity.prisma`; the School/Organization context owner is in tenant and organization routes.

## Tenant and authorization flow

```text
authenticated session
  -> auth role
  -> CompanyKind/context where applicable
  -> tenant/company/room ownership
  -> route-specific authorization
  -> audit and approval boundary for sensitive writes
```

Canonical owners include `backend/src/auth/middleware.js`, `backend/src/routes/auth.js`, `backend/src/routes/me.js`, route-level tenant filters, and `backend/src/routes/schoolParentInvites.js` / `backend/src/routes/parent.js` for School → Parent access.

Allowed examples:

- A Company user reads its own budget/service-cost scope.
- A Room user reads its authorized agreement, shift, route, profitability and operation scope.
- A School CompanyKind user manages the existing School parent-invite/access flow.
- A Parent reads only the child relation bound to that parent.

Forbidden examples:

- A Company request reading another tenant’s agreement, private Room actual driver/maintenance data, or Room margin.
- A School or Organization context being treated as a new backend auth role.
- A Parent resolving a child outside the authorized School/tenant relation.
- A user or Sefer Abi bypassing approval for contract, dispatch, payment, accounting, or other critical actions.

## Finance privacy

ROOM private actual driver cost, maintenance cost, internal margin, profitability, and private cost structure are not Company-visible by default. Company surfaces may consume their own budget/service-cost data and permitted external/reference or partial values. The #5 assistant follows the same scope; it explains canonical outputs and never upgrades estimates to actuals.

## School → Parent current flow

The proven current flow is:

`CompanyKind=SCHOOL` → `web/src/panels/school/ParentInvitePanel.jsx` → `backend/src/routes/schoolParentInvites.js` → `ParentInvite` / `ParentChild` → public invite acceptance → `backend/src/routes/parent.js`.

It preserves School tenant ownership, child binding, role checks, audit and cross-kind rejection. Invite tokens and personal data are intentionally absent from this document.
