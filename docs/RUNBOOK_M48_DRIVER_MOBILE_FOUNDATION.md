# RUNBOOK — M48 DRIVER MOBILE FOUNDATION

Tarih: 2026-03-15  
Timezone: Europe/Istanbul

## Amaç
`M48`, sürücü için gerçek telefon uygulaması temelini atar.

Bu adımın hedefi:
- Driver login ana akışı: Sürücü Kodu + PIN
- `Sürücü Kodu + PIN` giriş modelini mobilde açmak
- oturum + refresh token + device binding uyumunu korumak
- ilk zorunlu `PIN değiştir` akışını mobilde göstermek
- `Bugün` ve `rota özeti` ekranını telefonda sade biçimde açmak
- `sürücünün telefon GPS'i` için izin alma temelini hazırlamak

Bu adım henüz şunları tam açmaz:
- arka plan GPS publish
- sürekli foreground service
- sesli yönlendirme
- tam durak operasyon buton seti
- tablet optimize company/room düzenleri

## Neden Expo SDK 54 tabanı seçildi?
İlk foundation iskeleti fiziksel cihazda düşük sürtünmeli başlangıç için `Expo Go` odaklı açıldı.
Bu nedenle repo içinde **SDK 54** tabanlı scaffold kullanılır.

## Dosyalar
- `mobile/package.json`
- `mobile/app.json`
- `mobile/App.js`
- `mobile/src/lib/api.js`
- `mobile/src/lib/storage.js`
- `mobile/src/screens/LoginScreen.js`
- `mobile/src/screens/PinChangeScreen.js`
- `mobile/src/screens/TodayScreen.js`
- `mobile/scripts/m48_driver_mobile_foundation_check.js`

## Kurulum notu
Bu scaffold repo içine hazır gelir. Uygulamayı ilk kez ayağa kaldırırken:

```powershell
cd D:\servis-platform\mobile
$env:EXPO_PUBLIC_API_BASE_URL="http://<LAN_IP>:3000"
npm install
npm start
```

> Android emülatör için varsayılan taban URL `http://10.0.2.2:3000` olarak bırakıldı. Fiziksel telefonda aynı Wi‑Fi ağındaki makinenin LAN IP adresini `EXPO_PUBLIC_API_BASE_URL` olarak ver.

Not: Driver login akışı `Sürücü Kodu + PIN` üzerinedir. ASCII referans gerekirse aynı akış `Surucu Kodu + PIN` olarak da okunabilir.

## Mobil akış
1. Giriş ekranı açılır
2. Sürücü Kodu + PIN ile login olur
3. Backend `deviceId` bağlama politikasına uygun cihaz kimliği gönderilir
4. `requirePinChange=true` ise doğrudan PIN değişim ekranı açılır
5. Sonra `Bugün` ekranı açılır
6. Burada vardiya özeti, rota özeti, sonraki durak, haritada aç ve GPS izin hazırlığı gösterilir

## Kanıt komutu
```powershell
.\tools\pack_m48_driver_mobile_foundation.ps1 -RepoRoot D:\servis-platform
```

## Kapsam sınırı
Bu adım foundation içindir. `M49` ve `M49.1` içinde eklenecekler:
- düzenli GPS publish
- foreground/background dayanıklılık
- stop progress operasyon kısayolları
- sesli yönlendirme
- gerçek stop ETA rafinesi
