# M95-E26 Android Emulator Smoke Planı

## 1. Amaç
- Android emülatörde mobil uygulamanın temel saha akışlarını kanıtlamak.
- Bu plan kod davranışı değiştirmez; test ve kanıt rehberidir.
- Gerçek cihaz saha proof öncesi ara kapıdır.

## 2. Ön koşullar
- [ ] Docker backend çalışıyor.
- [ ] Web/backend API `127.0.0.1:3000` üzerinde erişilebilir.
- [ ] Android emulator backend’e `10.0.2.2:3000` üzerinden ulaşabilir.
- [ ] local emulator API base `http://10.0.2.2:3000` olmalı.
- [ ] `/api` çiftlenmesi olmamalı.
- [ ] M95-E6 API base join hotfix korunmalı.
- [ ] Backend eski Docker image ile çalışıyorsa rebuild yapılmalı.
- [ ] Runtime JSON dosyaları commit’e alınmamalı.

## 3. APK / profil kontrolü
- local-apk profil kullanılacak.
- `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000` beklenir.
- `EXPO_PUBLIC_RELEASE_STAGE=local-emulator` beklenir.
- preview/production HTTPS guard bozulmayacak.
- local-emulator HTTP izni sadece `10.0.2.2` için geçerlidir.

## 4. Emülatörde test edilecek roller
- [ ] DRIVER / Sürücü
- [ ] PERSONEL / Personel
- [ ] PARENT veya VELI / Veli
- [ ] COMPANY / Firma
- [ ] SCHOOL / Okul
- [ ] ROOM / Oda
- [ ] ORGANIZATION / Organizasyon
- [ ] SUPER_ADMIN / Süper admin hafif özet / web yönlendirme kontrolü

## 5. Login smoke senaryoları
- [ ] Giriş ekranı açılır.
- [ ] “Kullanıcı kodu” alanı görünür.
- [ ] “PIN veya şifre” alanı görünür.
- [ ] Sürücü kodu + PIN ile giriş denenir.
- [ ] Personel kullanıcı kodu + geçici PIN ile giriş denenir.
- [ ] İlk şifre değiştirme ekranı açılır.
- [ ] Veli kodu + PIN dili kontrol edilir.
- [ ] Hatalı PIN mesajı sade Türkçe görünür.
- [ ] Çıkış yapılır ve tekrar giriş denenir.
- [ ] Token/PIN/şifre debug veya logda açık görünmez.

## 6. Sürücü smoke senaryoları
- [ ] Bugün ekranı açılır.
- [ ] Rota ekranı açılır.
- [ ] Canlı ekranı açılır.
- [ ] Görev yoksa uygun bekleme metni görünür.
- [ ] Görev varsa görev/shift bilgisi görünür.
- [ ] “Sürücünün telefon GPS’i” ifadesi doğru görünür.
- [ ] Telefon GPS’i görev yokken resmi kaynak gibi gösterilmez.
- [ ] Araç GPS’i / sürücünün telefon GPS’i dili karışmaz.
- [ ] Mola/müsaitlik kartı görünürse sade kalır.
- [ ] Bildirim merkezi görünürse okunabilir kalır.

## 7. Personel smoke senaryoları
- [ ] Personel ana ekranı sürücü shell’e düşmez.
- [ ] “Bugünkü servis” başlığı görünür.
- [ ] “Servisim X dk uzakta” veya “Servisim yaklaşıyor” metni görünür.
- [ ] Tahmini geliş, biniş durağı, araç/servis bilgisi görünür.
- [ ] “Canlı takip” aksiyonu görünür.
- [ ] “Bugün servisi kullanmayacağım” aksiyonu görünür.
- [ ] “Farklı duraktan bineceğim” aksiyonu görünür.
- [ ] Detaylar açılır/kapanır kalır.

## 8. Veli smoke senaryoları
- [ ] Veli ana ekranı sürücü shell’e düşmez.
- [ ] “Öğrencimin servisi” başlığı görünür.
- [ ] “Servis X dk uzakta” veya “Servis yaklaşıyor” metni görünür.
- [ ] Öğrenci durum özeti görünür: Servise bindi, Yolda, Okula ulaştı, Bugün aktif.
- [ ] “Canlı takip” aksiyonu görünür.
- [ ] “Bugün öğrencim servise binmeyecek” aksiyonu görünür.
- [ ] Detaylar açılır/kapanır kalır.

## 9. Yönetim rolleri smoke senaryoları
COMPANY/SCHOOL/ROOM/ORGANIZATION/SUPER_ADMIN için:
- [ ] Mobil hafif özet ekranı açılır.
- [ ] “Web panelden devam edin” yönlendirmesi görünür.
- [ ] Ağır yönetim işi mobile taşınmaz.
- [ ] Bu roller sürücü shell’e düşmez.
- [ ] Teknik raw statüler ana ekranda görünmez.
- [ ] Geniş operasyon listeleri emülatörde otomatik yüklenmez.

## 10. Kanıt listesi
- Emulator adı / Android sürümü
- APK profil adı
- API base ekran/komut kanıtı
- Login ekran görüntüsü
- İlk şifre değiştirme ekran görüntüsü
- Sürücü Bugün ekranı
- Sürücü Canlı / GPS ekranı
- Personel Bugünkü servis ekranı
- Veli Öğrencimin servisi ekranı
- Yönetim hafif özet ekranı
- Hatalı giriş mesajı ekran görüntüsü
- Backend logunda 500/crash yok kanıtı
- Operator note

## 11. Kabul sonucu alanı
- Kabul edildi / Eksik / Tekrar kontrol
- Test eden
- Tarih
- Emulator adı
- Android sürümü
- APK profili
- Backend çalıştırma şekli
- Notlar
- Ekran görüntüsü kanıtı

## 12. Kabul komutları
```bash
npm --prefix mobile run check:m1
npm --prefix mobile run check:m95e2
npm --prefix mobile run check:m95e6
npm --prefix mobile run check:m98e1
npm --prefix mobile run check:m98e2d
npm run check:m95e25
npm run check:m95e26
npm run verify:final
```

## 13. Sık hata / ilk bakılacak yerler
- Emulator backend’e bağlanmıyorsa API base `10.0.2.2` kontrol edilir.
- URL `/api/api` oluyorsa API base join kontrol edilir.
- Docker backend eski kaldıysa rebuild gerekir.
- Login 500 verirse önce docker logs kontrol edilir.
- İlk şifre ekranı açılmıyorsa `passwordChangeRequired` / `requirePasswordChange` kontrol edilir.
- Sürücünün telefon GPS’i görünmüyorsa görev/shift context kontrol edilir.
- Runtime JSON dosyaları değişirse commit’e alınmaz.
