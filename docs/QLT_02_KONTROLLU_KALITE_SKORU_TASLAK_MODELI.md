# QLT-02 Kontrollü Kalite Skoru Taslak Modeli

## 1. Amaç
- Servis Kanıtı / Hizmet Kanıtı ve QLT-01 kalite sinyallerinden kontrollü bir taslak kalite skoru üretmek.
- Bu milestone davranış değiştirmez; readonly taslak ve kabul paketidir.
- Kesin kalite puanı üretmez.

## 2. QLT-01 ile ilişki
- QLT-01 hazırlık omurgası bu taslak skorun temelidir.
- QLT-02, OP-01 / OP-02 / OP-03 / OP-04 evidence chain üzerinden gelen sinyalleri inceleme yardımına çevirir.
- QLT-03 kontrollü kalite inceleme akışı bu bandın sonraki adımıdır.

## 3. Taslak kalite skoru nedir?
- Taslak kalite skoru, servis kanıtı ve kalite sinyallerini tek bir inceleme özeti haline getirir.
- Bu skor kesin karar değildir.
- Denetime hazır öneri üretir.

## 4. Kesin kalite puanı değildir
- Bu skor kesin kalite puanı değildir.
- Kullanıcıya nihai puan gibi gösterilmez.
- Görünür karar yerine inceleme yardımcısıdır.

## 5. Sağlayıcı sıralaması değildir
- Sağlayıcı sıralaması değildir.
- Otomatik ranking üretmez.
- Sağlayıcıları kendi başına yukarı / aşağı sıralamaz.

## 6. Hakediş / komisyon etkisi yoktur
- Bu skor hakediş veya komisyon hesabını etkilemez.
- Settlement aktif değildir.
- Komisyon hesaplama aktif değildir.
- Hakediş akışına yalnız hazırlık sinyali sağlar.

## 7. Kullanıcı ne görür?
- Taslak kalite skoru
- Denetime hazır öneri
- Operasyon kanıtı kalite incelemesine yardımcı olur.
- Sağlayıcı karşılaştırması için hazırlık
- Bu skor kesin kalite puanı değildir
- Bu skor hakediş veya komisyon hesabını etkilemez
- Servis kanıtı kalite değerlendirmesine yardımcı olur
- Skor bandı ve kısa açıklama

## 8. KVKK sınırı
- KVKK görünürlük sınırı korunur.
- Ham GPS koordinatı, token, hash, payload ve debug alanları görünür kullanıcı metni olarak gösterilmez.
- `Sürücünün telefon GPS’i` ve `Sözleşme` dili korunur.

## 9. Skor sinyalleri
- Servis Kanıtı
- Hizmet Kanıtı
- Sürücünün telefon GPS’i
- Araç GPS’i
- Biniş kaydı
- Operatör notu
- Geri bildirim
- Şikayet

## 10. Denetim ve tekrar kontrol akışı
- Taslak skor, denetim öncesi hazırlık için kullanılır.
- Eksik sinyal varsa tekrar kontrol gerekir.
- Şikayet veya geciken kanıt varsa inceleme önceliği artar.

## 11. QLT-03 için hazırlık
- QLT-03 kontrollü kalite inceleme akışı, bu taslak skorun üstündeki sonraki görünür katmandır.
- Bu milestoneda otomatik karar yoktur.
- QLT-03'e geçmeden önce güvenli readonly hazırlık korunur.

## 12. PAY-01 için etkisi — şimdilik yok
- Bu skor PAY-01 için yalnızca hazırlık sinyali sağlar.
- Hakediş veya komisyon hesabını etkilemez.
- Settlement aktif değildir.

## 13. Kabul checklist’i
- [ ] Taslak kalite skoru görünür.
- [ ] Denetime hazır öneri görünür.
- [ ] Bu skor kesin kalite puanı değildir metni görünür.
- [ ] Bu skor hakediş veya komisyon hesabını etkilemez metni görünür.
- [ ] Sağlayıcı sıralaması değildir metni görünür.
- [ ] Servis Kanıtı ve Hizmet Kanıtı sinyalleri görünür.
- [ ] Sürücünün telefon GPS’i dili korunur.
- [ ] Araç GPS’i dili korunur.
- [ ] Biniş kaydı dili korunur.
- [ ] Operatör notu dili korunur.
- [ ] Geri bildirim ve Şikayet sinyalleri görünür.
- [ ] KVKK görünürlük sınırı korunur.
- [ ] Settlement aktif değildir.
- [ ] Komisyon hesaplama aktif değildir.
- [ ] Kabul edildi / Eksik / Tekrar kontrol sonucu kullanılabilir.

## 14. Kabul komutları
- `npm run check:m99kvkk01`
- `npm run check:m99ux01`
- `npm run check:op01`
- `npm run check:op02`
- `npm run check:op03`
- `npm run check:op04`
- `npm run check:qlt01`
- `npm run check:qlt02`
- `npm run check:web-mobile`
- `npm run lint:web`
- `npm run verify:final`

## 15. Sık hata / ilk bakılacak yerler
- Görünür metinde `driver GPS` veya `agreement` kaldıysa sade Türkçe karşılığa çevrilir.
- Taslak skor kesin puan gibi görünüyorsa `taslak` dili güçlendirilir.
- Sağlayıcı sıralaması veya otomatik karar görünüyorsa kaldırılır.
- Hakediş / komisyon aktif görünüyorsa bu yalnız hazırlık katmanıdır.
- Kanıt ve kalite sinyalleri boşsa önce OP-01 / OP-02 / OP-03 / OP-04 hattı kontrol edilir.
- Runtime JSON dosyaları değişirse commit’e alınmaz.
