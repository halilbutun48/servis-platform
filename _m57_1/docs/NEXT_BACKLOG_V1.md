# PERSONEL-SERVIS V1 — NEXT BACKLOG (POST-M50)

Timezone: Europe/Istanbul  
Last updated: **2026-03-18**  
Current official green tag: **v1-m56-kvkk-eta-quality-green-20260318**  
Current direction: **M57.1 foreground GPS publish -> M57.2/3/4 sertlestirme -> Final Pilot**

Bu dosyanın amacı:
- repoda **zaten bulunan capability** ile
- **kısmen tamamlanmış işler**i
- ve **gerçekten eksik / sonraki iş**leri
birbirinden ayırmaktır.

Ana ilke:
- Saha testi / pilot **en son**
- Önce repo içindeki eksik halkalar kapatılır
- Yarım ürün akışı bırakılmaz

---

## 0) REPO'DA ZATEN VAR OLANLAR

Aşağıdaki başlıklar artık "gelecek iş" değildir; repoda temel veya güçlü karşılığı vardır.

### 0.1 Mobil sürücü hattı
- Sürücü Kodu + PIN girişi
- İlk girişte PIN değişimi
- Bugün ekranı
- Vardiya özeti / rota özeti
- Sonraki durak bilgisi
- Haritada aç
- Sesli rehber
- ETA okuma
- Güvenli çıkış
- Release hazırlığı kartı
- Preview / production build profilleri

### 0.2 Navigasyon ve mini harita capability
- ROOM ve COMPANY tarafında mini harita önizleme vardır
- ROOM, COMPANY ve DRIVER web tarafında **tam rotayı dış navigasyonda açma** capability vardır
- ROOM, COMPANY, DRIVER web, PERSONEL ve public canlı akışlarda **sonraki hedef / durak navigasyonu** capability vardır
- Sürücü mobil tarafta **sonraki durağı haritada açma** capability vardır

Not:
Bu başlıklar artık korunması gereken çekirdek capability'dir. Backlog'da yeni iş gibi değil, mevcut sistemin parçası olarak ele alınır.

### 0.3 Import / geo / stop tabanı
- Excel / CSV import tabanı
- Shift people import hattı
- Geocode state alanları
- Manual geo override
- Geo review ekranı
- `maxWalkM` tabanlı otomatik durak üretimi
- Company hub başlangıç noktası desteği

### 0.4 Route quality / solver tabanı
- OSRM matrix / reorder capability
- Fallback heuristic yaklaşımı
- Plan builder tabanı

### 0.5 Security / session / compliance tabanı
- Auth + refresh session
- Device binding
- Driver PIN hardening
- TOTP step-up
- RBAC / scope
- KVKK minimal canlı-konum modeli
- Retention + backup tabanı

---

## 1) KISMEN TAMAMLANMIŞ / ÜRÜNLEŞMESİ GEREKEN İŞLER

Bunlar repoda parça parça vardır ama tek, tam, net ürün akışı halinde değildir.

### 1.1 Excel → Geocode → Durak → Rota → ROOM zinciri
Mevcut parçalar:
- import var
- geocode state var
- review var
- stop generation var
- OSRM capability var

Eksik olan:
- tek, sade, uçtan uca ürün akışı
- daha net kullanıcı yönlendirmesi
- import sonucu → review sonucu → rota taslağı → ROOM onayı zinciri

### 1.2 Geocode orchestration
- Batch geocode
- Retry / backoff
- `FAILED` ve `NEEDS_REVIEW` standardı
- Cache refresh kuralı
- Normalize adres kuralı

### 1.3 Route quality productization
- OSRM açık / kapalı davranışı
- Fallback standardı
- Rota kalite metriği
- Kullanıcıya sade durum mesajı

### 1.4 ETA ve navigasyon kalite iyileştirmesi
Mevcut capability korunur; bu başlık yeni navigasyon özelliği eklemekten çok kalite yükseltme işidir.

Odak:
- ETA için navigasyon destekli daha doğru km / süre hesabı
- Kalan durak sayısı görünürlüğü
- Sonraki durak kalitesi ve hedef netliği
- Durak kaçırma / yeniden yönlendirme davranışı
- Harita üstünde aktif rota / sonraki durak vurgusu
- Navigasyon sağlayıcısı fallback davranışı

### 1.5 Reports / export V1 -> V2
M55 ile artik su taban resmi olarak vardir:
- ROOM/COMPANY rapor ekrani
- reports endpoint iskeleti
- no-show kaydi ile bagli operasyonel guard

Kalan is:
- daha derin business report seti
- gecikme / rota kalite / arac kullanim raporlari
- export V2 derinlestirmesi

### 1.6 KVKK kapsam kapatma
M56 ile artik su taban resmi olarak vardir:
- `/api/kvkk/matrix`
- rol/panel/veri matrix v1
- shared KVKK ekran gorunurlugu
- ETA kalite alanlari ile birlikte sade operasyon gorunumu

Kalan is:
- mobil blocking gorunurlugu
- legacy scope/artik kullanilmayan parent/ogrenci izlerinin temiz karari
- kanit/evidence setinin pilot oncesi kapatilmasi

---

## 2) GERÇEKTEN EKSİK OLANLAR

