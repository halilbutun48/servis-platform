# M46.8 — Driver Access Hardening

> **Uyumluluk notu (M79+):** Bu M46 runbook'u art?k pilot-era exact versiyon etiketi beklemek yerine, ayn? davran???n modern Copilot y?zeyinde h?l? mevcut olup olmad???n? do?rulayan legacy compatibility referans? olarak okunmal?d?r.
> Exact `copilotVersion` eşitliği yerine davranışsal / yapısal doğrulama esastır.


Ama?: M46.7 ile a??lan **S?r?c? Kodu + PIN** giri? modelini daha dayan?kl? h?le getirmek.

## Kapsam

### M46.8-A — Login / PIN Abuse Guard
- login limiter artık `identifier` bazlıdır
- sürücü yanlış PIN denemeleri sayılır
- eşik aşılınca geçici kilit (`PIN_LOCKED`) uygulanır
- lock cevabında `cooldownSec` ve `lockedUntil` döner
- doğru girişte fail/lock durumu temizlenir

### M46.8-B — PIN Policy + Reset Hygiene
- sürücü yeni PIN için en az 6 hane şartı vardır
- sadece rakam kabul edilir
- aynı PIN tekrar kullanılamaz
- tek rakam tekrarından oluşan zayıf PIN reddedilir
- room reset-pin akışı lock/fail durumunu temizler

### M46.8-C — Auth Audit Strengthening
Audit olayları:
- `AUTH_DRIVER_PIN_LOCKED`
- `AUTH_DRIVER_PIN_RESET`
- `AUTH_DRIVER_PIN_CHANGE_FAIL`
- `AUTH_DRIVER_PIN_CHANGE_OK`
- `AUTH_LOGIN_FAIL`
- `AUTH_LOGIN_OK`
- `AUTH_LOGIN_DEVICE_MISMATCH`

### M46.8-D — Device Trust Lite
- web login artık `deviceId` gönderir
- driver login başarılıysa mevcut cihaz izi güncellenir
- bağlı cihaz uyuşmazlığında kullanıcı dostu hata döner

## Beklenen davranış
- brute-force denemesi sınırsız gidemez
- room reset sonrası sürücü yeniden giriş yapabilir
- weak PIN üretmeye çalışılırsa sürücü açık hata alır
- audit kaydı sonradan iz bırakır

## Pack akışı
1. M46.7 pack çalışır
2. Prisma sync çalışır
3. `backend/scripts/m46_8_driver_access_hardening_check.js` çalışır
4. repo contract check geçer

## Not
Bu runbook implementation içindir. Green sayılması için `tools/pack_m46_8_driver_access_hardening.ps1` PASS vermelidir.