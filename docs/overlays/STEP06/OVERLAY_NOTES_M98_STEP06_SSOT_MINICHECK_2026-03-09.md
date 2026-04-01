# OVERLAY_NOTES_M98_STEP06_SSOT_MINICHECK_2026-03-09

> Tarihsel not (2026-04-01): Bu dosya Step 0.6 tarihsel overlay geçmişidir. Güncel aktif davranış için ilgili SSOT belgeleri baz alınır.


Amaç:
- Step 0.6’yı yalnızca manuel doğrulanmış not olmaktan çıkarıp resmi repo akışına bağlamak
- Ana M41 pack’i bozmadan ayrı bir stabil mini-check katmanı eklemek

Bu overlay ile gelenler:
1. `docs/CHECKLIST_SSOT.md` ← `tools/CHECKLIST_SSOT.md` ile hizalandı
2. `docs/PRIMER_SSOT.md` güncellendi
3. `docs/STARTPACK_V1.md` güncellendi
4. `tools/PRIMER_SNAPSHOT.md` güncellendi
5. `backend/scripts/step06_stabil_check.js` eklendi
6. `tools/check_step06_repo_contract.ps1` eklendi
7. `tools/pack_step06_stabil.ps1` eklendi

Doğrulama modeli:
- Önce `tools/pack.ps1 -To 41`
- Sonra Step 0.6 runtime mini-check
- Sonra UI/repo contract smoke

Böylece Step 0.6 artık:
- ana M41 regresyonu şişirmeden
- M42 gibi ayrı doğrulanabilen
- SSOT’ta resmi yeri olan
bir katman haline gelir.