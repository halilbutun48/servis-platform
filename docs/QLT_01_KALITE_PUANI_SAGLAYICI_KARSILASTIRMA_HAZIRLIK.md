# QLT-01 Kalite Puanı ve Sağlayıcı Karşılaştırması Hazırlık Omurgası

## 1. Amaç
- Kalite puanı hazırlığı ve sağlayıcı karşılaştırması için güvenli bir hazırlık katmanı kurmak.
- Bu milestone davranış değiştirmez; readonly hazırlık ve kabul paketidir.
- Kesin puan üretmez.

## 2. OP-01 / OP-04 ile ilişki
- OP-01 readonly Servis Kanıtı / Hizmet Kanıtı omurgası bu hazırlığın temelidir.
- OP-02 manuel operatör notu, OP-03 küçük kart ve OP-04 ticari/kalite readonly köprü bu hazırlığı besler.
- OP-01→OP-04 evidence chain, QLT-01 için güvenli veri omurgasını oluşturur.

## 3. Kalite puanı hazırlığı ne demek?
- Servis kanıtı kalite değerlendirmesine yardımcı olur.
- Görülen sinyaller, kesin puan değil aday sinyaldir.
- Sağlayıcı karşılaştırması için hazırlık, nihai karar yerine inceleme zeminidir.

## 4. Sağlayıcı karşılaştırması hazırlığı ne demek?
- Aynı hizmet hattındaki sağlayıcıların hangi sinyallerle hazırlık seviyesinde olduğunu görmek demektir.
- Otomatik sıralama yoktur.
- Sağlayıcı karşılaştırması için hazırlık, karar destek yüzeyidir.

## 5. Ne aktifleşmedi?
- Kesin skor hesaplama aktifleşmedi.
- Sağlayıcı sıralama aktifleşmedi.
- Hakediş aktifleşmedi.
- Settlement aktif değildir.
- Komisyon hesaplama aktif değildir.
- Kalite puanı tek başına nihai karar olmaz.

## 6. Kullanıcı ne görür?
- Kalite puanı hazırlığı
- Servis kanıtı kalite değerlendirmesine yardımcı olur.
- Bu bilgi tek başına kalite puanı değildir.
- Kesin puan değildir.
- Sinyaller ve kısa checklist satırları

## 7. KVKK sınırı
- KVKK görünürlük sınırı korunur.
- Ham GPS koordinatı, token, hash, payload ve debug alanları görünür kullanıcı metni olarak gösterilmez.
- `Sürücünün telefon GPS’i` ve `Sözleşme` dili korunur.

## 8. Hakediş bağlantısı — yok / pasif
- Bu bilgi hakediş için nihai karar değildir.
- Hakediş pasif kalır.
- Settlement aktif değildir.

## 9. Kesin puan değildir
- Kalite puanı hazırlığı, kesin puan değildir.
- Bu görünüm yalnız aday sinyal ve inceleme yardımcısıdır.

## 10. QLT-02 için hazırlık
- QLT-02, daha sonra gerçek kalite puanı karar kapısını açarsa orada konuşulur.
- Bu milestoneda yalnız hazırlık omurgası vardır.

## 11. PAY-01 için etkisi
- Bu hazırlık, PAY-01'e geçmeden önce kanıt ve kalite görünürlüğünü hazırlar.
- Komisyon hesaplama aktif değildir.
- Ödeme akışına doğrudan bağlı nihai karar üretmez.

## 12. Kabul checklist’i
- [ ] Kalite puanı hazırlığı görünür.
- [ ] Sağlayıcı karşılaştırması için hazırlık görünür.
- [ ] Servis kanıtı kalite değerlendirmesine yardımcı olur metni görünür.
- [ ] Bu bilgi tek başına kalite puanı değildir metni görünür.
- [ ] Kesin puan değildir metni görünür.
- [ ] Sürücünün telefon GPS’i dili korunur.
- [ ] Araç GPS’i dili korunur.
- [ ] Biniş kaydı dili korunur.
- [ ] Operatör notu dili korunur.
- [ ] Geri bildirim dili korunur.
- [ ] KVKK görünürlük sınırı korunur.
- [ ] Hakediş pasif kalır.
- [ ] Settlement aktif değildir.
- [ ] Komisyon hesaplama aktif değildir.
- [ ] Kabul edildi / Eksik / Tekrar kontrol sonucu kullanılabilir.

## 13. Kabul sonucu alanı
- Kabul edildi / Eksik / Tekrar kontrol
- Test eden
- Tarih
- Notlar

## 14. Kabul komutları
- `npm run check:m99kvkk01`
- `npm run check:m99ux01`
- `npm run check:op01`
- `npm run check:op02`
- `npm run check:op03`
- `npm run check:op04`
- `npm run check:qlt01`
- `npm run check:web-mobile`
- `npm run lint:web`
- `npm run verify:final`

## 15. Sık hata / ilk bakılacak yerler
- Görünür metinlerde `driver GPS` veya `agreement` varsa sade Türkçe karşılığa çevrilir.
- Kesin puan veya otomatik sıralama görünüyorsa kaldırılır.
- Hakediş veya komisyon aktifleşmiş gibi gösteriliyorsa bu sadece hazırlık katmanıdır.
- Kanıt ve kalite sinyalleri boşsa önce OP-01/OP-02/OP-03/OP-04 hattı kontrol edilir.
- Runtime JSON dosyaları değişirse commit’e alınmaz.
