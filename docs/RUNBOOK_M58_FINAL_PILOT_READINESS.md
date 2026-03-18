# RUNBOOK — M58 FINAL PILOT READINESS

Tarih: 2026-03-18  
Timezone: Europe/Istanbul  
Durum: **hazirlik / acik**

Bu runbook M58 icin yeni bir buyuk urun modulu tanimlamaz.
M58'in amaci, `M57` sonrasinda zaten acik olan capability'leri tek yerde toparlayip
**pilot oncesi son kontrol kapisi** haline getirmektir.

> Not: Bu paket **tek basina resmi green degildir**.  
> Resmi green icin hem `tools\pack_m58_final_pilot_readiness.ps1` gecmeli,
> hem de saha kabul / manuel pilot signoff tamamlanmalidir.

## 1) M58 amac cumlesi
M58 ile sistem su soruya net cevap vermelidir:

**"Bu repo, gercek surucu ve gercek is akisiyla kontrollu pilot baslatmaya hazir mi?"**

Bu yuzden M58 su 5 basligi toplar:
- final pilot checklist
- saha testi akislari
- mobil gercek cihaz / preview build dogrulamasi
- operasyon runbook son sadelestirme
- rollout icin go / no-go karari

## 2) M58 kapsam siniri
M58'te hedef yeni buyuk backend ozelligi acmak degildir.
Mevcut resmi green capability'lerin pilot acisindan bir arada okunur,
kanitlanir ve sahaya hazir hale getirilmesi hedeflenir.

Bu asamada repo tabaninda zaten bulunan ana capability'ler:
- `Surucu Kodu + PIN` girisi
- ilk giriste `PIN degistirme`
- Today ekrani / rota ozeti / sonraki durak
- sesli rehber + ETA
- foreground GPS publish hatti
- GPS izin kapisi + `Ayarlari ac`
- offline/online toparlama dili
- session failure temiz dusus
- KVKK blocking karti ve aksiyonlari
- Android preview/internal build disiplini
- room/company operasyon tarafinda rota teslimi, raporlar ve gelmedi cezasi hatti

## 3) Final pilot checklist
M58 checklist'i sade ve sahada uygulanabilir olmalidir.

### 3.1 Mobil giris ve gorev akisi
- surucu `Surucu Kodu + PIN` ile giris yapabiliyor mu?
- ilk giriste zorunlu PIN degisimi net mi?
- Today ekraninda bugunku gorev / rota ozeti net mi?
- sonraki durak, ETA ve sesli rehber tek ekranda anlasilir mi?

### 3.2 Konum ve izin akisi
- `Surucunun telefon GPS'i` izin dili sade mi?
- izin kapaliysa `Ayarlari ac` aksiyonu gorunuyor mu?
- aktif/onayli vardiyada konum publish hatti calisiyor mu?
- baglanti gidip gelince uygulama panik yerine sade dille toparlaniyor mu?

### 3.3 Session / KVKK akisi
- session refresh bozulursa kullanici sonsuz beklemeye girmeden temiz sekilde cikisa dusebiliyor mu?
- KVKK eksigi mobilde gorunur mu?
- KVKK eksigi varsa konum gonderimi blok dili acik mi?

### 3.4 Operasyon akisi
- rota teslimi surucu tarafinda bugunku gorevle uyumlu mu?
- oda / sirket tarafinda rapor ve gelmedi akislari halen calisiyor mu?
- sistem dilinde gereksiz teknik kelime yerine sade Turkce kullaniliyor mu?

### 3.5 Build / dagitim akisi
- preview/internal APK profili tanimli mi?
- production AAB profili tanimli mi?
- build asamasi metadatasi repo icinde acik mi?
- rollout karari icin `go / no-go` notu cikartilabiliyor mu?

## 4) Saha testi akislari
M58 icin onerilen minimum saha testi:
1. bir demo veya gercek surucu preview build ile giris yapar
2. Today ekraninda gorev, rota, sonraki durak ve ETA gorulur
3. sesli rehber en az bir kez okutulur
4. GPS izni bir kez reddedilip tekrar verilir; dil ve toparlama gozlenir
5. baglanti bir kez koparilip geri getirilir; uygulama davranisi gozlenir
6. KVKK eksik / tamamlama davranisi gozlenir
7. operasyon tarafinda ilgili vardiya/rapor akisi kontrol edilir

## 5) Kanonik komut
M58 hazirlik komutu:

`tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform`

Bu komut su iki parcayi dogrular:
- repo-contract: `tools\check_m58_final_pilot_readiness_repo_contract.ps1`
- runtime/readiness check: `backend\scripts\m58_final_pilot_readiness_check.js`

## 6) Go / no-go karari
M58 sonunda su 3 sonucdan biri yazilmalidir:
- **GO** — pilot baslatilabilir
- **LIMITED GO** — sadece preview/internal saha denemesi devam etsin
- **NO-GO** — bloklayici hata var; pilot acilmasin

## 7) Resmi green sayma kosulu
M58 ancak su durumda resmi green sayilabilir:
- `tools\pack_m58_final_pilot_readiness.ps1` gecer
- mobil ve operasyon akislari saha testinde kabul edilir
- pilot kabul formu / manuel pilot signoff yazili sekilde tamamlanir

Bu 3 kosul birlikte saglanmadan M58 **resmi green degildir**.
