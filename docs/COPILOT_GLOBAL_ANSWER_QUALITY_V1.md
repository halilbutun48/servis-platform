# COPILOT Global Answer Quality V1

Bu doküman, Copilot’un tüm rol ve ekranlarda aynı güvenli cevap standardını koruması için tek resmi referanstır.

## Amaç
- Workflow sorularında ekran amacı yerine gerçek sinyal önce okunur.
- Görünür dil sade, Türkçe ve güvenlidir.
- Copilot sadece rehberlik eder; gerçek işlem çalıştırmaz.

## Global Görünür Dil Standardı
- Kullanıcı cevabında teknik ham dil görünmez.
- `Sözleşme` kullanılır; başka terimle değiştirilmez.
- GPS dili şu dört ifadeyle kalır:
  - `Araç GPS’i`
  - `Sürücünün telefon GPS’i`
  - `GPS bekleniyor`
  - `GPS eski`
- `Operasyon kanıtı` görünür dilde kullanılabilir.
- `readiness`, `workflow`, `route`, `state` gibi iç etiketler kullanıcı cevabını yönetmez.

## Workflow Intent Standardı
Bu soru aileleri doğrudan ilgili workflow cevabına düşer:
- `neden görünmüyor?`
- `neden başlamıyor?`
- `neden hazır değil?`
- `sorun ne?`
- `bugün üretildi mi?`
- `neden işlem olmuyor?`
- `ne eksik?`
- `vardiya neden başlayamıyor?`
- `hakediş neden hazır değil?`
- `sözleşmeden bugün vardiya üretildi mi?`

Workflow aileleri:
- `Vardiya / Görev / Rota / GPS`
- `Sözleşme → Vardiya Üretimi`
- `Firma / Sözleşmeler` yüzeyinde `Kaynak vardiya`, `Üretilen vardiya` ve `Son üretilen vardiya` köprüsü birlikte taşınır.
- `Ticari Akış / Hakediş Önizleme`
- `Kalite / Güven / Değerlendirme`
- `Geri Bildirim / Bildirim / KVKK`
- `Mobil / Sürücü / Personel / Veli Canlı Takip`
- `Yetki / Rol / Sonraki Ekran`

Bu cevaplar gerektiğinde şu konulara bağlanır:
- GPS ve harita görünürlüğü
  - “Bu araç neden haritada görünmüyor?”
- vardiya başlatma engeli
- hakediş önizleme
- “Bu hakediş neden hazır değil?”
- sözleşme → vardiya üretimi
- “Bu sözleşmeden bugün vardiya üretildi mi?”
- operasyon sağlığı
- kalite ve güven
- geri bildirim, bildirim ve KVKK sınırları

## Yetki Sınırı Kuralı
- `Yetki sınırını kontrol et` default sıradaki işlem değildir.
- Bu ifade sadece gerçek yetki sinyali varsa kullanılır.
- Gerçek sinyaller:
  - `401`
  - `403`
  - izin sinyali
  - rol sınırı
  - KVKK görünürlük sınırı

## Default Sıradaki İşlem
- Operasyon Sağlığı: `Riskli cihazı aç` ve `stale/offline` satırını kontrol et.
- Vardiya: `Başlatma zamanı` ve `aktif durum` uygunsa `GPS` ve `operasyon kanıtı` akışını kontrol et.
- GPS: `Son GPS zamanı`, `araç bağlantısı`, `görev bağlantısı` ve `Sürücünün telefon GPS’i` durumunu kontrol et.
- Hakediş: `Eksik bilgi`, `ödeme hesabı` ve `komisyon` durumunu kontrol et.
- Sözleşme: `Üretim geçmişi` veya `bugünkü vardiyalar` listesini kontrol et.

## Role-Wide Screen Matrix
- `Super Admin / Canlı İzleme`
- `Super Admin / Ticari Akış`
- `Super Admin / Operasyon Doğrulama`
- `Super Admin / Güven ve Kalite`
- `Oda / Operasyon Sağlığı`
- `Oda / Vardiyalar`
- `Oda / Canlı Takip`
- `Firma / Sözleşmeler`
- `Firma / Vardiyalar`
- `Okul / Canlı Takip`
- `Personel / Canlı takip`
- `Veli / Öğrencimin servisi`
- `Sürücü / Bugünkü görev`

## Chip Policy
- Workflow cevaplarında genel chipler otomatik/default çıkmaz.
- Konuya özel chipler öne çıkar.
- Generic chipler workflow cevaplarını geri plana iterse filtrelenir.

Özel chip kümeleri:
- GPS: `Son GPS ne zaman geldi?`, `Sürücünün telefon GPS’i devrede mi?`, `Araç bağlantısı var mı?`, `Canlı takip ekranını aç`
- Vardiya: `Başlatma zamanı uygun mu?`, `Araç/sürücü bağlantısını kontrol et`, `GPS/operasyon kanıtını kontrol et`, `Rota/durak hazır mı?`
- Sözleşme: `Üretim geçmişini göster`, `Bugünkü vardiyaları göster`, `İlgili sözleşmeyi aç`, `Üretim durumunu açıkla`
- Hakediş: `Eksik bilgi ne?`, `Ödeme hesabı var mı?`, `Komisyon durumu ne?`, `Hakediş önizlemesini aç`
- Operasyon Sağlığı: `Riskli cihazı göster`, `Stale/offline satırını aç`, `Açık sorunları sırala`, `Aktif sürücüleri kontrol et`
- Kalite/Güven: `Açık kalite sinyallerini göster`, `Son değerlendirmeyi aç`, `Risk nedenini açıkla`, `Kanıt durumunu kontrol et`
- KVKK/Rol: `KVKK sınırını açıkla`, `Bu rolde ne görünür?`, `Erişim neden kapalı?`, `Yetkili ekrana yönlendir`

## KVKK / Rol Notu
- Personel, veli ve sürücü yalnız kendi kapsamındaki görünürlüğü görür.
- Yönetim aksiyonu yalnız yetkili rolde ve görünür sinyalle önerilir.

## Hakediş Sınırı
- Hakediş yalnız readonly preview olarak anlatılır.
- Aktif ödeme yok.
- Aktif settlement aksiyonu yok.
- Ödeme başlatma dili yok.

## COP-03C-FIX-03 Koruması
- `JOB_TYPE_ENTITY_MISMATCH` kullanıcıya görünmez.
- `OperationProof` kullanıcıya görünmez; `operasyon kanıtı` kullanılır.
- Canlı Takip ve araç görünmeme soruları GPS / görünürlük yoluna düşer.
- Operasyon Sağlığı aktif sürücü, riskli cihaz, stale/offline ve açık sorun sinyallerini kullanır.
