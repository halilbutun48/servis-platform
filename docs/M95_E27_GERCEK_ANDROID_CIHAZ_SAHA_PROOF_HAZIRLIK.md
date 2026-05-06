# M95-E27 Gerçek Android Cihaz Saha Proof Hazırlık

## 1. Amaç
- Gerçek Android cihaz saha proof öncesi hazırlığı netleştirmek.
- Bu doküman testin kendisi değil, test öncesi kanıt planıdır.
- Emülatör smoke sonrası gerçek cihaz kapısına geçiş kontrolüdür.

## 2. Ön koşullar
- [ ] Repo temiz.
- [ ] verify:final geçiyor.
- [ ] M95-E25 kabul checklist’i hazır.
- [ ] M95-E26 emulator smoke planı hazır.
- [ ] Backend Docker veya local çalışma şekli net.
- [ ] API base gerçek cihaz için local ağ IP veya güvenli HTTPS endpoint olacak.
- [ ] 10.0.2.2 sadece emulator içindir, gerçek cihaz için kullanılmaz.
- [ ] Runtime JSON dosyaları commit’e alınmayacak.
- [ ] PIN veya şifre ve token loglanmayacak.

## 3. Cihaz bilgisi kanıtı
- Cihaz marka/model
- Android sürümü
- Uygulama build profili
- APK/AAB tipi
- Release stage
- API base
- Test tarihi
- Test eden kişi
- Backend çalıştırma şekli
- Ağ türü: Wi-Fi / mobil veri / zayıf ağ

## 4. APK / build profili kontrolü
- [ ] local-apk sadece emülatör/lokal test içindir.
- [ ] preview-internal gerçek cihaza uygun iç test profili olarak kullanılabilir.
- [ ] production HTTPS guard korunur.
- [ ] Gerçek cihazda 10.0.2.2 kullanılmaz.
- [ ] Gerçek cihaz API base local ağ IP’si veya HTTPS olmalıdır.
- [ ] /api çiftlenmesi olmamalıdır.
- [ ] Brand adı merkezi config’ten gelir.
- [ ] Sürüm/stage bilgisi ana kullanıcı ekranında teknik kalabalık yapmaz.

## 5. Android izinleri
- [ ] Konum izni istendiğinde sade Türkçe açıklama görünür.
- [ ] Ön plan konum izni kontrol edilir.
- [ ] Arka plan konum izni gerekiyorsa kullanıcıya sade açıklanır.
- [ ] İzin reddedilirse kullanıcıya sade hata/destek mesajı gösterilir.
- [ ] İzin sonradan açılınca uygulama toparlanır.
- [ ] Bildirim izni gerekiyorsa kullanıcıya sade açıklanır.
- [ ] Pil optimizasyonu / arka plan kısıtı riski not edilir.
- [ ] KVKK/onay sınırları korunur.

## 6. Sürücü gerçek cihaz proof senaryoları
- [ ] Sürücü kodu + PIN ile giriş yapılır.
- [ ] İlk PIN değiştirme gerekiyorsa ekran açılır.
- [ ] Bugün ekranı açılır.
- [ ] Rota ekranı açılır.
- [ ] Canlı ekranı açılır.
- [ ] Görev yoksa “telefon GPS’i beklemede” anlamı doğru görünür.
- [ ] Görev varsa “Sürücünün telefon GPS’i” başlatılabilir.
- [ ] Ekran açıkken GPS gönderimi gözlenir.
- [ ] Ekran kapalıyken GPS davranışı not edilir.
- [ ] Uygulama arka plandayken GPS davranışı not edilir.
- [ ] Araç GPS’i varsa resmi kaynak dili karışmaz.
- [ ] Araç GPS’i yoksa/eskiyse telefon GPS’i fallback anlamı anlaşılır.
- [ ] GPS bekleniyor/GPS eski mesajları sade görünür.
- [ ] Backend loglarında GPS flood yoktur.
- [ ] PIN/şifre/token loglanmaz.

