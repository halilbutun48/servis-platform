# INVITE-BASED-MEMBERSHIP-01 — insan onaylı davetli üyelik

Tarih: 2026-06-08
Repo: `servis-platform`

Bu milestone, `ONBOARDING-REVIEW-01 FINAL AUDIT` sonrasında public lead'i otomatik üyelik açmadan invite draft / pending invite sınırına taşımayı tanımlar. Amaç, public lead'lerin doğrudan kullanıcı hesabına dönüşmemesini korumak; yalnızca insan onayıyla ilerleyen, guard'lı ve audit log'lu davetli üyelik hazırlığını kanonik hale getirmektir.

## Amaç
- Onaylanmış public lead için invite draft hazırlamak.
- İnsan onayı olmadan kullanıcı oluşturma veya üyelik aktivasyonu açmamak.
- Public lead'i otomatik olarak kullanıcı / account haline getirmemek.
- Self-service signup, automatic membership ve otomatik şirket / room üyeliğini kapalı tutmak.
- Payment, billing, collection, settlement ve contract execute açmamak.
- Verified supplier veya supplier verification auto akışını açmamak.

## Kanonik akış
- `ONBOARDING-REVIEW-01 FINAL AUDIT`
- `INVITE-BASED-MEMBERSHIP-01`
- `VERIFIED-SUPPLIER-01`

## Güvenli sınır
- `human approval`
- `human onaylı` davet hazırlığı
- `guard`
- `audit log`
- `invite draft`
- `pending invite`
- `public leads do not automatically become users/accounts`
- `no self-service signup`
- `no automatic membership`
- `no automatic company / room membership`
- `no user creation without human approval`
- `no payment`
- `no billing`
- `no settlement execute`
- `no contract execute`
- `no supplier verification auto`
- `no email`
- `no SMS`
- `no push`
- `no schema change`
- `no runtime feature`

## Out-of-scope
- Self-service signup
- Automatic membership
- Automatic company / room membership
- Automatic user creation
- Payment / billing / collection
- Settlement execute
- Contract execute
- Supplier verification auto / verified supplier auto flow
- Email / SMS / push
- Backend route/service/schema değişikliği
- schema değişikliği
- UI/runtime feature açılması

## Not
- Eğer güvenli user creation altyapısı zaten yoksa, invite draft / pending invite yalnızca planlama ve inceleme sınırında kalır.
- Bu milestone public lead'i doğrudan user/account yapmaz.
- Bu doküman docs/check milestone'udur; runtime davranışı açmaz.
