# RUNBOOK — M57 MOBILE HARDENING

Tarih: 2026-03-18  
Timezone: Europe/Istanbul  
Durum: **M57 resmi green**

Bu runbook M57 icin gercek repo tabanina oturan teslim kapsamini yazar.
M57 yeni buyuk urun modulu degil; mevcut surucu telefon uygulamasinin
kopma/toparlanma, izin, oturum ve dagitim disiplinini sertlestirme adimidir.

## 1) M57 amac cumlesi
Surucu telefon uygulamasi:
- aktif/onayli vardiyada **foreground GPS publish** yapabilmeli
- internet gidip gelince **anlasilir sekilde toparlanmali**
- session/refresh bozulunca **sonsuz deneme yerine temiz dusus** vermeli
- KVKK bloklari mobilde **gorunmez kalmamali**
- Android preview/internal build disiplini **tek runbook / tek pack cizgisine** baglanmali

## 2) Repo tabani
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

## 3) M57 kapanis ozeti

### 3.1 M57.1 — Foreground GPS publish + izin kapisi
- session acik + `DRIVER` rolunde + `APPROVED/ACTIVE` vardiya varsa publish hedefi hesaplanir
- `route.shift.vehicleId` veya aktif vardiyadaki `vehicleId` ile `/api/gps` endpoint'ine publish yapilir
- gorev yoksa gereksiz publish durur
- gorev var ama arac atamasi yoksa kullaniciya net mesaj gorunur
- izin verilmediyse `GPS iznini yenile` ve gerekiyorsa `Ayarlari ac` aksiyonlari gorunur

### 3.2 M57.2 — Offline/online toparlama
- network/fetch hatalarinda `Baglanti yok. Veri eski olabilir.` mesaji
- tekrar baglanti gelince `Baglanti geri geldi, bilgiler yenileniyor.` mesaji
- Today ekraninda `Baglanti` karti (son online/offline/toparlama zamanlari)

### 3.3 M57.3 — Session toparlama + KVKK blocking gorunurlugu
- refresh/session bozulursa uygulama `Oturum kapandi. Yeniden giris yapin.` diyerek temiz sekilde girise doner
- KVKK karti mobilde gorunur; gerekli/tamamlanan sayilari ve dokuman listesi gorulur
- KVKK onayi eksikse GPS publish hattinda net blok dili gorunur

### 3.4 M57.4 — Android preview/internal build disiplini
- `mobile/app.json` icinde release stage ve build track metadatasi sabitlendi
- `mobile/eas.json` preview APK / internal dagitim ve production AAB ayrimini acik yazar
- `mobile/.env.example` release stage env ornegini gosterir
- Today ekranindaki release karti `Android preview`, `Production bundle`, `Env asamasi` ve build disiplin satirlarini gosterir
- `mobile/scripts/m57_4_android_preview_internal_build_check.js` bu hattin repo kanitidir
- `tools/_packs/pack_m42_m58.ps1 -To 57` canonical olarak full `M42 -> M57` green hattini kosar

## 4) Kanonik komutlar
M57 full pack:

`tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform`

Sadece scaffold/files dogrulama:

`tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform -ScaffoldOnly`

Post-M41 external orchestrator:

`tools\_packs\pack_m42_m58.ps1 -To 57 -RepoRoot D:\servis-platform -NoBuild`

## 5) M57 green sayma kosulu
M57 ancak su durumda resmi green sayilir:
- foreground GPS publish gercekten calisiyor
- izin yoksa kullanici bunu net goruyor
- offline/online toparlama davranisi var
- refresh/session failure temiz dusus veriyor
- KVKK blocking mobilde gorunmez kalmiyor
- Android preview/internal dagitim ve production AAB disiplini runbook + pack + check ile kanitlanmis

Bu kosullar repoda karsilandigi icin `M57 resmi green` durumuna alinmistir.
