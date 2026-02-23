# M31 — Operasyon Otomasyonu + Kullanım Kılavuzu

Tarih: 2026-02-23 (Europe/Istanbul)

## Hedef
Sahada “az işlem” hedefini güçlendirmek:
- ROOM tarafında ACCEPTED shift’lerde **tek tık Onayla + Başlat**
- DRIVER tarafında daha hızlı operasyon: büyük Reached + Enter kısayolu
- Sahaya hazırlık: rol bazlı kullanım kılavuzu (COMPANY/ROOM/DRIVER/PERSONEL)

---

## M31-A — Operasyon Otomasyonu

### ROOM — Onayla + Başlat
- Offers inbox’ta ACCEPTED teklif → Hızlı Onayla modal
- Araç + sürücü seçildikten sonra:
  - **Onayla** veya
  - **Onayla + Başlat** (tek adım) seçeneği

### DRIVER — Daha hızlı akış
- Reached butonu büyütüldü
- Enter kısayolu eklendi

---

## M31-B — Kullanım Kılavuzu
Docs altında rol bazlı sayfalar:
- docs/USAGE_COMPANY.md
- docs/USAGE_ROOM.md
- docs/USAGE_DRIVER.md
- docs/USAGE_PERSONEL.md
- docs/USAGE_GUIDE_V1.md (index)

---

## DoD (Definition of Done)
- ROOM: Approve + Start tek akış çalışır (backend start endpoint)
- DRIVER: Enter ile reached çalışır
- Kullanım kılavuzu dokümanları repo’da mevcut
- Gate/Pack: `tools/pack.ps1 -To 31` PASS
