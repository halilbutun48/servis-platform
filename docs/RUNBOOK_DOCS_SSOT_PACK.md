# RUNBOOK — Docs / SSOT Pack

Amaç: Runbook + checklist + registry + primer + tools readme setini **tek çatı** altında doğrulamak.

## Kanonik komut
- `tools\pack_docs_ssot.ps1 -RepoRoot D:\servis-platform`

## Neden ayrı bir pack var?
- Runbook ile checklist aynı amaca hizmet etmez.
- Ama aynı ürün gerçeğini anlattıkları için drift riski yüksektir.
- Bu yüzden tek dosyada eritmek yerine aynı pack altında birlikte doğrulanırlar.

## Pack bileşenleri
- `tools/check_docs_ssot_repo_contract.ps1`
- `backend/scripts/docs_ssot_pack_check.js`
- `tools/milestone_pack_manifest.json`

## Kontrol edilen ana bağlar
- master pack komutu
- docs / ssot pack komutu
- `M59 -> M65` green taban dili
- `M66` fonksiyonel / tekrar test açık dili
- `docs/CHECKLIST_SSOT.md` ile `tools/CHECKLIST_SSOT.md` aynalaması
- runbook / checklist / registry / primer / backlog / tools readme varlığı

## Kural
- Runbook + checklist aynı pack içinde doğrulanır.
- Ama tek dosyada birleştirilmez.
- Kanonik bağ listesi `tools/milestone_pack_manifest.json` içinde tutulur.
