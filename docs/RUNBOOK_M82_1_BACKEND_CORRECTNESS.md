# RUNBOOK — M82.1 BACKEND CORRECTNESS KİLİDİ

Tarih: 2026-04-05

## Amaç
M82.1, backend tarafında route snapshot / preview cache / transaction / merkezi error contract correctness açıklarını kapatır.

## Kapsam
- route-preview auth check cache'den önce çalışır
- shift route preview cache exact invalidation ile temizlenir
- shift create/update/stop/template/generate/room mutation akışları route state rebuild hattına bağlıdır
- room route'ları merkezi error helper kullanır
- organization publish-shift ve child shift create akışları ilk route state'i üretir

## Temel doğrulama
1. Repo contract: `tools\check_m82_1_backend_correctness_repo_contract.ps1`
2. Guard check: `node backend/scripts/m82_1_correctness_guard_check.js`
3. Pack: `tools\pack_m82_1_backend_correctness.ps1`
4. Master/living pack: `tools\pack.ps1 -To 82`

## Kabul işaretleri
- `M82.1 CORRECTNESS GUARD CHECK PASS`
- `M82.1 BACKEND CORRECTNESS PACK PASS OK`
- preview auth sırası bozulmaz
- room mutation akışları preview cache'i stale bırakmaz
- suggestion accept route state rebuild eder

## Not
Bu adım M82.2+ için temel correctness kilididir; web/mobil istemci kontrat sertleştirmesi bunun üstüne inşa edilir.
