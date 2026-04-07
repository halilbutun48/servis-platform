<!-- REPO_CONTRACT_MARKER milestone=M59 slug=observability-field-diagnostics -->

# RUNBOOK — M59 GOZLEMLEME + SAHA TESHis

Tarih: 2026-03-19
Timezone: Europe/Istanbul
Durum: **resmi green**

Bu runbook, saha testine cikmadan once sistemin saglik durumunu gorunur hale getirmek icin acilan **M59** milestone'unun kapsam sinirini tanimlar.

## 1) M59 amac cumlesi
M59 ile sistem su soruya tek yerde cevap vermelidir:

**"Hangi surucu, hangi cihaz, hangi build ve hangi vardiya riskli; neden riskli?"**

## 2) Kapsam
M59 su basliklari acar:
- mobil saglik olaylari iskeleti
- cihaz saglik ozeti iskeleti
- GPS guven skoru iskeleti
- sorun bildir iskeleti
- room / super admin gozlem paneli iskeleti
- vardiya olay akisi iskeleti

## 3) Kapsam siniri
M59, saha acceptance karari vermez.
M59, ticari teklif / pazarlik akisini buyutmez.
M59, copilot dogal cevap katmanini acmaz.

Bunlar sirayla daha sonra:
- `M60 — Saha Acceptance Merkezi`
- `M62 — Ticari Omurga Guclendirme`
- `M64 — Dogal Copilot Katmani`

a altina alinacaktir.

## 4) M59.1 ilk teslim paketi
Ilk teslim su 4 parcayi acik bir repo iskeleti olarak koyar:
1. backend gozlemleme manifest ve health summary route iskeleti
2. mobile health event types helper iskeleti
3. web super admin gozlem paneli iskeleti
4. SSOT / runbook / pack / check disiplini

## 5) Veri sinyalleri
M59 kapsaminda hedeflenen temel sinyaller:
- login success / failure
- pin degisti
- GPS izin durumu degisti
- GPS publish success / failure
- offline oldu / online geri geldi
- session failure
- KVKK blocking
- sorun bildir acildi

## 6) UI odagi
Web tarafinda hedeflenen ilk gorunum:
- son sync / son GPS gorunurlugu
- mobil health event turleri
- risk etiketi / GPS guven skoru karti
- room / super admin icin sade bir gozlem ozeti

## 7) Kanonik komut
`tools\pack_m59_observability_field_diagnostics.ps1 -RepoRoot D:\servis-platform`

Bu komut su iki parcayi dogrular:
- repo-contract: `tools\check_m59_observability_field_diagnostics_repo_contract.ps1`
- runtime/check: `backend\scripts\m59_observability_field_diagnostics_check.js`

## 8) Green yorumu
M59 green sayilabilmesi icin:
- pack gecmeli
- repo-contract gecmeli
- backend / mobile / web iskeleti birlikte bulunmali
- SSOT yeni rotaya hizali olmali

M59 green oldu. Siradaki resmi is M60'tir.
