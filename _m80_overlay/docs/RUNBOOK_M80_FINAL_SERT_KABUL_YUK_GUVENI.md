# RUNBOOK — M80 FINAL SERT KABUL VE YUK GUVENI

Tarih: 2026-04-02
Timezone: Europe/Istanbul
Durum: **aktif / iskelet green / resmi green degil**

Bu runbook, M80 ile acilan final sert kabul ve yuk guveni kapisinin ilk ve en kucuk dogru iskeletini tanimlar.

## 1) M80 amac cumlesi
M80 ile sistem su soruya tek yerden cevap vermeye hazirlanir:

**"Bu repo, mevcut urun davranisini bozmadan final kabul ve yuk guveni karari icin resmi kapisini acmis durumda mi?"**

## 2) Ilk tur kapsam
M80 ilk turda sunlari acar:
- final sert kabul kapisi
- yuk guveni gorunurlugu
- OSRM opsiyonel / fallback kontrati
- snapshot / runtime-state hijyeni notlari
- runbook / milestone / manifest / state baglari

## 3) Kapsam siniri
Bu tur bilincli olarak kucuktur.
- yeni buyuk urun modulu acmaz
- mobil saha sertlestirme acmaz
- controlled cleanup acmaz
- genis refactor / davranis degisikligi acmaz
- mevcut M79 / M78.x compatibility marker mantigini bozmaz

## 4) Ilk teslim seti
Bu ilk teslim su omurgayi koyar:
1. `tools\pack_m80_final_sert_kabul_yuk_guveni.ps1`
2. `tools\check_m80_final_sert_kabul_yuk_guveni_repo_contract.ps1`
3. `backend\scripts\m80_final_sert_kabul_yuk_guveni_check.js`
4. `docs\RUNBOOK_M80_FINAL_SERT_KABUL_YUK_GUVENI.md`
5. `docs\MILESTONE_M80_FINAL_SERT_KABUL_YUK_GUVENI.md`

## 5) Yuk guveni sicak noktalari
Ilk M80 turunda ozellikle su paneller gorunur tutulur:
- `ShiftsPanel`
- `AgreementsPanel`
- `GeoReviewPanel`
- `MapPanel`

Bu panellerdeki yuk / ilk acilis / auto-reload davranislari `backend/scripts/scale_readiness_check.js` ile birlikte yorumlanir.

## 6) OSRM notu
- OSRM kodu repoda kalir.
- `infra/osrm-data/` repo icinde beklenmez.
- Default compose modunda fallback davranis normaldir.
- `compose --profile osrm` acildiginda OSRM + solver beklentisi devreye girer.
- `GET /api/plan-builder/precheck` warning / fallback kontratini gorunur tutar.

## 7) Kanonik komut
`tools\pack_m80_final_sert_kabul_yuk_guveni.ps1 -RepoRoot D:\servis-platform`

Bu komut su iki parcayi dogrular:
- repo-contract: `tools\check_m80_final_sert_kabul_yuk_guveni_repo_contract.ps1`
- runtime/check: `backend\scripts\m80_final_sert_kabul_yuk_guveni_check.js`

## 8) Green yorumu
M80 ilk turda green sayilabilmesi icin:
- pack gecmeli
- repo-contract gecmeli
- manifest M80 kaydi gorunmeli
- state M80 aktifligini gostermeli
- scale readiness sinyali hala calisir olmali
- M80'in resmi green olmadigi notu korunmali

## 9) Resmi final green icin sonraki kosullar
Bu ilk M80 pack yalnizca kapinin acildigini gosterir.
Resmi final green icin sonraki dogru isler:
- M80.1 yuk sicak noktalarinda daraltma / sadeleme
- son kullanici / saha signoff
- final kanit paketi ve snapshot hijyeni
- gerekiyorsa kontrollu yuk gozlemi

## 10) Sonraki dogru adim
Bu iskelet green olduktan sonra siradaki dogru is:
- M80.1 altinda yuk daraltma / hot panel sadeleme calismalarina gecmek
- M81 mobil saha sertlestirmeyi ayri milestone olarak korumak
- M82 cleanup'i M80 kapanmadan one cekmemek
