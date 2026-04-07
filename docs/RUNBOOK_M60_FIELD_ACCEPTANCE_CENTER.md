<!-- REPO_CONTRACT_MARKER milestone=M60 slug=field-acceptance-center -->

# RUNBOOK — M60 SAHA ACCEPTANCE MERKEZI

Tarih: 2026-03-19
Timezone: Europe/Istanbul
Durum: **acik / resmi green degil**

Bu runbook, saha testine cikmadan once acceptance kararini sistem icine tasimak icin acilan **M60** milestone'unun kapsam sinirini tanimlar.

## 1) M60 amac cumlesi
M60 ile sistem su soruya tek yerde cevap vermelidir:

**"Hangi cihaz, hangi build ve hangi test kosusuyla GO / LIMITED GO / NO-GO kararina gidildi?"**

## 2) Kapsam
M60 su basliklari acar:
- pilot test oturumu kaydi iskeleti
- acceptance checklist sabiti
- GO / LIMITED GO / NO-GO karar secenekleri
- cihaz / build bazli test ozeti iskeleti
- kanit ve not alani iskeleti
- super admin acceptance merkezi paneli iskeleti

## 3) Kapsam siniri
M60, launch karari vermez.
M60, ticari teklif / pazarlik akisina genisleme yapmaz.
M60, copilot dogal cevap katmanini acmaz.

Bunlar sirayla daha sonra:
- `M61 — SSOT + Milestone Hizasi`
- `M62 — Ticari Omurga Guclendirme`
- `M64 — Dogal Copilot Katmani`
- `M65 — Pilot Launch Gate`

a altina alinacaktir.

## 4) M60.1 ilk teslim paketi
Ilk teslim su 4 parcayi acik bir repo iskeleti olarak koyar:
1. backend acceptance manifest ve session-template route iskeleti
2. mobile acceptance evidence helper iskeleti
3. web super admin acceptance merkezi paneli iskeleti
4. SSOT / runbook / pack / check disiplini

## 5) Veri sinyalleri
M60 kapsaminda hedeflenen temel acceptance alanlari:
- surucu kimligi
- cihaz modeli
- platform / OS bilgisi
- build profili
- test eden kisi
- checklist cevaplari
- karar secenegi
- kisa risk notu

## 6) UI odagi
Web tarafinda hedeflenen ilk gorunum:
- aktif checklist maddeleri
- karar secenekleri
- test oturumu ozet karti
- kanit turleri
- acceptance raporu iskeleti

## 7) Kanonik komut
`tools\pack_m60_field_acceptance_center.ps1 -RepoRoot D:\servis-platform`

Bu komut su iki parcayi dogrular:
- repo-contract: `tools\check_m60_field_acceptance_center_repo_contract.ps1`
- runtime/check: `backend\scripts\m60_field_acceptance_center_check.js`

## 8) Green yorumu
M60 green sayilabilmesi icin:
- pack gecmeli
- repo-contract gecmeli
- backend / mobile / web iskeleti birlikte bulunmali
- SSOT M59 green + M60 aktif durumu ile hizali olmali

M60 green olmadan M61'e gecilmez.
