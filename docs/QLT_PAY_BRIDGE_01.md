# QLT-PAY-BRIDGE-01

QLT-PAY-BRIDGE-01, SeferPakt içinde kalite sinyali, operasyon kanıtı ve hakediş önizlemesi arasındaki readonly köprüyü güçlendirir.

## Amaç

- Kalite durumunu görünür kılmak.
- Eksik kanıtları okumak.
- Hakediş etkisini yalnızca önizleme olarak göstermek.
- Settlement / ödeme hazırlık durumunu göstermek.
- Gelecek SEFER-SCORE-01 için sinyal zeminini hazırlamak.

## Güvenli Sınırlar

- Readonly önizleme — ödeme başlatılmaz. Tahsilat/fatura oluşturulmaz.
- Ödeme başlatılmaz.
- Hakediş onaylanmaz.
- Settlement execute edilmez.
- Tahsilat oluşturulmaz.
- Fatura oluşturulmaz.
- Komisyon veya platform fee hesaplanmaz.

## Görünen Alanlar

- Kalite durumu
- Kanıt tamlığı
- Eksik kanıtlar
- Hakediş önizleme etkisi
- Ödeme / settlement hazırlığı
- Sıradaki doğru işlem
- SeferPuanı için kullanılabilecek sinyaller

## Not

Bu milestone yalnızca readonly önizleme sağlar. Son karar her zaman yetkili kullanıcıdadır.
