# OP-04 Kanıt Durumu Ticari/Kalite Readonly Köprü

## 1. Amaç
Servis Kanıtı / Hizmet Kanıtı özetini ticari ve kalite yüzeylerine readonly olarak bağlamak.
Bu doküman davranış değiştirmez; yalnızca görünür köprü ve kabul paketi anlatır.

## 2. OP-01 / OP-02 / OP-03 ile ilişki
- OP-01 readonly servis kanıtı omurgasını kurdu.
- OP-02 manuel operatör notu katmanını ekledi.
- OP-03 bu özeti küçük web kartı ile görünür kıldı.
- OP-04 bu yapıyı ticari ve kalite yüzeylerine readonly köprü olarak taşır.

## 3. Ticari katmana readonly bağ ne demek?
Ticari ekranda servis kanıtı yalnızca özet bilgi olarak görünür.
Settlement aktif değildir.
Komisyon hesaplama aktif değildir.
Bu bilgi hakediş için nihai karar değildir.

## 4. Kalite katmanına readonly bağ ne demek?
Kalite ekranında servis kanıtı yalnızca destekleyici işaret olarak görünür.
Kalite puanı şimdilik pasif kalır.
Bu bilgi tek başına kalite puanı değildir.

## 5. Ne aktifleşmedi?
- Settlement aktif değildir.
- Komisyon hesaplama aktif değildir.
- Kalite puanı hesaplaması aktif değildir.
- Yeni write endpoint eklenmez.
- Yeni Prisma model eklenmez.

## 6. Kullanıcı ne görür?
- Servis Kanıtı
- Hizmet Kanıtı
- Kanıt bekleniyor
- Kanıt kısmi
- Kanıt denetime hazır
- Tekrar kontrol gerekli
- Sürücünün telefon GPS’i
- Araç GPS’i
- Biniş kaydı
- Operatör notu

## 7. KVKK sınırı
KVKK görünürlük sınırı korunur.
Ham GPS koordinatı, token, hash, raw payload görünmez.
Sözleşme dili korunur; kullanıcı yüzeyinde teknik İngilizce terimler kullanılmaz.

## 8. Hakediş bağlantısı — nihai karar değildir
Servis Kanıtı ticari karar için destek sağlar.
Hakediş için nihai karar değildir.

## 9. Kalite puanı bağlantısı — şimdilik pasif
Servis Kanıtı kalite değerlendirmesine yardımcı olur.
Kalite puanı şimdilik pasif kalır.

## 10. PAY-01 için hazırlık
Bu köprü, ileride PAY-01 için kullanılacak ticari sinyalleri görünür ve güvenli biçimde hazırlar.

## 11. QLT-01 için hazırlık
Bu köprü, ileride QLT-01 için kullanılacak kalite sinyallerini görünür ve güvenli biçimde hazırlar.

## 12. Kabul checklist’i
- [ ] Servis Kanıtı kartı ticari yüzeyde görünüyor.
- [ ] Servis Kanıtı kartı kalite yüzeyde görünüyor.
- [ ] Hakediş için nihai karar değildir metni görünüyor.
- [ ] Kalite puanı şimdilik pasif metni görünüyor.
- [ ] Sürücünün telefon GPS’i dili korunuyor.
- [ ] Araç GPS’i dili korunuyor.
- [ ] Biniş kaydı dili korunuyor.
- [ ] Operatör notu dili korunuyor.
- [ ] KVKK görünürlük sınırı açıklanıyor.
- [ ] Settlement aktif değildir ve komisyon hesaplama aktif değildir mesajı korunuyor.
- [ ] Kabul edildi / Eksik / Tekrar kontrol alanı var.

## 13. Kabul komutları
```bash
npm run check:m99kvkk01
npm run check:m99ux01
npm run check:op01
npm run check:op02
npm run check:op03
npm run check:op04
npm run check:web-mobile
npm run lint:web
npm run verify:final
```

## 14. Sık hata / ilk bakılacak yerler
- Kanıt kartı görünmüyorsa ilgili panel importu kontrol edilir.
- Özet yüklenmiyorsa `/api/operation-proof/summary` yetkisi kontrol edilir.
- Yetki yoksa kullanıcıya teknik hata değil, sade mesaj gösterilir.
- Settlement aktif görünüyorsa OP-04 readonly köprü kontrol edilir.
- Runtime JSON dosyaları değişirse commit’e alınmaz.
