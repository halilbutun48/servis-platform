# OVERLAY — M81.3 — Stop Progress Notifications (Room/Company/Personel/Parent)

> Tarihsel not (2026-04-01): Bu dosyadaki M80/M81/M82 numarası Mart 2026 overlay serisine aittir. Güncel aktif milestone anlamı için `docs/PRIMER_SSOT.md` ve `docs/MILESTONE_REGISTRY_V1.md` baz alınır.


## Amaç
Durak ilerlemesi sırasında (REACHED) otomatik bildirimler:
- **Company/Room:** "Araç X/Y durağa ulaştı, kalan Z" (+ opsiyonel sonraki durağa km)
- **Personel:** kendi durağına **2 durak / 1 durak kaldı** ve **durağa ulaşıldı**
- **Parent:** bağlı STUDENT için aynı bildirimler

## Teknik
- Trigger: DRIVER stop progress endpointleri + GPS auto-reached.
- Dedupe: `dedupeKey` ile (aynı stop/threshold tekrar yaratmaz).
- Notification hedefleri:
  - ROOM -> `roomId`
  - COMPANY -> `companyId`
  - USER (Personel/Parent) -> `userId`

## Şema
- `NotificationScope` enum: `USER` eklendi.
- `Notification.userId` eklendi (opsiyonel).

## Not
- Proximity mesajındaki "km" değeri: `GpsLast` ile **haversine** yaklaşık hesap.
- "SKIPPED" stoplar proximity spam üretmesin diye sadece REACHED'te proximity üretiyoruz.
