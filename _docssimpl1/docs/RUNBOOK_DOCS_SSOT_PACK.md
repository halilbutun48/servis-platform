# RUNBOOK — Docs / SSOT Pack

Amaç: Runbook + checklist + registry + primer + tools readme setini **tek çatı** altında doğrulamak.

## Kanonik komut
- `tools\pack_docs_ssot.ps1 -RepoRoot D:\servis-platform`

## Bu pack neden var?
- Runbook ile checklist aynı şey değildir.
- Ama aynı ürün gerçeğini anlattıkları için birlikte drift üretmeye çok açıktırlar.
- Bu pack, belgeleri tek dosyada eritmeden aynı doğrulama çatısı altında tutar.

## Ne doğrulanır?
- `tools/check_docs_ssot_repo_contract.ps1`
- `backend/scripts/docs_ssot_pack_check.js`
- `tools/milestone_pack_manifest.json`
- `docs/CHECKLIST_SSOT.md` ve `tools/CHECKLIST_SSOT.md` aynalaması
- master pack ve docs pack komutlarının README / primer / startpack içinde görünmesi
- `M59 -> M65` green taban dili ile `M66` fonksiyonel / tekrar test açık dilinin birlikte korunması

## Temel ilke
- **Runbook + checklist** aynı ürün gerçeğini taşımalıdır.
- Bu nedenle aynı pack altında doğrulanırlar.
- Ama tek dosyada birleştirilmezler.
- Kanonik bağ listesi `tools/milestone_pack_manifest.json` içinde tutulur.

## Ne zaman çalıştırılır?
- SSOT dosyalarında marker / wording değişikliği yapıldığında
- checklist ve primer birlikte güncellendiğinde
- master pack / docs pack komut zincirinde doküman tarafı yeniden doğrulanmak istendiğinde
