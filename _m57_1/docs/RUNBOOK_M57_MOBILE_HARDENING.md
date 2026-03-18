# RUNBOOK — M57 MOBILE HARDENING

Tarih: 2026-03-18  
Timezone: Europe/Istanbul  
Durum: **M57 geneli resmi green degil; M57.1 foreground GPS publish implementasyonu repoda var**

Bu runbook M57 icin gercek repo tabanina oturan teslim kapsamini yazar.
M57 yeni buyuk urun modulu degil; mevcut surucu telefon uygulamasinin
kopma/toparlanma, izin, oturum ve dagitim disiplinini sertlestirme adimidir.

## 1) M57 amac cumlesi
Surucu telefon uygulamasi:
- aktif/onayli vardiyada **Foreground GPS publish** yapabilmeli
- internet gidip gelince **anlasilir sekilde toparlanmali**
- session/refresh bozulunca **sonsuz deneme yerine temiz dusus** vermeli
- KVKK bloklari mobilde **gorunmez kalmamali**
- Android preview/internal build disiplini **tek runbook / tek pack cizgisine** baglanmali

## 2) Repo tabani (zaten var)
Mobil tabanda bugun zaten bulunan temel capability:
- `Surucu Kodu + PIN` girisi
- ilk giriste PIN degisimi
- `Today` ekrani
- vardiya ozeti / rota ozeti
- sesli rehber + ETA okuma
- app active olunca yenileme
- 30 sn periyodik soft refresh
- foreground GPS izin okuma / isteme
- preview / production EAS profilleri

Bu nedenle M57 sifirdan uygulama yazma isi degildir.

## 3) M57 zorunlu is paketleri

### 3.1 M57.1 — Foreground GPS publish + izin kapisi
Bu overlay ile repoya giren somut davranis:
- session acik + `DRIVER` rolunde + `APPROVED/ACTIVE` vardiya varsa publish hedefi hesaplanir
- `route.shift.vehicleId` veya aktif vardiyadaki `vehicleId` kullanilarak `/api/gps` endpoint'ine publish yapilir
- publish yalnizca uygulama acikken yapilir
- gorev yoksa gereksiz publish durur
- gorev var ama arac atamasi yoksa kullaniciya net mesaj gorunur
- izin verilmediyse `GPS iznini yenile` ve gerekiyorsa `Ayarlari ac` aksiyonlari gorunur
- ekranda son konum / son deneme / son gonderim bilgisi gorunur

Beklenen UI dili:
- `Surucunun telefon GPS'i icin izin gerekli`
- `GPS izni kapali. Ayarlardan acmaniz gerekiyor`
- `Konum gonderiliyor`
- `Konum gonderilemedi, tekrar denenecek`
- `Bugun aktif gorev yok. Bu yuzden konum gonderilmiyor`

Not:
- Bu milestone icinde **full background service** zorunlu degildir.
- Oncelik foreground publish + net izin kapisi + sade hata dilidir.

### 3.2 M57.2 — Offline/online toparlama
Hedef:
- internet yokken sade durum karti
- internet geri gelince otomatik toparlama
- veri eskiyse kullaniciya teknik olmayan uyari
- sessiz hata yerine sade operasyon dili

### 3.3 M57.3 — Session toparlama + KVKK blocking gorunurlugu
Hedef:
- 401/403 durumunda kontrolsuz dongu olmamasi
- refresh basarisizsa local session temizlenmesi
- kullanicinin net sekilde tekrar girise dusurulmesi
- KVKK bloklayici durumlarin mobilde gorunur olmasi

### 3.4 M57.4 — Android preview/internal build disiplini
Hedef:
- preview APK/internal dagitim adimlari
- version bump / env / release notu kural seti
- runbook + pack + checker kaniti

## 4) Bilerek bu milestone'a alinmayanlar
- iOS release lane
- app-store / play-store yayin sureci
- full turn-by-turn navigasyon
- agir telemetry / crash analytics entegrasyonlari
- yeni operasyon modulleri

## 5) Kanonik komutlar
M57.1 implementation check:

`tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform`

Sadece scaffold/files dogrulama:

`tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform -ScaffoldOnly`

Post-M41 external orchestrator:

`tools\pack_post_m41_to_m57.ps1 -RepoRoot D:\servis-platform -NoBuild`

Not:
- dis orchestrator varsayilan olarak halen **M57 scaffold** adimini kosar
- bu sayede `M42 -> M56` green cizgisi bozulmadan tekrar edilebilir
- M57 geneli resmi green ilan edilmis degildir

## 6) M57.1 checker kapsamı
- `mobile/App.js`
- `mobile/src/lib/api.js`
- `mobile/src/lib/gps.js`
- `mobile/src/screens/TodayScreen.js`
- `mobile/scripts/m57_1_foreground_gps_publish_check.js`
- `tools/check_m57_mobile_hardening_repo_contract.ps1`

## 7) M57 green sayma kosulu
M57 ancak su durumda resmi green sayilabilir:
- foreground GPS publish gercekten calisiyor
- izin yoksa kullanici bunu net goruyor
- offline/online toparlama davranisi var
- refresh/session failure temiz dusus veriyor
- KVKK blocking mobilde gorunmez kalmiyor
- Android preview/internal build disiplini runbook + pack + check ile kanitlanmis
