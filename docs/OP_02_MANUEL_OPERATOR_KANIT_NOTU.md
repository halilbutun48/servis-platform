# OP-02 Manuel Operatör Kanıt Notu

## 1. Amaç
- OP-01 readonly servis kanıtı / hizmet kanıtı omurgasının üstüne küçük ve güvenli bir manuel not katmanı eklemek.
- Bu doküman davranış değiştirmez; manuel not kabulünü ve görünür metni netleştirir.
- Hakediş için nihai karar değildir.

## 2. OP-01 ile ilişki
- OP-01 servis kanıtı ve hizmet kanıtı özetini okur.
- OP-02 manuel operatör notunu bu özetin destek sinyali olarak kullanır.
- OP-01 readonly omurga korunur; OP-02 yazma katmanı yalnızca manuel not içindir.

## 3. Manuel operatör notu nedir?
- Manuel operatör notu, servis kanıtı veya hizmet kanıtı için yetkili kullanıcının kısa açıklamasıdır.
- Bu not, MANUAL_OPERATOR_NOTE sinyali olarak özet içinde görünür.
- Not, biniş kaydı, Sürücünün telefon GPS’i ve Araç GPS’i yanında tamamlayıcı kanıttır.

## 4. Kim not ekleyebilir?
- SUPER_ADMIN
- ROOM
- COMPANY
- SCHOOL için COMPANY kapsamı üzerinden
- ORGANIZATION için COMPANY kapsamı üzerinden

## 5. Kim not ekleyemez?
- DRIVER
- PERSONEL
- PARENT

## 6. KVKK sınırı
- KVKK görünürlük sınırı korunur.
- Not metni gereksiz kişisel veri taşımaz.
- Sözleşme ve operasyon açıklamaları sade Türkçe kalır.
- Sürücünün telefon GPS’i ve Araç GPS’i ayrımı korunur.

## 7. Hakediş bağlantısı — şimdilik nihai karar değildir
- Manuel operatör notu hakediş için nihai karar değildir.
- Bu katman yalnızca servis kanıtı özetini güçlendirir.
- Nihai ödeme veya hakediş hesabı sonraki aşamaya bırakılır.

## 8. Kalite puanı bağlantısı — şimdilik pasif
- Kalite puanı şimdilik pasif kalır.
- Manuel not, kalite puanı hesaplamasını başlatmaz.
- Bu not yalnızca hizmet kanıtı için destek işaretidir.

## 9. Kabul checklist’i
- [ ] Manuel operatör notu eklenebiliyor.
- [ ] Servis kanıtı özetinde MANUAL_OPERATOR_NOTE sinyali görünüyor.
- [ ] Hizmet kanıtı özeti güvenli kalıyor.
- [ ] Kim not ekleyebilir sınırı açık.
- [ ] Kim not ekleyemez sınırı açık.
- [ ] KVKK görünürlük sınırı korunuyor.
- [ ] Sözleşme dili sade kalıyor.
- [ ] Sürücünün telefon GPS’i dili korunuyor.
- [ ] Hakediş için nihai karar değildir metni görünüyor.
- [ ] Kalite puanı şimdilik pasif kalıyor.
- [ ] Kabul edildi / Eksik / Tekrar kontrol sonucu not edilebiliyor.

## 10. Kabul komutları
- `npm run check:m99kvkk01`
- `npm run check:m99ux01`
- `npm run check:op01`
- `npm run check:op02`
- `npm run verify:final`

## 11. Sık hata / ilk bakılacak yerler
- Not boşsa önce trim ve uzunluk kontrolü bakılır.
- Not 500 karakteri geçerse kısaltılır veya reddedilir.
- Manuel not görünmüyorsa summary kaynağı ve cache temizliği kontrol edilir.
- Hakediş için nihai karar değildir metni yoksa doküman ve response eşleşmesi kontrol edilir.
- Runtime JSON dosyaları değiştiyse commit’e alınmaz.
