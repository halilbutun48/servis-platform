# OVERLAY M46 — PlanBuilder Apply sonrası Takip'e geç

Değişiklik: `PlanBuilderPanel.jsx`
- `Uygula: N market shift oluştur` başarılı olduğunda, mevcut davranış (bulk offer modal açma + onAfterApply) korunur.
- Ek olarak `company:shifts:focus` event'i dispatch edilir: `{ section:"market", shiftIds:[...] }`.

Sonuç:
- ShiftsPanel tarafında zaten bu event'i dinleyen kısım varsa, UI otomatik olarak **Takip → Market** bölümüne geçer (personel adımına geri atsa bile event bunu override eder).

Not:
- Listener yoksa event no-op, başka ekranları bozmaz.
