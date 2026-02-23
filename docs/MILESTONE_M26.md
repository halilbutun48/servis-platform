# M26 — Company Premium Workflow + Agreement Presets (V1)

## Amaç
Company tarafında kullanıcı hatasını ve tık sayısını azaltmak:

1) **Company Home (Workflow) paneli**
   - Tek ekrandan “ne yapmalıyım?” akışı
   - Hızlı istatistikler (Agreements / Market / Geo Review / Bugünkü Shifts)
   - **Hızlı Agreement oluşturma** (Room + preset + tarih + günler + kaydet)

2) **Agreement oluşturmayı “template/preset” gibi yapmak**
   - Şablon seçince otomatik: günler + saat + direction/pattern + (opsiyonel) duration
   - Varsayılanlar: Hafta içi + Sabah/ Akşam presetleri

> Not: M26 **backend contract** değiştirmez; yalnızca UI/UX + gate check ekler.

---

## Kapsam
### M26.0 — Web: Company Home (Workflow)
- Route: `#/company`
- Company login sonrası default landing: `#/company`
- Home panel:
  - Agreements / Market / Geo Review / Bugünkü Shifts kartları
  - Hızlı Agreement formu

### M26.1 — Web: AgreementsPanel preset/şablon iyileştirme
- Company AgreementsPanel’de “Plan Şablonu” dropdown
  - Sabah / Akşam / Gece / Özel
  - Günler ve saatler otomatik dolar
- Hub alanları:
  - “Room hub’ını otomatik kullan” opsiyonu
  - “Hub’ı Room’dan al” butonu

### M26.2 — Gate/Pack/Check
- `backend/scripts/m26check.js`
  - Company rooms directory ok
  - Company agreement create/list/cancel ok
- `tools/gate.ps1` ve `tools/pack.ps1` `-To 26` destekler.

---

## DoD
- Company login → default `#/company` açılır.
- Company Home panelde kartlar ve hızlı agreement formu görünür.
- Agreement preset seçimi:
  - Günler + saat + direction/pattern otomatik dolar.
- Gate:
  - `tools/pack.ps1 -To 26` **PASS**

---

## Değişen dosyalar
- `web/src/App.jsx` (Company default route → `/company`)
- `web/src/layout/NavDock.jsx` (Company nav: Home ekli)
- `web/src/panels/company/WorkflowPanel.jsx` (NEW)
- `web/src/panels/company/AgreementsPanel.jsx` (preset/şablon iyileştirme)
- `backend/scripts/m26check.js` (NEW)
- `tools/gate.ps1`, `tools/pack.ps1` (ValidateRange → 26, M26 check)

