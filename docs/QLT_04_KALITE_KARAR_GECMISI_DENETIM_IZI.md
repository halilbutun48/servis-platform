# QLT-04 Kalite Karar Geçmişi / Denetim İzi

## 1. Amaç
QLT-04, QLT-03 ile verilen kalite inceleme kararlarının geçmişini küçük ve güvenli şekilde görünür yapmak içindir. Bu doküman davranış değiştirmez; kabul ve metin rehberidir.

## 2. QLT-01 / QLT-02 / QLT-03 ile ilişki
- QLT-01, Servis Kanıtı ve Hizmet Kanıtı hazırlık omurgasıdır.
- QLT-02, Taslak kalite skoru üretir.
- QLT-03, kalite inceleme kararı verir.
- QLT-04, bu kararların Kalite karar geçmişi ve Denetim izi görünümünü sağlar.

## 3. Kalite karar geçmişi nedir?
Kalite karar geçmişi, son kalite kararlarının küçük bir listesi demektir. Bu listede Son kalite kararı görünür ve her kayıt güvenli özetle gösterilir.

## 4. Denetim izi nedir?
Denetim izi, hangi kararı kimin verdiğini güvenli biçimde gösteren görünürlüktür. Ham payload, token, hash ve debug bilgileri görünmez.

## 5. Kesin kalite puanı değildir
- Bu geçmiş kesin kalite puanı değildir.
- Bu geçmiş hakediş veya komisyon hesabını etkilemez.
- Settlement aktif değildir.
- Komisyon hesaplama aktif değildir.

## 6. Sağlayıcı sıralaması değildir
- Sağlayıcı sıralaması değildir.
- Otomatik ranking yoktur.
- Sağlayıcıları kendiliğinden yukarı aşağı dizmez.

## 7. Hakediş / komisyon etkisi yoktur
Bu geçmiş yalnızca denetim görünürlüğü sağlar. Taslak kalite skoru ve kalite inceleme kararı okunur; sonuç hakediş veya komisyon kararı değildir.

## 8. Kim görebilir?
- SUPER_ADMIN
- ROOM
- COMPANY
- SCHOOL
- ORGANIZATION

## 9. Kim göremez?
- DRIVER
- PERSONEL
- PARENT

## 10. KVKK sınırı
KVKK görünürlük sınırı korunur. Sürücünün telefon GPS’i, Araç GPS’i, Biniş kaydı, Operatör notu, Geri bildirim ve Şikayet sinyalleri yalnız güvenli özetle gösterilir.

## 11. Geçmiş kayıt sınırı
- En fazla son 10 kayıt tutulur.
- Ekranda en fazla son 5 kayıt gösterilir.
- Not önizlemesi kısa tutulur.
- Kalite karar geçmişi henüz yoksa boş durum metni görünür.

## 12. QLT hattı kapanış notu
QLT-01 hazırlık, QLT-02 taslak skor, QLT-03 denetimli karar ve QLT-04 karar geçmişi / denetim izi birlikte QLT hattını oluşturur. Bu hat, kalıcı bir kesin kalite puanı üretmez.

## 13. PAY-01 için etkisi — şimdilik yok
Bu geçmiş ödeme, settlement veya komisyon hesabını etkilemez.

## 14. Kabul checklist’i
- [ ] Kalite karar geçmişi görünür.
- [ ] Denetim izi görünür.
- [ ] Son kalite kararı görünür.
- [ ] Kalite inceleme kararı görünür.
- [ ] İncelendi görünür.
- [ ] Tekrar kontrol gerekli görünür.
- [ ] Şimdilik dikkate alınmadı görünür.
- [ ] Bu geçmiş kesin kalite puanı değildir.
- [ ] Bu geçmiş hakediş veya komisyon hesabını etkilemez.
- [ ] Sağlayıcı sıralaması değildir.
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
npm run check:qlt04
npm run verify:final
```

## 16. Sık hata / ilk bakılacak yerler
- Kalite karar geçmişi boş görünüyorsa önce QLT-03 kararı var mı bakılır.
- Görünür metinde teknik İngilizce kalmışsa sade Türkçe ile değiştirilir.
- Geçmişte ham payload ya da debug görünüyorsa sadece güvenli özet alanları bırakılır.
- Yetki yoksa rol kapsamı ve endpoint erişimi kontrol edilir.
- Runtime JSON yanlışlıkla commit edilirse çalışma ağacından geri alınır.
