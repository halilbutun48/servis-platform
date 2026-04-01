# OVERLAY M83 — Room Pool Capacity / Multi-Vehicle Suggestion

> Tarihsel not (2026-04-01): Bu dosya Step 0.6 tarihsel overlay geçmişidir. Güncel aktif davranış için ilgili SSOT belgeleri baz alınır.


Tarih: 2026-03-08

## Amaç
M82 kapasite gate sonrası, tek araç yetmediğinde Room tarafına:
- room havuzundaki müsait araç/driver toplamını göstermek
- bu vardiya için önerilen çoklu araç kombinasyonunu göstermek
- hızlı onay modalında da aynı havuz özetini sunmak

## Eklenenler
- `GET /api/availability/pool?shiftId=...`
  - requiredPax
  - totalPairCapacity
  - enoughPoolCapacity
  - missingPoolCapacity
  - suggestedCombo
  - vehicle/driver conflict özeti
- `web/src/panels/room/ShiftsPanel.jsx`
  - kapasite yetersizse otomatik room havuz özeti
  - önerilen araç + driver kombinasyonu
- `web/src/panels/room/OffersPanel.jsx`
  - quick approve modalında room havuz özeti

## Not
Bu overlay hala **tek shift = tek araç + tek driver** modelini değiştirmez.
Yani:
- yanlış tek araç approve artık bloklu
- ama gerçek çoklu operasyon için sonraki adım yine `split/package child shifts` olacaktır.
