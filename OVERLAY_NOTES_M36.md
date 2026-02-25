# OVERLAY — M36 (ROOM market offer preview auth)
Tarih: 2026-02-26 (Europe/Istanbul)

## Amaç
ROOM tarafında **market/offered** shift’lerde (shift.roomId henüz NULL iken) aşağıdakiler çalışsın:
- ROOM Shifts ekranında “Haritada Önizle” (GET `/api/shifts/:id/route-preview`)
- RoutePreviewModal fallback’ı için `/api/shifts/:id/stops`

> Scope kuralı: ROOM, yalnızca **aktif** bir offer’ı varsa (OPEN / COUNTERED / ACCEPTED) preview/stops görebilir.
> CANCELLED offer’larda erişim yok (veri sızıntısı engeli).

## Değişiklikler
### Backend
- `backend/src/routes/shifts/helpers.js`
  - `getShiftAndCheckScopeOrThrow()` içine opsiyonel `allowRoomOfferScope` bayrağı eklendi.
  - ROOM scope: `shift.roomId` eşleşmiyorsa, **allowRoomOfferScope=true** iken `shiftOffer` (OPEN/COUNTERED/ACCEPTED) kontrolü yapar.

- `backend/src/routes/shifts/people.js`
  - `/api/shifts/:id/route-preview` için `allowRoomOfferScope: true` eklendi.
  - (shadow olsa da) `/api/shifts/:id/stops` için de `allowRoomOfferScope: true` eklendi.

## Beklenen Sonuç
- ROOM, Offers → “Shift’e Git” ile gelen shift’i Shifts ekranında görür.
- Market shift (roomId null) için “Haritada Önizle” artık 403 vermez; rota/durak özetini gösterir.
