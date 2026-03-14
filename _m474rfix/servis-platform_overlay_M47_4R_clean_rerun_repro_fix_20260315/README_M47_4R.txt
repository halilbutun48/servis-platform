M47.4-R — Clean Rerun / Repro Fix

Amaç:
- driver@demo.com / demo123 panel girişini korumak
- M41/Step1 sonrası bound deviceId yüzünden patlayan eski check/harness loginlerini uyumlu hale getirmek

Bu overlay ne yapar:
- backend/scripts/_harness.js içine ortak login uyum helper'ı ekler
- driver login denemelerinde DB'deki bound deviceId varsa onu, yoksa stabil fallback deviceId'yi otomatik ekler
- eski lokal login helper kullanan bazı legacy check scriptlerini ortak helper'a bağlar

Dokunulan dosyalar:
- backend/scripts/_harness.js
- backend/scripts/m0check.js
- backend/scripts/m1check.js
- backend/scripts/m3check.js
- backend/scripts/m5check.js
- backend/scripts/m9check.js
- backend/scripts/smoke.js

Not:
- Ana ürün akışı değişmez: sürücü ana akışı Sürücü Kodu + PIN olarak kalır
- driver@demo.com / demo123 yalnızca paneli hızlı kontrol etmek için korunur
