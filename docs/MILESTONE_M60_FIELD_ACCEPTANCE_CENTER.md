# MILESTONE — M60 SAHA ACCEPTANCE MERKEZI

Tarih: 2026-03-19
Durum: **acik / resmi green degil**

## Scope
M60, saha testinden once pilot acceptance kararini sistem icine alan milestone'dur.
Amac, saha uygunlugu kararini dokuman disindan cikarip urun icine tasimaktir.

## M60 ana basliklari
1. pilot test oturumu kaydi iskeleti
2. acceptance checklist iskeleti
3. GO / LIMITED GO / NO-GO karar secenekleri
4. cihaz / build test ozeti iskeleti
5. kanit ve not alani iskeleti
6. super admin acceptance merkezi paneli iskeleti

## Repo cikti seti
- `backend/scripts/m60_field_acceptance_center_check.js`
- `backend/src/ops/fieldAcceptanceManifest.js`
- `backend/src/routes/fieldAcceptance.js`
- `mobile/src/lib/fieldAcceptance.js`
- `web/src/panels/superadmin/FieldAcceptanceCenter.jsx`
- `tools/pack_m60_field_acceptance_center.ps1`
- `tools/check_m60_field_acceptance_center_repo_contract.ps1`
- `docs/RUNBOOK_M60_FIELD_ACCEPTANCE_CENTER.md`
- `docs/MILESTONE_M60_FIELD_ACCEPTANCE_CENTER.md`

## Kanonik komut
- `tools\pack_m60_field_acceptance_center.ps1 -RepoRoot D:\servis-platform`

## Green yorumu
M60 tamam sayilmasi icin backend / mobile / web iskeleti ve SSOT birlikte dogrulanmalidir.
Tek bir dokuman veya tek bir endpoint eklenmis olmasi yeterli degildir.
