# COPILOT SCREEN KNOWLEDGE PARITY V1

Bu doküman Copilot'un frontend'de görünen ekranları backend katalog ile aynı gerçeklikte bilmesini ve bilinmeyen ekranda güvenli fallback üretmesini tanımlar.

## Amaç
- Copilot yanlış ekrana düşmesin.
- Geri Bildirim, KVKK, bildirim, log, ticari, operasyon ve pilot kapı ekranları doğru bağlamla anlatılsın.
- Kullanıcı "burası ne işe yarar" dediğinde ekrandaki gerçek ürün bağlamı söylensin.

## Canlı bug örneği
- `/shared/feedback` ekranında "burası ne işe yarar" sorusu geldiğinde Copilot harita veya araç seçimi cevabı üretmemelidir.
- Bu ekran saha geri bildirimleri, kullanıcı yorumları ve değerlendirme kayıtları içindir.
- Yanlış fallback örneği: "haritada doğru aracı seç".

## Parity kuralı
- `web/src/copilot/screenRegistry.js` içinde görünen Copilot ekranları backend `screenCatalog` tarafından bilinmelidir.
- Bilinmeyen path asla rolün ilk ekranına sessizce düşmemelidir.
- Path eşleşmesi entityId'den önce gelir.

## Shared ekran standardı
- `/shared/feedback`: Geri Bildirim
- `/shared/kvkk`: KVKK
- `/shared/notifications`: Bildirimler
- `/shared/logs`: Log Dışa Aktarımı

Her shared ekran için:
- label ve path korunur.
- menü amacı sade Türkçe kalır.
- yanlış ekran anlatımı yapılmaz.

## Unknown screen safe fallback standardı
- `id`: `screenContext.entityId` veya `null`
- `path`: `screenContext.path`
- `label`: `screenContext.label` veya `Bu ekran`
- `menuPurpose`: `Bu ekran için detaylı rehber henüz katalogda yok; görünen başlık ve panel bilgisine göre yardımcı olabilirim.`
- `firstStep`: `Önce bu ekrandaki başlık ve açık kayıtları kontrol et.`
- `nextStep`: `Sonra ilgili kayıt veya filtre üzerinden devam et.`

Unknown fallback:
- rolün ilk ekranına düşmez.
- başka ekranın içeriğini taşımadan güvenli kalır.

## Path/id mismatch kuralı
- Path önceliklidir.
- `entityId` başka ekranı çağrıştırsa bile path ile bulunan ekran döner.
- `/shared/feedback` gibi bir path, `/room/map` gibi başka bir ekrana çevrilmez.

## Screen analyzer sınıfları
- `FEEDBACK`
- `KVKK`
- `NOTIFICATIONS`
- `LOG_EXPORT`
- `OPERATIONS`
- `COMMERCIAL_CORE`
- `ROOM_COMMERCIAL_FLOW`
- `REPORTS`
- `DRIVER_PIN`
- `PILOT_LAUNCH_GATE`
- `REGIONS`
- `SSOT_ALIGNMENT`
- `NATURAL_COPILOT`

Analyzer davranışı:
- Seçili kayıt ve ekran sinyalini birlikte okur.
- Veri yoksa bile ilk kontrol ve sonraki doğru işlem söyleyebilir.
- Teknik ham veri dili kullanmaz.

## "Önce Önce" format standardı
- `openingActionForQuestionType` ve benzeri yardımcılar `Önce` prefix'ini normalize eder.
- Cevapta `Önce Önce` oluşmaz.
- Bir adım zaten `Önce` ile başlıyorsa ikinci kez prefix eklenmez.

## Manual acceptance soruları
- "burası ne işe yarar"
- "burası ne"
- "bu ekran ne"
- "burada ne yapacağım"
- "burada ne eksik"
- "bu ne"
- "ne yapayım"
- "sıradaki doğru işlem ne"
- "hangi ekrana gideyim"

## COP-03B sonraki plan
- Workflow / domain knowledge depth artırılacak.
- Seçili kayıt, ekran, rol ve konuşma geçmişine dayalı öneri çipleri derinleştirilecek.
- Gerekirse operasyon akışları için daha zengin surface fact sınıfları eklenecek.
