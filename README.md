# M33.6b Hotfix — Bulk Offer Modal validation

Fixes:
- noteCompany sent as `null` -> now always a string ("" when empty)
- amountCompany sent as `0` when blank -> now omitted unless > 0
