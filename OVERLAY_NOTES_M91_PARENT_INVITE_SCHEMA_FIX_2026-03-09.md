# M91 — School Parent Invite schema/client drift fix

Bu overlay, SCHOOL Parent Link/Invite akışında görülen şu runtime hatasını düzeltir:

- `TypeError: Cannot read properties of undefined (reading 'findMany')`
- kaynak: `prisma.parentInvite` modelinin Prisma schema/client içinde olmaması

## Yapılan düzeltme
- `backend/prisma/schema.prisma` içine `ParentInvite` modeli geri eklendi.
- İlgili reverse relation'lar geri eklendi:
  - `Company.parentInvites`
  - `User.parentInvitesCreated`
  - `User.parentInvitesConsumed`
  - `Personel.parentInvites`

## Uygulama sonrası gerekli adım
Schema değiştiği için Prisma client yeniden üretilmeli ve veritabanı schema'sı güncellenmeli.

Önerilen akış:
1. overlay'i repo köküne aç
2. backend içinde `npx prisma db push`
3. backend içinde `npx prisma generate`
4. stack'i yeniden ayağa kaldır

## Beklenen sonuç
- `/api/school/parent-invites` artık crash etmez
- SCHOOL Parent Link ekranı açılır
- link üretme / listeleme / revoke akışı çalışır
- public accept akışı için `auth.js` tarafındaki `prisma.parentInvite` çağrıları da düzelir
