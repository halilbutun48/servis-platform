# ONBOARDING-REVIEW-01 — kontrollü public lead inceleme kuyruğu

Bu milestone, `LEAD-CAPTURE-01` ile toplanan public başvuruları otomatik üyelik, ödeme, sözleşme veya tedarikçi doğrulama açmadan Super Admin insan inceleme kuyruğuna taşır.

## Amaç
- Başvuruları güvenli şekilde okumak
- Durum güncellemesini insan onayına bağlamak
- Ek bilgi gerektiğinde takip notu bırakmak
- `APPROVED_FOR_INVITE` durumunu yalnızca sonraki invite adımı için hazırlık olarak kullanmak

## Review akışı
- `RECEIVED` - başvuru yeni alındı
- `IN_REVIEW` - inceleme sürüyor
- `NEEDS_INFO` - ek bilgi gerekiyor
- `APPROVED_FOR_INVITE` - invite için uygun görünüyor
- `REJECTED` - başvuru reddedildi

## KVKK ve güvenli gösterim
- Gereksiz kişisel veri çoğaltılmaz.
- Debug / raw payload / token / hash görünmez.
- Liste görünümünde iletişim bilgileri maskeli veya kısa özetle gösterilir.
- Detay görünümü yalnız inceleme amacıyla açılır.

## Storage yaklaşımı
- Mevcut runtime JSON store standardı kullanılır.
- Önerilen dosya: `backend/artifacts/runtime-data/public-leads.json`
- Prisma migration yoktur.
- Yeni tablo veya schema değişikliği yoktur.

## Out-of-scope
- Self-service signup
- Automatic membership
- Payment / invoice / collection
- Invite, kullanıcı, ödeme, fatura, sözleşme açılmaz.
- Onboarding review UI dışı invite gönderimi
- Supplier verification auto flow
- Contract / settlement execute

## Güvenli sınır
- Bu ekran otomatik kullanıcı oluşturmaz.
- Bu ekran otomatik davet göndermez.
- Bu ekran otomatik ödeme veya fatura başlatmaz.
- Bu ekran sadece insan inceleme kararını ve notu kaydeder.
