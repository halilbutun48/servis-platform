# PUBLIC-LANDING-01 — public landing / tanıtım web yüzeyi

Bu milestone SeferPakt için public landing / tanıtım sayfasını sabitler. Amaç, ürünün dış dünyaya açılan ilk vitrinini güvenli ve kurumsal şekilde sunmak ve kontrollü lead akışına kapı açmaktır.

## Kapsam Notu
- Bu landing ayrı bağımsız bir web sitesi değildir.
- Mevcut SeferPakt web projesinin içindeki public giriş kapısıdır.
- Authenticated app, operasyon panelleri ve login akışı korunur.
- Public landing, lead capture ve onboarding akışlarına hazırlık yapar.

## Amaç
- SeferPakt’ı kurumsal servis operasyon ve tedarik platformu olarak kısa ve net anlatmak.
- Sefer Abi’yi genel amaçlı AI yerine opsiyonel operasyon copilot’u olarak konumlandırmak.
- Firma / okul / kurum / tedarikçi tarafındaki değer önerisini ayırmak.
- Demo / destek / servis ihtiyacı / tedarikçi başvurusu için kontrollü lead formu açmak.
- Self-service üyelik, ödeme, fatura veya otomatik hesap açmadan yönlendirme sunmak.

## Sayfa bölümleri
- Hero
- Platform-first değer anlatımı
- Operasyon güveni
- Hedef kullanıcı kartları
- Nasıl çalışır?
- Güvenli sınır
- Sık sorulanlar
- Başvuru CTA alanı / kontrollü lead formu

## Public CTA sınırı
- Başvurular ekip tarafından incelenir.
- Üyelik otomatik açılmaz.
- CTA'lar kontrollü lead formuna bağlanır.
- CTA'lar kontrollü lead formunu açar.
- CTA'lar otomatik üyelik, ödeme, fatura, tahsilat veya settlement başlatmaz.
- Self-service signup, automatic membership ve invite sending bu milestone'da kapalıdır.
- Gerçek lead capture akışı `LEAD-CAPTURE-01` içinde resmi hale getirilir.

## Akış Sırası
- Public lead order: `PUBLIC-LANDING-01 -> PUBLIC-LANDING-PLATFORM-FIRST-01 -> PUBLIC-LANDING-01 FINAL PROMISE CHECK -> LEAD-CAPTURE-01 -> ONBOARDING-REVIEW-01`
- PUBLIC-LANDING-01
- PUBLIC-LANDING-PLATFORM-FIRST-01
- PUBLIC-LANDING-01 FINAL PROMISE CHECK
- LEAD-CAPTURE-01
- ONBOARDING-REVIEW-01
- INVITE-BASED-MEMBERSHIP-01
- VERIFIED-SUPPLIER-01
- Authenticated app panelleri

## Platform-first copy
- Servis tedarikinden saha denetimine, sözleşmeden hakedişe tek kurumsal platform.
- SeferPakt; servis taleplerini, tedarikçileri, sözleşmeleri, vardiyaları, canlı GPS takibini, kanıtları ve hakediş önizlemelerini tek yerde yönetir.
- Kurumlar ihtiyacı kısa formda bırakır, ekip başvuruyu inceler, uygun işlerde insan onaylı operasyon yürür.
- Sefer Abi ikincil, opsiyonel operasyon copilot'u olarak anılır; ayrı bir ana vitrin bölümü olarak öne çıkarılmaz.
- Public landing bir AI platformu değildir; ana değer servis operasyonu, tedarik ve kontrollü süreç yönetimidir.

## Güvenli sınır
- Kontrolsüz self-service üyelik yok.
- Otomatik firma / okul / kurum hesabı açma yok.
- Otomatik Room / tedarikçi hesabı açma yok.
- Otomatik davet maili / SMS yok.
- Ödeme, fatura, tahsilat ve settlement execute yok.
- Sözleşme veya operasyon başlatma yok.

## Out-of-scope
- Lead backend
- Membership automation
- Payment / invoice / settlement execute
- Automatic signup or public registration
- SMS / push execution
- Prisma migration / schema change
- Runtime-data değişikliği
