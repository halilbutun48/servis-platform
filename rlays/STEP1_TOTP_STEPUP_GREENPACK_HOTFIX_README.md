# STEP1 TOTP STEP-UP — GreenPack Hotfix

Amaç:
- M41 ana pack'in TOTP step-up yüzünden bozulmasını önlemek
- gerçek TOTP davranışını Step1 runtime check içinde bypass'sız doğrulamak

Yapılanlar:
- `requireStepUp*` için non-prod `x-greenpack=1` bypass eklendi
- `_harness.js` içine `includeGreenpack: false` desteği eklendi
- `step1_totp_stepup_check.js` tüm TOTP isteklerini bypass'sız koşturacak şekilde güncellendi
