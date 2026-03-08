# SCHOOL → Parent Invite Flow

## Amaç
Okul paneli parent için **ID/şifre vermez**. Bunun yerine öğrenci bazlı tek kullanımlık invite linki üretir.

## Akış
1. SCHOOL panelinde öğrenci seçilir.
2. Parent adı / e-posta / telefon opsiyonel girilir.
3. Sistem tek kullanımlık invite token üretir.
4. Panel sadece **linki** gösterir; raw şifre veya parent user id göstermez.
5. Parent linke gider, kendi ad/e-posta/şifresini girer.
6. Sistem `PARENT` user oluşturur veya mevcut parent hesabını günceller.
7. `ParentChild` bağı otomatik kurulur ve parent giriş yapmış olur.

## Route
- SCHOOL panel: `#/school/parents`
- Public accept: `#/accept-parent-invite?token=...`

## Backend
- `GET /api/school/parent-invites`
- `POST /api/school/parent-invites`
- `POST /api/school/parent-invites/:id/revoke`
- `GET /api/auth/parent-invite/info?token=...`
- `POST /api/auth/parent-invite/accept`

## Not
- Invite token DB'de hash olarak tutulur.
- Parent hesabı okul tarafından password ile açılmaz; self-serve kabul ile açılır.
