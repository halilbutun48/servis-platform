# OP-03 Web’de Servis Kanıtı / Manuel Not Kartı

## 1. Amaç
- OP-01 ve OP-02 ile gelen servis kanıtı özetini web operasyon yüzeylerinde küçük ve anlaşılır bir kart olarak göstermek.
- Manuel operatör notunu tek bir yerde toplamak.
- Bu milestone davranış değiştirmez; küçük kart ve kabul paketi olarak çalışır.

## 2. OP-01 ve OP-02 ile ilişki
- OP-01 readonly servis kanıtı / hizmet kanıtı omurgasıdır.
- OP-02 manuel operatör notu katmanıdır.
- OP-03 bu iki katmanı web’de küçük bir kartta görünür yapar.
- Hakediş için nihai karar değildir.

## 3. Web kartı nerede görünür?
- Company operasyon panelinde görünür.
- School operasyon panelinde görünür.
- Room operasyon panelinde görünür.
- Super Admin operasyon panelinde görünür.
- Organization company-kind akışı aynı company panel görünümünü kullanır.

## 4. Kullanıcı ne görür?
- Başlık: Servis Kanıtı
- Alt açıklama: Bu özet hakediş için nihai karar değildir.
- Durum etiketi ve kısa kontrol listesi
- Sade sinyal etiketleri
- Manuel not alanı

## 5. Manuel operatör notu nasıl çalışır?
- Yetkili kullanıcı kısa not yazar.
- Not kaydedilince Operatör notu kaydedildi. mesajı görünür.
- Not 500 karakteri geçmez.
- Kart refresh olmadan ağır liste açmaz.

## 6. Kim görebilir?
- SUPER_ADMIN
- COMPANY
- SCHOOL
- ROOM
- ORGANIZATION

## 7. Kim göremez?
- DRIVER
- PERSONEL
- PARENT

## 8. KVKK sınırı
- KVKK görünürlük sınırı korunur.
- Ham GPS koordinatı gösterilmez.
- Ham token, hash, payload ve teknik debug metinleri gösterilmez.
- Sürücünün telefon GPS’i ve Araç GPS’i gibi sade görünür metinler kullanılır.
- Sözleşme dili korunur.

## 9. Hakediş bağlantısı — nihai karar değildir
- Bu kart hakediş için nihai karar değildir.
- Sadece servis kanıtı ve hizmet kanıtı özetini sade biçimde gösterir.
- Hakediş hesabı OP-03’te yapılmaz.

## 10. Kalite puanı bağlantısı — şimdilik pasif
- Kalite puanı şimdilik pasif kalır.
- Bu kart kalite puanı hesaplamaz.
- Kalite değerlendirmesi sonraki adımda ele alınır.

## 11. Kabul checklist’i
- [ ] Servis Kanıtı kartı görünüyor.
- [ ] Bu özet hakediş için nihai karar değildir. metni görünüyor.
- [ ] Kısa operatör notu yazın alanı görünüyor.
- [ ] Notu kaydet aksiyonu görünüyor.
- [ ] Operatör notu kaydedildi. mesajı görünüyor.
- [ ] Sürücünün telefon GPS’i etiketi görünüyor.
- [ ] Araç GPS’i etiketi görünüyor.
- [ ] Biniş kaydı etiketi görünüyor.
- [ ] Company operasyon panelinde kart görünüyor.
- [ ] School operasyon panelinde kart görünüyor.
- [ ] Room operasyon panelinde kart görünüyor.
- [ ] Super Admin operasyon panelinde kart görünüyor.
- [ ] Ham token/hash/payload kullanıcıya görünmüyor.
- [ ] Hakediş için nihai karar değildir dili korunuyor.
- [ ] Kabul edildi / Eksik / Tekrar kontrol alanı doldurulabiliyor.

## 12. Kabul komutları
```bash
npm run check:m99kvkk01
npm run check:m99ux01
npm run check:op01
npm run check:op02
npm run check:op03
npm run check:web-mobile
npm run lint:web
npm run verify:final
```

## 13. Sık hata / ilk bakılacak yerler
- Kart hiç görünmüyorsa yetki ve scope kontrol edilir.
- Yetki yoksa Bu özet için yetkiniz yok. mesajı beklenir.
- Not kaydı başarısızsa API yanıtı sade Türkçe olmalıdır.
- Ağır liste gerekiyorsa bu kart değil, sonraki panel açılır.
- Runtime JSON dosyaları değişirse commit’e alınmaz.
