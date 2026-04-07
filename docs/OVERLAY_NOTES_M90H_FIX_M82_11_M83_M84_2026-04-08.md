# OVERLAY NOTES — M90H fix M82.11 + M83/M84 checks

Bu dar overlay 3 somut blockerı kapatır:

- `tools/check_m82_11_payment_readonly_surface_repo_contract.ps1`
  - `docs/PRIMER_SSOT.md` içindeki yaşayan İngilizce/Türkçe wording varyasyonlarını kabul eder.
- `backend/scripts/m83_field_prep_packet_check.js`
  - eksik `includesText()` helper tanımını ekler.
- `backend/scripts/m84_field_feedback_loop_check.js`
  - eksik `includesText()` helper tanımını ekler.

Amaç: ürünü değiştirmeden repo-contract / static check kırıklarını kapatmak.
