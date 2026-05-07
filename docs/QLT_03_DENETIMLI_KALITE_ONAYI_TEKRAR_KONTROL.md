# QLT-03 Denetimli Kalite Onayı / Tekrar Kontrol

## 1. Amaç
QLT-03, QLT-02 ile oluşan taslak kalite skorunu yetkili kişinin kısa ve güvenli şekilde denetlemesi için vardır. Bu doküman davranış değiştirmez; sadece kabul ve metin rehberidir.

## 2. QLT-01 ve QLT-02 ile ilişki
- QLT-01, Servis Kanıtı ve Hizmet Kanıtı hazırlık omurgasıdır.
- QLT-02, Taslak kalite skoru üretir.
- QLT-03, bu taslak skor üstünde denetimli kalite inceleme kararı verir.
- Kesin kalite puanı üretmez.
- Sağlayıcı sıralaması değildir.

## 3. Denetimli kalite kararı nedir?
Kalite inceleme kararı, yetkili kişinin taslak kalite skorunu okuyup küçük bir karar vermesidir. Bu karar sadece inceleme sürecini görünür yapar.

## 4. Kesin kalite puanı değildir
- Bu karar kesin kalite puanı değildir.
- Bu karar hakediş veya komisyon hesabını etkilemez.
- Settlement aktif değildir.
- Komisyon hesaplama aktif değildir.

## 5. Sağlayıcı sıralaması değildir
- Sağlayıcı sıralaması değildir.
- Otomatik ranking yoktur.
- Sağlayıcıları kendiliğinden yukarı aşağı dizmez.

## 6. Hakediş / komisyon etkisi yoktur
Kalite inceleme kararı, ödeme veya hakediş hesabına doğrudan girmez. Sadece Servis Kanıtı ve Hizmet Kanıtı üstünden denetim akışını görünür tutar.

## 7. Kim karar verebilir?
- SUPER_ADMIN
- ROOM
- COMPANY
- SCHOOL
- ORGANIZATION

## 8. Kim karar veremez?
- DRIVER
- PERSONEL
- PARENT

## 9. KVKK sınırı
KVKK görünürlük sınırı korunur. Ham GPS koordinatı, token, hash, raw payload ve benzeri teknik alanlar kullanıcıya gösterilmez. Görünür metinde Sürücünün telefon GPS’i ve Araç GPS’i dili korunur.

## 10. Karar durumları
- REVIEW_PENDING
- REVIEWED
- NEEDS_RECHECK
- IGNORED_FOR_NOW

Görünür Türkçe karşılıklar:
- Kalite incelemesi bekliyor
- İncelendi
- Tekrar kontrol gerekli
- Şimdilik dikkate alınmadı
- Bu karar kesin kalite puanı değildir
- Bu karar hakediş veya komisyon hesabını etkilemez

## 11. Denetim notu
Yetkili kişi kısa bir inceleme notu bırakabilir. Not, Servis Kanıtı ve Hizmet Kanıtı ile birlikte okunur. Mevcut operasyon doğrulama kayıt yapısı QLT-03 durumlarını taşımadığı için küçük bir güvenli JSON adapter kullanılır; kalıcı DB/model açılmaz.

## 12. QLT-04 için hazırlık
QLT-04, bu denetimli kararın daha derin inceleme ve görünürlük katmanı olabilir. QLT-03 yalnızca denetim kararını görünür kılar.

## 13. PAY-01 için etkisi — şimdilik yok
Bu karar ödeme, settlement veya komisyon hesabını etkilemez.

## 14. Kabul checklist’i
- [ ] Kalite incelemesi bekliyor görünür.
- [ ] İncelendi görünür.
- [ ] Tekrar kontrol gerekli görünür.
- [ ] Şimdilik dikkate alınmadı görünür.
- [ ] Taslak kalite skoru ile ilişki açık.
- [ ] Servis Kanıtı görünür.
- [ ] Hizmet Kanıtı görünür.
- [ ] Sürücünün telefon GPS’i dili korunur.
- [ ] Araç GPS’i dili korunur.
- [ ] Biniş kaydı görünür.
- [ ] Operatör notu görünür.
- [ ] Geri bildirim görünür.
- [ ] Şikayet görünür.
- [ ] KVKK görünürlük sınırı korunur.
- [ ] Settlement aktif değildir.
- [ ] Komisyon hesaplama aktif değildir.
- [ ] Kabul edildi / Eksik / Tekrar kontrol alanı vardır.

## 15. Kabul komutları
```bash
npm run check:m99kvkk01
npm run check:m99ux01
npm run check:op01
npm run check:op02
npm run check:op03
npm run check:op04
npm run check:qlt01
npm run check:qlt02
npm run check:qlt03
npm run verify:final
```

## 16. Sık hata / ilk bakılacak yerler
- İlk şifre ekranı açılmıyorsa QLT-03 ile değil, M98-E1 `passwordChangeRequired` akışı kontrol edilir.
- Görünür metinde teknik İngilizce kalmışsa sade Türkçe ile değiştirilir.
- Kalite inceleme kararı kaydedilemiyorsa rol yetkisi ve kapsam bilgisi kontrol edilir.
- Güvenli JSON adapter yanlışlıkla commit edilirse çalışma ağacından geri alınır.
