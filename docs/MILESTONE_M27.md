# M27 — Agreement Wizard (Preset paketler + tek ekran plan)

## Amaç
Sahadaki kullanıcı için **en az tıkla planlama**:
- Kullanıcı “vardiya/rota” düşünmesin.
- **Preset plan paketi** seçsin (Sabah / Akşam / Sabah+Akşam / Gece).
- Room seçsin (hub’lı filtre + arama).
- Tarih aralığı + günler.
- Tek tıkla shift kaynaklı sözleşme slotları oluşturulsun.

> Not: Wizard artık shift kaynaklı çalışır. Kanonik create yolu `POST /api/agreements/bundle` + `sourceShiftId` ile çoklu slot oluşturmaktır.

---

## Kapsam

### M27.0 — Web (UX)
- `AgreementWizard` modal bileşeni:
  - Room arama + `Sadece hub’lı` filtresi
  - Plan paketleri:
    - Hafta içi Sabah
    - Hafta içi Akşam
    - Hafta içi Sabah + Akşam (2 agreement)
    - Hafta içi Gece (midnight-cross)
    - Özel (elle ayarla)
  - Tarih başlangıç + süre preset (1w/1m/3m/6m/1y)
  - Gün presetleri + gün checkbox
  - Hub auto-fill (room hub) + manuel override
  - Opsiyonel teklif alanı (amount/note)

- Company Workflow Home (`/company`) içinde wizard “primary” giriş noktası
- Company Agreements panelinde wizard giriş butonu + advanced create “opsiyonel”

### M27.1 — Check
- `backend/scripts/m27check.js`
  - SuperAdmin room+hub create
  - Company `GET /api/rooms?hasHub=1` doğrular
  - Company source shift + morning/evening bundle create
  - Listede ikisi var mı kontrol
  - Cleanup: cancel

### M27.2 — Gate/Pack
- `tools/gate.ps1` M27 check ekli
- `tools/pack.ps1` ValidateRange → 27

---

## DoD
- `tools/pack.ps1 -To 27` → **PACK PASS ✅**
- Company:
  - Wizard açılır
  - Preset seçip **tek ekrandan** shift kaynaklı sözleşme slotları oluşturulur
  - Oluşturma sonrası agreements listesinde görünür

