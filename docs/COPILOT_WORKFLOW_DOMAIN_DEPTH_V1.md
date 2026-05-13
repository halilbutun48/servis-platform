# COPILOT Workflow Domain Depth V1

## Amaç
Copilot'un bu aşamadaki hedefi yalnızca "bu ekran ne?" sorusunu yanıtlamak değildir. Copilot, ekranın içindeki iş akışını, bir kaydın neden takıldığını, bir sonraki ekranın ne olduğunu ve kimlerin bu adımı yapabileceğini de güvenli biçimde açıklar.

## Kapsam
- Yeni backend route yok.
- Yeni endpoint yok.
- Schema veya migration yok.
- Harici LLM/API yok.
- Büyük web veya mobil UI değişikliği yok.
- Sadece Copilot workflow knowledge, intent, context resolver, helpComposer, golden pack, check ve doküman katmanı genişler.
- Kullanıcıya görünen dilde `sözleşme` ve `Sürücünün telefon GPS’i` korunur.

## Workflow Cevap Standardı
Workflow sorularında cevap akışı şu sırayı korur:
- Şimdi:
- Bu programda bunun anlamı:
- Neden?
- Öneri:
- Sıradaki doğru işlem:

Bu akış, ekran-purpose davranışını bozmaz. Yani "burası ne", "bu ekran ne" veya "bu ne" gibi sorular gerektiğinde hala ekranın amacı olarak kalır.

## Ekran-Purpose Sınırı
Copilot, ekran amacını sormayan soruları ekran-purpose'a zorlamaz.

Korunan davranış:
- "burası ne"
- "bu ekran ne"
- "bu ne"
- "burada ne yapacağım"

Bu soru türlerinde amaç, iş akışı değil ekranın ne için kullanıldığını anlatmaktır.

## Workflow Aileleri

### 1. Vardiya / Görev / Rota / GPS
Bu aile, sahadaki canlı akış ve blokaj sorularını kapsar.

Örnek sorular:
- Bu vardiya neden başlayamıyor?
- Bu araç neden haritada görünmüyor?
- Sürücünün telefon GPS’i neden devrede?
- Bu kayıt neden ilerlemiyor?
- Sıradaki doğru işlem ne?

Kod tarafındaki ana sinyaller:
- `WHY_BLOCKED`
- `DRIVER_PHONE_GPS`
- `NEXT_STEP`
- `NEXT_SCREEN`

Kural:
- Son GPS, araç, sürücü, rota ve ETA birlikte okunur.
- Veri yoksa uydurma yapılmaz.

### 2. Sözleşme → Vardiya Üretimi
Bu aile, sözleşmeden vardiya çıkıp çıkmadığını ve sözleşme ile vardiya bağının durumunu anlatır.

Örnek sorular:
- Sözleşmeden bugün vardiya üretildi mi?
- Sözleşme ile vardiya ilişkisi ne?
- Bu kaydı kim yapabilir?

Kod tarafındaki ana sinyaller:
- `CONTRACT_TO_SHIFT`
- `READINESS_CHECK`
- `WHO_CAN_DO`

Kural:
- Sözleşme var diye vardiya otomatik başlamış sayılmaz.
- Sözleşme ve vardiya bağı ayrıca okunur.

### 3. Ticari Akış / Hakediş Önizleme
Bu aile, hakediş hazırlığını ve readonly önizleme durumunu kapsar.

Örnek sorular:
- Bu hakediş neden hazır değil?
- Hakediş tarafında ne kontrol etmeliyim?
- Sıradaki doğru işlem ne?

Kod tarafındaki ana sinyaller:
- `PAYMENT_READINESS`
- `MISSING_DATA`
- `NEXT_STEP`

Kural:
- Copilot ödeme başlatma dili kullanmaz.
- Önizleme, yalnızca kontrol ve okuma içindir.

### 4. Kalite / Güven / Değerlendirme
Bu aile, sağlayıcı neden daha güçlü görünüyor sorusunu ve kalite sinyalini açıklar.

