# KVKK REDACTION ENFORCEMENT V1

## Amaç
Bu belge M77.3 ile gelen payload daraltma ve redaction kurallarını toplar.

## Redaction kuralları
- ham `phone` yerine `phoneMasked`
- ham `homeAddress` yerine `homeAddressMasked`
- ham `email` yerine `emailMasked`
- ham `ip` yerine `ipMasked`
- ham `userAgent` yerine `userAgentMasked`
- log text içinde `lat=` / `lng=` değerleri tam hassasiyetle taşınmaz
- audit meta içinde `password`, `secret`, `token`, `passwordHash` benzeri alanlar redacted kabul edilir

## GPS kuralı
- `SUPER_ADMIN`, `ROOM`, `DRIVER` => exact GPS yüzeyi
- `COMPANY`, `PERSONEL`, `PARENT` => `masked-2dp`
- diğer yüzeyler => hidden/null

## School domain kuralı
- `SCHOOL` ayrı auth role değildir
- `Company.kind = SCHOOL` business domain olarak taşınır
- school davet / parent contact / child contact yüzeyleri varsayılan olarak daraltılır

## Log ve export kuralı
- preview ve export aynı redaction helper üstünden geçmelidir
- admin log tarafı da varsayılan olarak ham IP / ham email göstermemelidir
- gerekiyorsa daha derin adli erişim ayrı kontrollü yüzey olarak tasarlanmalıdır


## M77.4 ek redaction notu
- logs preview/export hedef etiketi sanitize edilir
- admin export filtreleri (`emailContains`, `ipContains`) sanitize edilerek audit'e yazılır
- auth invite listesinde ham `email` yerine `emailMasked`, ham `phone` yerine `phoneMasked` öne çıkar
