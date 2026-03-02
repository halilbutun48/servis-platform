# OVERLAY — M81.0 — Parent model + endpoints + UI skeleton

Tarih: 2026-03-02 (Europe/Istanbul)

## Amaç
- Yeni rol: **PARENT**
- Parent ↔ Student bağlama tablosu: **ParentChild**
- Parent UI: “Çocuğum” seç → **Canlı harita** (KVKK time-window gate zorunlu)

## DB / Prisma
- `Role` enum’una `PARENT` eklendi.
- Yeni tablo: `ParentChild(parentUserId, personelId)`
- Link kuralı: Parent sadece `Personel.kind=STUDENT` ile bağlanabilir.

> Uygulama: `prisma db push` + `prisma generate`

## API
- `GET /api/parent/children` → parent’a bağlı çocuklar
- `GET /api/parent/live/vehicles?childId=` → sadece parent’ın çocuklarının **şu an** vardiyası varsa (startAt<=now<=endAt) ilgili araç(lar).

Admin (setup için):
- `POST /api/admin/parent-children` (SUPER_ADMIN) → parentUserId + personelId bağla
- `GET /api/admin/parent-children?parentUserId=`
- `DELETE /api/admin/parent-children/:id`

## Web
- Yeni panel: `#/parent/live`
  - çocuk seçimi + canlı harita
  - boş-state: vardiya saatinde/araç ataması yoksa konum göstermez
- NavDock: PARENT menüsü eklendi.
- SUPER_ADMIN → Users paneli: PARENT rolü eklenebilir.

## KVKK
- Parent canlı konum: **time-window gate** zorunlu.
  - yalnızca APPROVED/ACTIVE shift ve now aralığında.

