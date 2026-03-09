# STARTPACK_V1 — SERVIS-PLATFORM (PERSONEL SERVİS V1/V2)

Tarih: 2026-03-09  
Timezone: Europe/Istanbul

Bu dosya repo için kısa çalışma runbook’udur.

## 1) GOLDEN RULES
1. Ana referans **M41 PACK PASS**’tir.  
2. M42 optional ayrı doğrulanır.  
3. Step 0.6 stabil ekler ayrı mini-check ile doğrulanır.  
4. API / DB / UI / flow değişirse aynı değişiklikte docs güncellenir.  
5. Değişiklikler mümkünse tek seferde **overlay (zip)** paket olarak taşınır.

## 2) Kanonik komutlar
- Ana regresyon: `tools\pack.ps1 -To 41`
- Optional check-in: `tools\pack_m42_optional.ps1`
- Step 0.6 stabil ekler: `tools\pack_step06_stabil.ps1`

## 3) Step 0.6 neden ayrı?
Bu işler stabil çalışıyor ama ana M41 regresyonunu gereksiz yere genişletmemek için ayrı tutuluyor.

Kapsam:
- capacity / room pool / auto-split
- split parent cleanup
- school parent invite restore
- shift preview external navigation
- company list click details

## 4) Step 0.6 doğrulama katmanları
### Runtime
- `backend/scripts/step06_stabil_check.js`
- room pool summary + auto-split approve
- school parent invite create/info/accept

### Repo contract
- `tools/check_step06_repo_contract.ps1`
- external nav UI/utility doğrulamaları
- company click details doğrulamaları
- school parent link/public accept doğrulamaları
- split root cleanup filtre doğrulamaları

## 5) SSOT dosyaları
- `tools/CHECKLIST_SSOT.md`
- `docs/CHECKLIST_SSOT.md`
- `docs/PRIMER_SSOT.md`
- `docs/STARTPACK_V1.md`
- `tools/PRIMER_SNAPSHOT.md`
- `docs/overlays/INDEX.md`
- `docs/overlays/STEP06/README.md`

## 6) Kısa debug notları
- `docker logs --tail 200 personel_api`
- gerekirse `personel_redis`
- WS invalidate için aynı anda en az 2 panel açık tutulur
- UI tarafı için repo contract smoke, backend tarafı için runtime mini-check kullanılır