### 2.1 No-show / penalty V2
M55 ile su taban vardir:
- no-show veri modeli
- backend guard
- aktif no-show kaydi olan surucunun approve/apply hattinda bloklanmasi

Gercek eksik kisim artik sudur:
- itiraz / override akisi
- daha derin audit gorunurlugu
- gorev reddi / tekrar eden ihlal politikasinin V2 kurallari

### 2.2 Full business reporting
- Araç raporları
- Durak gecikme raporları
- Sürücü performans / operasyon özeti
- CSV/Excel export V2

### 2.3 Full KVKK matrix closure
M56 ile role/panel/veri matrix v1 artik vardir.

Gercek eksik kisim:
- mobil blocking davranisinin kapanmasi
- eski parent/ogrenci scope izlerinin nihai karari
- pilot oncesi tek sayfalik evidence/approval seti

### 2.4 iOS release lane
- iOS build/distribution hattı
- Release disiplini
- Mağaza / dağıtım kararı

---

## 3) PRE-PILOT ZORUNLU İŞLER

Saha testinden önce bunlar tamamlanmalıdır.

### 3.1 M51 — Backlog Reset + Gap Register ✅
- tamamlandi
- backlog repo gercegine gore temizlendi
- zaten var / kismen var / eksik ayrimi yazili hale geldi

### 3.2 M52 — Import & Geo Pipeline ✅
- resmi green hatti icinde
- import + geocode + review tabani dogrulandi

### 3.3 M53 — Stop & Route Productization ✅
- resmi green hatti icinde
- `maxWalkM` policy, stop generation gorunurlugu ve kalite sinyalleri dogrulandi

### 3.4 M54 — ROOM Dispatch Completion ✅
- `M54.3` ve `M54.4` ile operasyonel dispatch zinciri green kapandi

### 3.5 M55 — Reports + No-show ✅
- reports/no-show V1 resmi green oldu
- kalan kisim artik reports/no-show V2 derinlestirmesidir

### 3.6 M56 — KVKK Matrix + ETA/Navigation Quality ✅
- rol/panel/veri KVKK matrix v1 resmi green oldu
- ETA kalite, kalan rota ve skip/reroute alanlari resmi green oldu

### 3.7 M57 — Mobile Hardening
- `M57.1` foreground GPS publish repo implementasyonu var.
- Today ekraninda izin karti, `GPS iznini yenile`, `Ayarlari ac` ve `Konumu simdi gonder` aksiyonlari bulunur.
- Post-M41 external runner halen varsayilan olarak scaffold adimini kosar; bu durum `M57` geneli resmi green oldugu anlamina gelmez.
- Siradaki resmi kapatma isi: `M57.2` offline/online toparlama + retry dili.
- Foreground GPS publish
- offline/online toparlama
- session clean-fail davranisi
- KVKK blocking gorunurlugu
- Android preview/internal build disiplini

### 3.8 M58 — Final Pilot Readiness
- KVKK matrix kararları kapalı
- ETA / navigasyon kalite boşlukları kapalı
- Mobil hata / GPS / session davranışı toparlanmış
- Son checklist / saha test senaryoları net
- Pilot başlatma kapısı tek maddede okunabilir

---

## 4) EN SON YAPILACAK: SAHA TESTİ / PİLOT

Pilot en son başlatılır.

Pilot öncesi tamam olması gerekenler:
- Backlog temizliği tamam
- Import/geo/stop/route zinciri tamam
- ROOM dispatch zinciri tamam
- No-show politikası tamam
- KVKK kapsam matrisi yazılı
- ETA/navigasyon kalite boşlukları kapatılmış
- Mobil hata/gps/session davranışı toparlanmış (M57.1 repo implementasyonu girdi; M57.2/3/4 devam ediyor)

---

## 5) POST-PILOT ADAYLARI

Pilot sonrası ele alınabilecek işler:
- iOS release lane
- İleri mobil güvenlik sertliği
- Daha büyük ölçek export/reporting
- Tenant / ölçekleme iyileştirmeleri
- Daha gelişmiş operasyon zekâsı

---

## 6) KANONİK DİL / KARARLAR

- "driver GPS" yerine: **sürücünün telefon GPS'i**
- "agreement" yerine: **sözleşme**
- Sürücü ana giriş hattı: **Sürücü Kodu + PIN**
- Driver ana hedef platformu: **telefon uygulaması**
- ROOM / COMPANY ana güçlü hedef: **tablet + web**
- Saha testi / pilot: **en son**

---

## 7) KANONİK NEXT-ROUTE TOKEN

`PRE-PILOT GAP CLOSURE`


## 9) Latest official close
- `M56 — KVKK Matrix + ETA/Navigation Quality` resmi green oldu.
- Kanonik komut: `tools\pack_m56_kvkk_eta_quality.ps1 -RepoRoot D:\servis-platform`
- Sonraki odak: `M57.1 — Foreground GPS publish + izin karti + Ayarlara Git`


## 10) Yeni kanonik M57 komutlari
- `tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform`  (M57.1 implementation check)
- `tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform -ScaffoldOnly`
- `tools\pack_post_m41_to_m57.ps1 -RepoRoot D:\servis-platform -NoBuild`
- `tools\pack_post_m41_to_m54_4.ps1 -RepoRoot D:\servis-platform -NoBuild` (compat wrapper)
