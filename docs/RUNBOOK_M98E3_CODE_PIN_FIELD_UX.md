# M98-E3 Kod + PIN Saha Kullanım Kanıtı

Bu runbook, M98-E2B/C/D/E ile kapanan kod + PIN ilk erişim sistemini saha kullanımına uygun kısa bir kanıt paketi olarak anlatır. Yeni ürün davranışı eklemez; mevcut akışı sade Türkçe ile açıklar.

## Bu akış ne işe yarar?

Bu akış, ilk erişim veya ilk girişte kullanıcıya verilen kod ile geçici PIN'in güvenli ve anlaşılır biçimde kullanılmasını sağlar.

- Personel erişimi için kullanıcı kodu + geçici PIN üretir.
- Veli erişimi için veli kodu + PIN diliyle sade bir kabul akışı sağlar.
- Mobilde giriş ekranı, ilk şifre değişimi ve sürücü PIN akışlarını birbirinden ayırır.
- Bu kod ve PIN yalnızca bir kez gösterilir.

## Kim kod üretir?

| Kim üretir | Ne üretir | Not |
|---|---|---|
| ROOM | sürücü kodu + PIN, zaten mevcut | Zaten mevcut sürücü akışı |
| COMPANY | personel kodu + geçici PIN | 7 gün geçerli ilk erişim |
| ORGANIZATION | personel kodu + geçici PIN | COMPANY ile aynı model |
| SCHOOL | veli kodu + geçici PIN | Veli kodu + PIN dili |
| SUPER_ADMIN | yönetici hesapları | Mevcut yönetici üretim akışı |

## Personel için adım adım saha senaryosu

1. COMPANY veya ORGANIZATION tarafında `Personel erişimi oluştur` aksiyonu kullanılır.
2. Sistem kullanıcı kodu ve geçici PIN üretir.
3. Oluşturma sonrası kod ve PIN yalnızca bir kez gösterilir.
4. Personel mobilde `Kullanıcı kodu` ve `PIN veya şifre` ile giriş yapar.
5. Kod + 6 haneli PIN ile aktivasyon başarılı olursa oturum açılır.
6. Ardından `İlk şifreni değiştir` ekranı açılır.
7. Şifre değişince personel normal yüzeye döner.

## Organizasyon personeli için adım adım saha senaryosu

1. ORGANIZATION scope'unda aynı personel erişimi paneli kullanılır.
2. Kod ve PIN yine 7 gün geçerlidir.
3. Raw değerler tek seferlik gösterilir.
4. Mobil giriş ve ilk şifre değiştirme davranışı personel ile aynıdır.

## Veli için ürün dili

- `Veli kodu + PIN`
- `Veliye 7 gün geçerli veli kodu ve geçici PIN verilir.`
- `Okulun verdiği veli kodu ve PIN ile giriş yapabilirsin.`
- `Veli kodu linki doğrulanıyor.`

## Mobil giriş ekranında kullanıcı ne görür?

- Ana alan: `Kullanıcı kodu`
- Alt açıklama: `Size verilen sürücü, personel veya veli kodunu girin.`
- İkinci alan: `PIN veya şifre`
- Personel kodu + PIN ile aktivasyon varsa arka planda kabul edilir.
- Sürücü kodu + PIN ve sürücü PIN değiştirme akışı aynen korunur.

## İlk şifre değiştirme ne zaman açılır?

`passwordChangeRequired` veya `requirePasswordChange` döndüğünde mobilde `İlk şifreni değiştir` ekranı açılır. Bu ekran personel, veli, company, school, room, organization, operation ve super admin rollerinde non-driver ilk giriş için geçerlidir.

## PassengerLiveLink neden ayrı?

`PassengerLiveLink` bir hesap aktivasyonu değildir.

- Geçici canlı takip linkidir.
- Kullanıcı hesabı oluşturmaz.
- Login / PIN / şifre değişimi yerine canlı takip görünürlüğü sağlar.
- Kod + PIN ilk erişim modeliyle karıştırılmaz.

## Raw kod / PIN neden sadece bir kez gösterilir?

- Güvenlik ve KVKK için.
- Kopyalanıp operatör tarafından doğru kişiye iletilmesi için.
- Liste ekranında raw değerler tekrar görünmesin diye.
- Sonradan yeniden görmek yerine yeni erişim üretilsin diye.

## Operatör kontrol listesi

- Kod ve PIN doğru kişiye iletildi mi?
- Raw kod / PIN yalnızca oluşturma anında gösterildi mi?
- Liste ekranında sadece masked code ve durum alanları mı görünüyor?
- Veli dili `Veli kodu + PIN` olarak sade mi?
- PassengerLiveLink ayrı mı anlatılıyor?
- İlk şifre değişimi beklenen rol için açılıyor mu?
- Sürücü PIN akışı etkilenmedi mi?

## Kabul kanıt komutları

- `npm run check:m98e2b`
- `npm run check:m98e2c`
- `npm --prefix mobile run check:m98e2d`
- `npm run check:m98e2e`
- `npm run check:m98e3`
- `npm run verify:final`

## Runtime smoke

- Yerel backend çalışıyorsa kısa runtime kanıtı için: `npm run smoke:m98e4`
- Bu komut synthetic fixture ile personel erişimi oluşturma, tek seferlik kod/PIN gösterimi, public accept, ilk şifre değiştirme bayrağı ve revoke davranışını kısa uçtan uca doğrular.
- Çıktıda raw kod, PIN veya token gösterilmez; sadece masked özet ve PASS/FAIL satırları görünür.

## Sorun çıkarsa ilk bakılacak yerler

- `backend/src/routes/personelAccess.js`
- `web/src/panels/company/PersonelAccessPanel.jsx`
- `web/src/panels/school/ParentInvitePanel.jsx`
- `web/src/panels/public/AcceptParentInvitePanel.jsx`
- `mobile/src/screens/LoginScreen.js`
- `mobile/src/app/mobileAppHandlers.js`
- `mobile/src/app/MobileAppContent.js`
- `mobile/src/screens/ForcePasswordChangeScreen.js`
- `mobile/src/screens/PinChangeScreen.js`
