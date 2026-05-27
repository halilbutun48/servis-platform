# PUBLIC-LANDING-01 — public landing / tanıtım web yüzeyi

Bu milestone SeferPakt için public landing / tanıtım sayfasını sabitler. Amaç, ürünün dış dünyaya açılan ilk vitrinini güvenli ve kurumsal şekilde sunmak ve kontrollü lead akışına kapı açmaktır.

## Kapsam Notu
- Bu landing ayrı bağımsız bir web sitesi değildir.
- Mevcut SeferPakt web projesinin içindeki public giriş kapısıdır.
- Authenticated app, operasyon panelleri ve login akışı korunur.
- Public landing, lead capture ve onboarding akışlarına hazırlık yapar.

## Amaç
- SeferPakt’ın ne olduğunu kısa ve net anlatmak.
- Lisanssız / pazaryeri modelini güvenli biçimde açıklamak.
- Sefer Abi AI vizyonunu gerçekçi ama güçlü bir dille aktarmak.
- Firma / okul / kurum / tedarikçi tarafındaki değer önerisini ayırmak.
- Demo / destek / servis ihtiyacı / tedarikçi başvurusu için kontrollü lead formu açmak.
- Self-service üyelik, ödeme, fatura veya otomatik hesap açmadan yönlendirme sunmak.

## Sayfa bölümleri
- Hero
- Lisanssız model açıklaması
- Sefer Abi AI vizyonu
- Hedef kullanıcı kartları
- Operasyon güveni
- Nasıl çalışır?
- Güvenli pazaryeri
- Sık sorulanlar
- Başvuru CTA alanı / kontrollü lead formu

## Public CTA sınırı
- Başvurular ekip tarafından incelenir.
- Üyelik otomatik açılmaz.
- CTA'lar kontrollü lead formunu açar.
- CTA'lar otomatik üyelik, ödeme, fatura, tahsilat veya settlement başlatmaz.
- Self-service signup, automatic membership ve invite sending bu milestone'da kapalıdır.
- Gerçek lead capture akışı `LEAD-CAPTURE-01` içinde resmi hale getirilir.

## Akış Sırası
- PUBLIC-LANDING-01
- LEAD-CAPTURE-01
- ONBOARDING-REVIEW-01
- INVITE-BASED-MEMBERSHIP-01
- VERIFIED-SUPPLIER-01
- Authenticated app panelleri

## Lisanssız model copy
- Lisans ücreti yok.
- Mevcut sözleşmeden pay alınmaz.
- SeferPakt kaynaklı yeni / yenilenen işlerde kaliteye göre başarı payı politikası yalnızca readonly olarak anlatılır.
- Kaynak vardiya / market shift zinciri kanıtlanmıyorsa başarı payı doğmaz.
- Public landing üzerinde gerçek ödeme, fatura, tahsilat veya settlement akışı yoktur.
- Public CTA'lar yalnızca controlled lead formuna bağlanır.

## Sefer Abi AI copy
- Personel / öğrenci listelerini analiz eder.
- Eksik adresleri bulur.
- Durak ve rota taslağı hazırlar.
- Teklifleri fiyat / kalite / SeferPuanı / kapasite / risk ile karşılaştırır.
- Pazarlık ve karşı teklif taslaklarını hazırlayabilir.
- En uygun seçeneği gerekçesiyle sunar.
- Kritik işlemleri kullanıcı onayı olmadan yapmaz.

## Out-of-scope
- Lead backend
- Membership automation
- Payment / invoice / settlement execute
- Automatic signup or public registration
- SMS / push execution
- Prisma migration / schema change
- Runtime-data değişikliği
