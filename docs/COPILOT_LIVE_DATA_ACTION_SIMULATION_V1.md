# COPILOT Live Data Action Simulation V1

Bu belge, Copilot’un ekrandaki readonly sinyalleri daha güçlü okuması ve aksiyonu yalnızca simüle etmesi için hazırlanmıştır.

## Cevap Akışı
- `Şimdi:`
- `Bu programda bunun anlamı:`
- `Neden?`
- `Öneri:`
- `Sıradaki doğru işlem:`

## Live Fact Confidence
- Ekrandan gelen sinyal var.
- Seçili kayıttan gelen sinyal var.
- Genel workflow bilgisi var.
- Sinyal eksikse kesin konuşulmaz.

Görünen dil:
- `Ekrandaki sinyale göre...`
- `Bu kayıt için elimde yeterli sinyal yok; ilk kontrol...`
- `Bu daha çok eksik veri gibi duruyor.`
- `Bu yetki sınırı olabilir.`

## Diagnostic Priority
Kayıt ilerlemiyorsa önce şu olasılıklar sıralanır:
- eksik araç/sürücü
- rota/durak eksik
- görev/vardiya durumu uygun değil
- GPS yok/eski
- operasyon kanıtı eksik
- sözleşme/vardiya üretimi yok
- hakediş için ödeme hesabı/komisyon/eksik bilgi var
- KVKK/yetki nedeniyle görünmüyor

Kesin veri yoksa Copilot yalnızca en olası sırayı söyler.

## Action Simulation
Copilot gerçek aksiyon çalıştırmaz. Şu dili kullanır:
- `Önce ... kontrol et; uygunsa ilgili ekrana geç.`
- `Bu ekranda yapabileceğin işlem:`
- `Bu işlem başka rolde yapılır:`
- `Bu işlem sende görünmüyorsa yetki/rol sınırı olabilir.`

Yasak örnekler:
- Ödeme başlatmaya yönlendirme
- Doğrudan çalıştırma iddiası
- Veriyi değiştirdim iddiası
- Ben bunu düzelttim iddiası

## Workflow Aileleri
- `Vardiya / Görev / Rota / GPS`
- `Sözleşme → Vardiya Üretimi`
- `Ticari Akış / Hakediş Önizleme`
- `Kalite / Güven / Değerlendirme`
- `Geri Bildirim / Bildirim / KVKK`
- `Mobil / Sürücü / Personel / Veli Canlı Takip`
- `Yetki / Rol / Sonraki Ekran`

## Intent Kapsamı
- `WHY_BLOCKED`
- `NEXT_STEP`
- `NEXT_SCREEN`
- `WHO_CAN_DO`
- `MISSING_DATA`
- `CONTRACT_TO_SHIFT`
- `PAYMENT_READINESS`
- `QUALITY_SIGNAL`
- `FEEDBACK_STATUS`
- `NOTIFICATION_SOURCE`
- `KVKK_VISIBILITY`
- `DRIVER_PHONE_GPS`

## Rol Sınırları
- `DRIVER`: kendi görev, rota, PIN, bildirim, Sürücünün telefon GPS’i.
- `PERSONEL`: kendi servis takibi, bugün ekranı, bildirim.
- `PARENT`: öğrencimin servisi ve görünürlük sınırı.
- `COMPANY / SCHOOL / ORGANIZATION`: kendi operasyon talepleri ve servis takip sınırı.
- `ROOM`: servis sağlayıcı, araç/sürücü, operasyon, ticari akış sınırı.
- `SUPER_ADMIN`: denetim, readonly hakediş, kalite, KVKK ve audit görünürlüğü.

## COP-03C-FIX-01
- Workflow cevapları `Bu ekran, ...` lead'i ile başlamaz.
- Selected-record mismatch guard, konu ile kayıt tipi uyuşmadığında bunu açıkça söyler.
- Workflow `contextSummary` kısa kalır; stale ekran amacı tekrar edilmez.
- Yetki sınırı workflow sinyalinin önüne geçmez; yan not olarak kalır.
- `summary` kısa konu etiketi taşır; ayrıntı `reply` içinde kalır.
- `Soru/cevap` akışında `Şimdi / Bu programda bunun anlamı / Neden? / Öneri / Sıradaki doğru işlem` korunur.

## COP-03C-FIX-02
- Workflow soruları ekran amacıyla başlamaz; canlı sinyal öne alınır.
- Vardiya, konum, hakediş, sözleşme ve operasyon sağlığı sorularında genel kayıt cümlesi geri planda kalır.
- Sözleşme ile vardiya, hakediş önizleme ve Sürücünün telefon GPS’i dili korunur.
- Workflow chip'leri bağlama göre değişir; `Bu kayıt ne durumda?` benzeri genel seçenekler otomatik öne çıkmaz.
- Durum onaylı ve hazır kayıtlar için ilk kontrol canlı başlatma zamanı, aktif durum, GPS ve operasyon kanıtı akışıdır.

## Sözlük
- `Sürücünün telefon GPS’i`
- `sözleşme`
- `Yeni route/schema/migration yok.`
