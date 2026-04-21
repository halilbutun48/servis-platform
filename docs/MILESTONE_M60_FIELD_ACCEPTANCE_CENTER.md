<!-- REPO_CONTRACT_MARKER milestone=M60 slug=field-acceptance-center -->

# MILESTONE — M60 SAHA ACCEPTANCE MERKEZI

Tarih: 2026-03-19
Durum: **acik / resmi green degil**

## Scope
M60, saha testinden once acceptance kararini sistem icine alan milestone'dur.
Amac, saha uygunlugu kararini dokuman disindan cikarip urun icine tasimaktir.

## M60 ana basliklari
1. pilot test oturumu kaydi
2. acceptance checklist
3. GO / LIMITED_GO / NO_GO karar secenekleri
4. cihaz / build test ozeti
5. kanit ve not alani
6. super admin acceptance merkezi paneli

## Repo cikti seti
- `backend/scripts/m60_field_acceptance_center_check.js`
- `backend/src/ops/fieldAcceptanceManifest.js`
- `backend/src/ops/fieldAcceptanceState.js`
- `backend/src/routes/fieldAcceptance.js`
- `web/src/panels/superadmin/FieldAcceptanceCenter.jsx`
- `tools/pack_m60_field_acceptance_center.ps1`
- `tools/check_m60_field_acceptance_center_repo_contract.ps1`
- `docs/RUNBOOK_M60_FIELD_ACCEPTANCE_CENTER.md`
- `docs/MILESTONE_M60_FIELD_ACCEPTANCE_CENTER.md`

## Kanonik komut
- `tools\pack_m60_field_acceptance_center.ps1 -RepoRoot D:\servis-platform`

## Green yorumu
M60 tamam sayilmasi icin backend manifest / route / web paneli ve SSOT birlikte dogrulanmalidir.
Tek bir dokuman veya tek bir endpoint eklenmis olmasi yeterli degildir.

## Canli session modeli
M60 artik session-template iskeleti degil, tek current session kaydi uzerinden calisir.
Bu kayit:
- yaratilir
- yuklenir
- kaydedilir
- kararini persist eder
- checklist maddesi status gunceller

Panel, sahaya cikmadan once karar ve checklist bilgisini ayni ekranda toplamayi hedefler.