## 7. Personel gerçek cihaz proof senaryoları
- [ ] Kullanıcı kodu + geçici PIN ile ilk giriş denenir.
- [ ] İlk şifre değiştirme ekranı açılır.
- [ ] “Bugünkü servis” ekranı açılır.
- [ ] “Canlı takip” aksiyonu görünür.
- [ ] “Bugün servisi kullanmayacağım” aksiyonu görünür.
- [ ] “Farklı duraktan bineceğim” aksiyonu görünür.
- [ ] Personel sürücü ekranına düşmez.
- [ ] KVKK görünürlük sınırları korunur.
- [ ] Hata mesajları sade Türkçe görünür.

## 8. Veli gerçek cihaz proof senaryoları
- [ ] Veli kodu + PIN dili kontrol edilir.
- [ ] “Öğrencimin servisi” ekranı açılır.
- [ ] “Canlı takip” aksiyonu görünür.
- [ ] “Bugün öğrencim servise binmeyecek” aksiyonu görünür.
- [ ] Öğrenci durum metinleri sade görünür.
- [ ] Veli sürücü ekranına düşmez.
- [ ] KVKK görünürlük sınırları korunur.
- [ ] Hata mesajları sade Türkçe görünür.

## 9. Yönetim rolleri gerçek cihaz proof senaryoları
COMPANY/SCHOOL/ROOM/ORGANIZATION/SUPER_ADMIN için:
- [ ] Hafif özet ekranı açılır.
- [ ] “Web panelden devam edin” yönlendirmesi görünür.
- [ ] Ağır yönetim işi mobile taşınmaz.
- [ ] Bu roller sürücü ekranına düşmez.
- [ ] Geniş operasyon listeleri otomatik yüklenmez.
- [ ] Teknik raw statüler ana ekranda görünmez.

## 10. Ağ / dayanıklılık senaryoları
- [ ] Wi-Fi ile login denenir.
- [ ] Mobil veri ile login denenir.
- [ ] Zayıf ağda hata mesajı sade görünür.
- [ ] Backend kapalıyken kullanıcıya anlaşılır mesaj verilir.
- [ ] Backend tekrar açılınca uygulama toparlanır.
- [ ] Oturum yenileme / çıkış davranışı kontrol edilir.
- [ ] GPS gönderimi zayıf ağda flood oluşturmaz.

## 11. Kanıt listesi
- Cihaz bilgisi ekran görüntüsü veya notu
- APK/build profili kanıtı
- API base kanıtı
- Login ekran görüntüsü
- İlk şifre/PIN değiştirme ekran görüntüsü
- Sürücü Bugün ekranı
- Sürücü Rota ekranı
- Sürücü Canlı/GPS ekranı
- GPS izin ekranı
- ekran kapalı/arka plan GPS gözlem notu
- Personel Bugünkü servis ekranı
- Veli Öğrencimin servisi ekranı
- Yönetim hafif özet ekranı
- Hatalı giriş veya bağlantı hatası ekranı
- Backend logunda crash/500 yok kanıtı
- Operator note

## 12. Kabul sonucu alanı
- Kabul edildi / Eksik / Tekrar kontrol
- Test eden
- Tarih
- Cihaz marka/model
- Android sürümü
- APK profili
- Backend çalıştırma şekli
- API base
- Ağ türü
- Notlar
- Ekran görüntüsü kanıtı
- Log kanıtı

## 13. Kabul komutları
```bash
npm --prefix mobile run check:m1
npm --prefix mobile run check:m98e1
npm --prefix mobile run check:m98e2d
npm run check:m95e25
npm run check:m95e26
npm run check:m95e27
npm run verify:final
```

## 14. Sık hata / ilk bakılacak yerler
- Gerçek cihaz 10.0.2.2 ile backend’e bağlanamaz; local ağ IP veya HTTPS gerekir.
- /api/api oluyorsa API base join kontrol edilir.
- Docker backend eski kaldıysa rebuild gerekir.
- Login 500 verirse önce backend logs kontrol edilir.
- İlk şifre ekranı açılmıyorsa passwordChangeRequired/requirePasswordChange kontrol edilir.
- Sürücünün telefon GPS’i görünmüyorsa görev/shift context kontrol edilir.
- Ekran kapalı GPS çalışmıyorsa Android arka plan izinleri ve pil optimizasyonu kontrol edilir.
- Runtime JSON dosyaları değişirse commit’e alınmaz.
- PIN/şifre/token hiçbir loga yazılmaz.
