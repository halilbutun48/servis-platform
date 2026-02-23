# M30 — One-Flow Marketplace + Driver/Personel UX

Tarih: 2026-02-23 (Europe/Istanbul)

## Hedef
Sahada “en az tık + en az hata” için iki iyileştirme:

### M30-A — Wizard sonrası tek akış (Market)
- Company Agreement Wizard tamamlanınca **tek modal** ile:
  1) Market shift aç (room seçmeden)
  2) Room’ları seç (search + sadece hub’lı)
  3) Teklifi gönder (amount/note opsiyonel)
- İş bitince Company Shifts’te **Teklifler listesi otomatik açılır**.

### M30-B — Driver/Personel panelleri sadeleştirme
- Driver Route: “Bugün Rotam” üst kart + büyük **Reached** butonu; durak listesi toggle.
- Personel “Benim Servisim”:
  - PERSONEL için **uygun vardiyalar listesi** (`GET /api/personel/shifts`)
  - Konum al (geolocation) + talep oluştur (request create)
  - Son bildirimler + (opsiyonel) ETA görüntüleme

## Backend değişiklikleri
- `GET /api/personel/shifts?take=`
  - PERSONEL: kendi company’sindeki `APPROVED|ACTIVE` ve `endAt>now` vardiyalar

## Web değişiklikleri
- Company: `AgreementWizard` → Market teklif modal
- Company: `ShiftsPanel` → auto open offers list (localStorage key)
- Room: `OffersPanel` → ACCEPTED teklif için **Hızlı Onayla** (vehicle+driver select)
- Driver: `RoutePanel` UI sade
- Personel: `MyRidePanel` talep oluşturma + bildirimler

## DoD
- `tools/pack.ps1 -To 30` **PACK PASS**
- `M30CHECK` PASS
