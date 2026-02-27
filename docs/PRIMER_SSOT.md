# PERSONEL SERVİS V1 — PRIMER (SSOT)

Tarih: 2026-02-28  
Timezone: Europe/Istanbul  

## Repo & doğrulama
- Repo path: `D:\servis-platform`
- tools/pack.ps1: `[ValidateRange(0,35)]` (Gate/Pack stage üst sınır M35)
- Son kaydedilmiş GREEN: ✅ `GATE PASS (M0→M33)` + ✅ `PACK PASS (M0→M33)`
- Önerilen güncel doğrulama: `tools\pack.ps1 -To 35`

> Not: Overlay serisi (OVERLAY_NOTES_Mxx) ile Gate/Pack stage (M0→M35) numaraları aynı olmak zorunda değil.

---

## Ürün modeli (kafa karışıklığı yok)
- **Agreement** = anlaşma takvimi + fiyat/koşul (uzun/kısa süreli)
- **Shift** = operasyon (durak/rota/personel/maxWalk/araç-şoför)

**Kural:**
- Agreement **APPROVED** → otomatik shift üretimi (rolling **7 gün**)
- Agreement’lı shift: **APPROVED**, pazarlık/offer UI **kapalı**, `agreementId` badge
- Agreement’sız shift: normal pazar akışı (REQUESTED/COUNTERED)

---

## Mevcut UX paketleri (elde var)
### M51 (overlay serisi)
- Company Vardiyalar default: “Takip → Bekleyen/Teklifler”
- Manuel Talep kaldırıldı
- “Kabul Et” sadece `COUNTERED` iken aktif
- Shift Tools “Hub” kartı + `/api/geocode` + durak listesine OUTBOUND başa / INBOUND sona ekleme
- Shift Extend (süre uzatma) modülü mevcut (Company request → Room accept/reject)

---

## Sonraki işler (Agreement stream)
1) Rolling generator 7 gün + TR (+03) saat düzeltmesi + idempotent
2) Room AgreementsPanel: company teklifini görünür yap + WS/notification
3) Agreement’lı shiftlerde offer/counter UI kapatma + badge
4) Templates: “Günler + Süre” kaldır, Agreement create’e quick duration presetleri (1d/2d/3d/4d/1w/1m)
