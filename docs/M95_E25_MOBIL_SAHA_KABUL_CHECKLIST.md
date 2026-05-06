# M95-E25 Mobil Saha Kabul Checklist’i

## 1. Amaç
- Mobil uygulama saha öncesi temel kullanıcı akışlarını kontrol etmek.
- Bu checklist kod davranışı değiştirmez; test ve kabul rehberidir.

## 2. Kapsam
- `DRIVER / Sürücü`
- `PERSONEL / Personel`
- `PARENT veya VELI / Veli`
- `COMPANY / Firma`
- `SCHOOL / Okul`
- `ROOM / Oda`
- `ORGANIZATION / Organizasyon`
- `SUPER_ADMIN / Süper admin`

## 3. Genel mobil kabul maddeleri
- [ ] Uygulama açılıyor.
- [ ] Giriş ekranında “Kullanıcı kodu” görünüyor.
- [ ] Giriş ekranında “PIN veya şifre” görünüyor.
- [ ] Hatalar sade Türkçe gösteriliyor.
- [ ] Oturum güvenli şekilde saklanıyor.
- [ ] Çıkış yapılabiliyor.
- [ ] İlk şifre değiştirme ekranı gerektiğinde açılıyor.
- [ ] Sürücü PIN değiştirme akışı korunuyor.
- [ ] Teknik raw flag’ler kullanıcıya gösterilmiyor.
- [ ] Token/PIN/şifre debug veya log yüzeyinde görünmüyor.

## 4. Sürücü kabul maddeleri
- [ ] Sürücü kodu + PIN ile giriş yapılabiliyor.
- [ ] İlk PIN değiştirme gerekiyorsa PIN değiştirme ekranı açılıyor.
- [ ] Bugünkü görev ekranı açılıyor.
- [ ] Rota/durak bilgisi sade görünüyor.
- [ ] Canlı ekran açılıyor.
- [ ] “Sürücünün telefon GPS’i” ifadesi doğru kullanılıyor.
- [ ] Telefon GPS’i görev yokken beklemede mesajı gösteriyor.
- [ ] Araç GPS’i varsa telefon GPS’i yedek/beklemede anlatımı karışmıyor.
- [ ] Mola/müsaitlik kartı varsa sade görünüyor.
- [ ] Bildirim merkezi varsa okunabilir görünüyor.

## 5. Personel kabul maddeleri
- [ ] Kullanıcı kodu + geçici PIN ile ilk giriş yapılabiliyor.
- [ ] İlk giriş sonrası “İlk şifreni değiştir” ekranı açılıyor.
- [ ] Ana başlık “Bugünkü servis” olarak görünüyor.
- [ ] “Servisim X dk uzakta” veya “Servisim yaklaşıyor” metni anlaşılır.
- [ ] Tahmini geliş, biniş durağı, araç/servis bilgisi öne çıkıyor.
- [ ] “Canlı takip” aksiyonu görünüyor.
- [ ] “Bugün servisi kullanmayacağım” aksiyonu görünüyor.
- [ ] “Farklı duraktan bineceğim” aksiyonu görünüyor.
- [ ] Detaylar açılır/kapanır şekilde sade kalıyor.

## 6. Veli kabul maddeleri
- [ ] Veli kodu + PIN dili anlaşılır.
- [ ] Ana başlık “Öğrencimin servisi” olarak görünüyor.
- [ ] “Servis X dk uzakta” veya “Servis yaklaşıyor” metni anlaşılır.
- [ ] Öğrenci durumu sade görünür: Servise bindi, Yolda, Okula ulaştı, Bugün aktif.
- [ ] Tahmini geliş, öğrenci, araç/servis bilgisi öne çıkıyor.
- [ ] “Canlı takip” aksiyonu görünüyor.
- [ ] “Bugün öğrencim servise binmeyecek” aksiyonu görünüyor.
- [ ] Detaylar açılır/kapanır şekilde sade kalıyor.

## 7. Yönetim rolleri mobil kabul maddeleri
- [ ] Mobilde hafif özet ekranı açılıyor.
- [ ] Ağır yönetim işleri web panelde kalıyor.
- [ ] “Web panelden devam edin” yönlendirmesi anlaşılır.
- [ ] KPI/kısa özetler teknik olmayan dille görünüyor.
- [ ] Mobil ekran backend’e ağır sorgu bindirmiyor.
- [ ] Bu roller sürücü ekranına yanlış düşmüyor.

## 8. Mobil web uyumu kontrolü
- [ ] Sidebar/chip menü kırılımı kullanılabilir.
- [ ] Bildirim filtreleri parmakla rahat basılır.
- [ ] Harita footer/pill alanı taşmaz.
- [ ] Route preview küçük ekranda sheet gibi açılır.
- [ ] Geniş tablolar kontrollü yatay scroll ile korunur.
- [ ] Bu kontrol web responsive check ile ilişkilidir: `npm run check:web-mobile`

## 9. Gerçek cihaz öncesi kanıt listesi
- Login ekran görüntüsü
- İlk şifre değiştirme ekran görüntüsü
- Sürücü bugün ekranı
- Sürücü canlı/GPS ekranı
- Personel bugünkü servis ekranı
- Veli öğrencimin servisi ekranı
- Yönetim rolü hafif özet ekranı
- Web mobil responsive ekran görüntüsü
- Hata mesajı örneği
- Çıkış/oturum yenileme kontrolü

## 10. Kabul sonucu alanı
- Kabul edildi / Eksik / Tekrar kontrol
- Test eden
- Tarih
- Cihaz / emülatör bilgisi
- Android sürümü
- APK profili
- Notlar
- Ekran görüntüsü kanıtı

## 11. Kabul komutları
```bash
npm --prefix mobile run check:m1
npm --prefix mobile run check:m98e1
npm --prefix mobile run check:m98e2d
npm run check:web-mobile
npm run check:m98e5
npm run check:m95e25
npm run verify:final
```

## 12. Sık hata / ilk bakılacak yerler
- Mobil login yanlış URL’ye gidiyorsa `EXPO_PUBLIC_API_BASE_URL` kontrol edilir.
- Local emulator için `10.0.2.2` ve `/api` çiftlenmesi kontrol edilir.
- İlk şifre ekranı açılmıyorsa `passwordChangeRequired` / `requirePasswordChange` kontrol edilir.
- Sürücünün telefon GPS’i görünmüyorsa görev / shift context kontrol edilir.
- Backend Docker eski kaldıysa rebuild gerekir.
- Runtime JSON dosyaları değişirse commit’e alınmaz.
