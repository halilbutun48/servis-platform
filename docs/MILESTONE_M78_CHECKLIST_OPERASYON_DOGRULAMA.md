# MILESTONE — M78 CHECKLIST + OPERASYON DOGRULAMA

Tarih: 2026-03-28
Durum: **aktif / iskelet green**

## Scope
M78, saha kabul checklistleri ile rol bazlı operasyon doğrulama katmanını tek omurgada toplamaya başlayan ilk milestone'dur.

## M78 ana başlıkları
1. saha kabul checklistleri
2. rol bazlı operasyon doğrulama
3. kanıt / proof / kontrol omurgası
4. kabul / red / eksik / tekrar kontrol akışı
5. runbook / manifest / living bağlantısı

## Repo çıktı seti
- `backend/scripts/m78_checklist_operasyon_dogrulama_check.js`
- `tools/pack_m78_checklist_operasyon_dogrulama.ps1`
- `tools/check_m78_checklist_operasyon_dogrulama_repo_contract.ps1`
- `docs/RUNBOOK_M78_CHECKLIST_OPERASYON_DOGRULAMA.md`
- `docs/MILESTONE_M78_CHECKLIST_OPERASYON_DOGRULAMA.md`
- `docs/SAHA_KABUL_CHECKLISTLERI_V1.md`
- `docs/ROL_BAZLI_OPERASYON_DOGRULAMA_V1.md`
- `docs/KANIT_PROOF_KONTROL_OMURGASI_V1.md`
- `docs/KABUL_RED_EKSIK_TEKRAR_KONTROL_AKISI_V1.md`

## Kanonik komut
- `tools\pack_m78_checklist_operasyon_dogrulama.ps1 -RepoRoot D:\servis-platform`

## Green yorumu
M78 tamam sayılması için tek başına ağır ürün geliştirmesi gerekmez.
Bu turda doğru hedef; en küçük ama doğru checklist / operasyon doğrulama iskeletinin pack/check/manifest/living düzeyinde resmi hale gelmesidir.
