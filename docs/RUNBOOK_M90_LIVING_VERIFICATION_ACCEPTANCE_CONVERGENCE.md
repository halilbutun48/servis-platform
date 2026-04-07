# RUNBOOK — M90 LIVING VERIFICATION & ACCEPTANCE CONVERGENCE

Öncelik sırası:
1. `tools\pack.ps1 -To 89`
2. `tools\verify_living_static.ps1`
3. `tools\verify_living_runtime.ps1`

Bu blokta ilk resmi hedef, yaşayan doğrulama zincirini green'e taşımaktır.

İlk odak kırıkları:
- M13 conflict payload / check hizası
- M46 static forward-version markers
- M58 mobil acceptance metin bağımlılığı
- M65 checklist / launch gate contract marker hizası
