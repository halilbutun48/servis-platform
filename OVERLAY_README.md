# overlay_m33_3_apply_fix

Amaç: Plan Builder Stage-3 `Uygula: N shift oluştur` butonunun çalışmamasını düzeltmek.

## Fix
- `PlanBuilderPanel.jsx`: `istanbulLocalToUtcIso` fonksiyonu yanlışlıkla `buildLocalRangeFromItem` içinde kalmıştı (return sonrası unreachable). Bu yüzden `Uygula` tıklanınca JS tarafında hata oluşuyor ve backend'e hiç istek gitmiyordu.
- Fonksiyonlar doğru scope'a alındı.
- Shift create body'ye template item `direction/pattern` eklendi.
- Apply sonucu için küçük `Detay` (JSON) görünümü eklendi.

## DoD
- Company → Shifts → Plan Builder
- `Uygula: N shift oluştur` tıklanınca backend log'da:
  - `POST /api/shifts`
  - `PUT /api/shifts/:id/people`
  - `POST /api/shifts/:id/stops/generate`
- Ardından Liste/Pending refresh.
