# RUNBOOK M95-E0 - Android APK/AAB Build Readiness

Bu runbook, mobil uygulamanın Android build hazırlığını resmi ve tekrar edilebilir hale getirir.
Bu adım saha testi değildir. APK/AAB üretmek, gerçek telefonda saha kanıtı alındığı anlamına gelmez.

## APK nedir?
- APK, Android uygulamasının tek dosyalı kurulum paketidir.
- Emülatör, dahili test ve doğrudan cihaza kurulum için uygundur.

## AAB nedir?
- AAB, Google Play ve kapalı test kanalları için kullanılan Android App Bundle paketidir.
- Üretim / mağaza hattı için tercih edilen formattır.

## Ne zaman hangisi kullanılır?
- APK:
  - emülatör kurulumu
  - doğrudan test telefonu kurulumu
  - hızlı iç doğrulama
- AAB:
  - kapalı test
  - production / mağaza hattı

## Mevcut build profilleri
- `preview` profili: APK üretir.
- `production` profili: AAB üretir.

## EAS build komutları
- APK:
  - `npm --prefix mobile run build:android:apk`
  - eşdeğer EAS komutu: `eas build --profile preview --platform android`
- Local emulator APK:
  - `npm --prefix mobile run build:android:local-apk`
  - eşdeğer EAS komutu: `eas build --profile local-apk --platform android`
- AAB:
  - `npm --prefix mobile run build:android:aab`
  - eşdeğer EAS komutu: `eas build --profile production --platform android`

## Emülatöre APK nasıl kurulur?
1. APK artefact'ı üret.
2. Emülatör açık olsun.
3. `adb install -r <apk-dosyasi>`
4. Uygulama açılışında emülatör API base olarak:
   - `http://10.0.2.2:3000`
5. Mobil uygulama endpointlerde `/api/...` path ekler.
6. `/api/api` tekrar etmemelidir.

## Local emulator APK profili ne için?
- Bu profil yalnızca Android emülatör içindir.
- Emülatörde `10.0.2.2`, host makinenin yerel API adresine erişmek için kullanılır.
- Bu adres gerçek telefonda kullanılmaz.
- Bu profil, gerçek saha kanıtı yerine geçmez.
- Local APK build'inde HTTP cleartext izni yalnız emülatör için açılır.

## Cleartext HTTP kuralı
- `local-emulator` build'inde `http://10.0.2.2:3000` için izin verilir.
- Gerçek telefon, preview ve production build'lerinde HTTPS kullanılır.
- Production build'de cleartext açık kalmamalıdır.
- `10.0.2.2` gerçek cihaz için kullanılmaz.

## Gerçek Android telefona APK nasıl kurulur?
1. APK artefact'ı üret.
2. USB debugging açık bir test telefona bağlan.
3. `adb install -r <apk-dosyasi>`
4. Ya da artefact'ı telefona kopyalayıp manuel kur.
5. Telefon, bilgisayarın yerel ağ IP adresini görmelidir.
6. İleride test sunucusu varsa HTTPS tercih edilmelidir.

## API base kuralları
- Emülatör için root host: `http://10.0.2.2:3000`
- Mobil uygulama endpointlerde `/api/...` path ekler.
- Gerçek telefon için: bilgisayarın yerel ağ IP adresi veya güvenli test sunucusu
- Production hattı için HTTPS zorunludur.
- Local emulator APK profilinde `10.0.2.2` kök host kullanılır.
- Gerçek telefonda `10.0.2.2` kullanılmaz.

## Güvenlik ve saha ayrımı
- APK/AAB hazırlığı, saha kanıtı değildir.
- M95-E gerçek saha kanıtı ayrı bir halkadır.
- Sadece build hazır demek, ekran kapalı GPS, zayıf ağ ve gerçek cihaz davranışı kanıtlandı demek değildir.

## Android paket adı
- `com.personelservis.driver`

## Bu hazır olduğunda ne olur?
- Android build hattı resmi olarak açılır.
- Emülatör / test telefon kurulumu için hazır artefact alınır.
- M95-E saha kanıtı için yalnızca hazırlık zemini oluşur; saha kanıtı ayrıca toplanır.
