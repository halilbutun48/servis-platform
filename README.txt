OVERLAY — Fix: consentGate exports + Consent model (unblocks M39 pack)

Fixes crash:
- routes/kvkk.js imports: upsertConsent, revokeConsent, CONSENT_DOCS
- routes/parent.js and routes/gps.js import: requireConsent, CONSENT_DOCS
Previous consentGate.js exported only consentGate → server crashed at startup.

Also ensures Prisma model exists:
- Adds model Consent + User.consents relation (if missing).

Apply:
1) Expand-Archive -Force .\OVERLAY_M39_FIX_CONSENTGATE_EXPORTS_AND_SCHEMA_2026-03-04.zip .
2) .\tools\pack.ps1 -To 39
