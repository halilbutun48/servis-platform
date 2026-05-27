# PUBLIC-LANDING-01 — public landing / tanıtım web yüzeyi

Bu milestone SeferPakt için public landing / tanıtım sayfasını sabitler. Amaç, ürünün dış dünyaya açılan ilk vitrinini güvenli ve kurumsal şekilde sunmaktır.

## Kapsam Notu
- Bu landing ayrı bağımsız bir web sitesi değildir.
- Mevcut SeferPakt web projesinin içindeki public giriş kapısıdır.
- Authenticated app, operasyon panelleri ve login akışı korunur.
- Public landing, sonraki lead ve onboarding akışlarına hazırlık yapar.

## Amaç
- SeferPakt’ın ne olduğunu kısa ve net anlatmak.
- Lisanssız / pazaryeri modelini güvenli biçimde açıklamak.
- Sefer Abi AI vizyonunu gerçekçi ama güçlü bir dille aktarmak.
- Firma / okul / kurum / tedarikçi tarafındaki değer önerisini ayırmak.
- Henüz gerçek self-service üyelik, ödeme, fatura veya public lead capture backend açmadan demo / destek / başvuru yönlendirmesi sunmak.

## Sayfa bölümleri
- Hero
- Lisanssız model açıklaması
- Sefer Abi AI vizyonu
- Hedef kullanıcı kartları
- Operasyon güveni
- Nasıl çalışır?
- Güvenli pazaryeri
- Sık sorulanlar
- İletişim taslağı / CTA alanı

## Public CTA sınırı
- CTA’lar otomatik lead backend açmaz.
- CTA’lar otomatik üyelik, ödeme, fatura veya tahsilat başlatmaz.
- Bu milestone’da CTA’lar yalnızca yerel iletişim taslağı veya e-posta istemcisi akışı sunar.
- Gerçek lead capture backend, membership automation ve public signup akışı `LEAD-CAPTURE-01` gibi sonraki milestone’lara bırakılır.

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
