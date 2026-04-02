# MILESTONE — M80 FINAL SERT KABUL VE YUK GUVENI

Tarih: 2026-04-02  
Durum: **aktif / iskelet acik / resmi green degil**

## Scope
M80, `M58` final pilot readiness, `M60` saha kabul merkezi, `M65` launch gate, `M79` copilot acceptance ve `scale_readiness` ciktisini tek kabul kapisinda bir araya getirir.
Bu milestone yeni buyuk urun modulu acmaktan cok,
final sert kabul ve yuk guveni kararinin repo icinde resmi olarak hazirlandigini dogrular.

## M80 ana basliklari
1. final sert kabul kapisi
2. yuk guveni gorunurlugu
3. snapshot / kanit hijyeni notlari
4. OSRM opsiyonel calisma kontrati
5. resmi green oncesi son signoff dili

## Repo cikti seti
- `backend/scripts/m80_final_sert_kabul_yuk_guveni_check.js`
- `tools/pack_m80_final_sert_kabul_yuk_guveni.ps1`
- `tools/check_m80_final_sert_kabul_yuk_guveni_repo_contract.ps1`
- `docs/RUNBOOK_M80_FINAL_SERT_KABUL_YUK_GUVENI.md`
- `docs/MILESTONE_M80_FINAL_SERT_KABUL_YUK_GUVENI.md`

## Kanonik komut
- `tools\pack_m80_final_sert_kabul_yuk_guveni.ps1 -RepoRoot D:\servis-platform`

## M80 green yorumu
Bu pack'in gecmesi, **M80 kapisinin repo icinde resmi olarak acildigini** gosterir.
Bu tek basina **resmi final green** anlamina gelmez.
Resmi final green icin:
- yuk sicak noktalarinda son daraltma / gozlem,
- son kullanici / saha signoff,
- final kanit paketi hijyeni
ayrica tamamlanmalidir.