Örnek sorular:
- Bu sağlayıcı neden daha iyi görünüyor?
- Kalite puanı kesin karar mı?
- Bu kayıt ne durumda?

Kod tarafındaki ana sinyaller:
- `QUALITY_SIGNAL`
- `WHY_BLOCKED`
- `STATUS_HELP`

Kural:
- Tek bir puanla kesin sıralama verilmez.
- Kanıt, taslak skor, inceleme kararı ve denetim izi birlikte okunur.

### 5. Geri Bildirim / Bildirim / KVKK
Bu aile, görünürlük, kaynak, sorumlu ve kayıt durumu sorularını kapsar.

Örnek sorular:
- Bu kayıt kimde?
- Bu kayıt ne durumda?
- Bu bildirim hangi olaydan geldi?
- Bu bilgi neden görünmüyor?

Kod tarafındaki ana sinyaller:
- `FEEDBACK_STATUS`
- `NOTIFICATION_SOURCE`
- `KVKK_VISIBILITY`

Kural:
- Bildirim, işlem kaydı ile aynı şey değildir.
- KVKK sınırı rol bazlıdır ve gizli bilgi zorla açılmaz.

### 6. Mobil / Sürücü / Personel / Veli Canlı Takip
Bu aile, mobil akışta doğru ekrana gitmeyi ve canlı takipte hangi sinyalin okunacağını anlatır.

Örnek sorular:
- Mobilde bu iş nereden yapılır?
- Konum neden görünmüyor?
- Sürücünün telefon GPS’i neden devrede?
- Hangi ekrana gitmeliyim?

Kod tarafındaki ana sinyaller:
- `DRIVER_PHONE_GPS`
- `NEXT_SCREEN`
- `FIRST_CONTROL`

Kural:
- Sürücü, personel ve veli için yetkisiz yönetim aksiyonu önerilmez.
- Canlı takipte ilk kontrol her zaman doğru kayıt ve doğru ekran olur.

### 7. Yetki / Rol / Sonraki Ekran
Bu aile, "bunu kim yapabilir" ve "hangi ekrana gitmeliyim" türü soruları kapsar.

Örnek sorular:
- Bunu kim yapabilir?
- Hangi ekrana gitmeliyim?
- Bu rolde ne yapabilirim?
- Sıradaki doğru işlem ne?

Kod tarafındaki ana sinyaller:
- `WHO_CAN_DO`
- `NEXT_SCREEN`
- `NEXT_STEP`

Kural:
- Yetki dışı yönetim işlemi önerilmez.
- Rol sınırı görünmüyorsa ilk kontrol, doğru kayıt ve doğru ekrandır.

## Veri Yoksa Davranış
Copilot veri yoksa uydurmaz.

Sabit davranış:
- İlk kontrol söylenir.
- Eksik alan belirtilir.
- Kesin olmayan bilgi kesin gibi yazılmaz.

## Değişmeyen Güvenli Sınırlar
- Düşük seviye teknik ayıklama dili görünür kullanıcı metninde kullanılmaz.
- İngilizce sözleşme dili görünür kullanıcı metnine taşınmaz; `sözleşme` kullanılır.
- Konum kaynağı için `Sürücünün telefon GPS’i` korunur.
- Kalite ve hakediş tarafında kesin sıralama veya yürütme dili verilmez.

## Check ve Zincir
- Yeni check adı `check:cop03b` olur.
- `check:product-extensions` zinciri bu check'i içerir.
- `check:verifychain01` bu zinciri bekler.
- `verify:final` dolaylı olarak COP-03B değişikliklerini de kapsar.

## Korunan Önceki Davranışlar
- Ekran-purpose cevapları korunur.
- COP-03A-FIX-01 ve COP-03A-FIX-02 davranışı bozulmaz.
- Görünür cevap/chip dili sade kalır.
- Veri olmayan yerde uydurma yapılmaz.
