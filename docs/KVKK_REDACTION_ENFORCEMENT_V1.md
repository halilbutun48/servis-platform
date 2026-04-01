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
- school erişimi / parent contact / child contact yüzeyleri varsayılan olarak daraltılır

## Log ve export kuralı
- preview ve export aynı redaction helper üstünden geçmelidir
- admin log tarafı da varsayılan olarak ham IP / ham email göstermemelidir
- gerekiyorsa daha derin adli erişim ayrı kontrollü yüzey olarak tasarlanmalıdır

## Veli erişimi notu
- Veli Erişimi yüzeyi ham `email` veya `phone` toplamadan çalışır
- parent access listesinde `tokenHash` response'a dönmez
