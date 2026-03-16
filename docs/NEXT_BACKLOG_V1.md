# PERSONEL-SERVIS V1 — NEXT BACKLOG (POST-M50)

Timezone: Europe/Istanbul  
Last updated: **2026-03-16**  
Current official green tag: **v1-m50-green**  
Current direction: **Pre-Pilot Gap Closure → Final Pilot**

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

### 1.5 Log / export altyapısından business report'a geçiş
- Genel export altyapısı var
- Ama iş raporları eksik
- Araç / vardiya / gecikme / operasyon raporları ürünleştirilmeli

### 1.6 KVKK kapsam genişletme
- Minimal model var
- Ama tüm rol/panel/veri matrisi net değil
- Web ve mobil kapsamı yazılı hale gelmeli

---

## 2) GERÇEKTEN EKSİK OLANLAR

### 2.1 No-show / görev reddi cezası
- Penalty modeli
- Audit trail
- ROOM override
- Talep / atama etkisi

### 2.2 Full business reporting
- Araç raporları
- Durak gecikme raporları
- Sürücü performans / operasyon özeti
- CSV/Excel export V2

### 2.3 Full KVKK matrix
Rol / panel / veri bazında net tablo:
- SUPER_ADMIN
- ROOM
- COMPANY
- DRIVER
- PERSONEL
- Sistemde kalan parent/öğrenci scope'ları

### 2.4 iOS release lane
- iOS build/distribution hattı
- Release disiplini
- Mağaza / dağıtım kararı

---

## 3) PRE-PILOT ZORUNLU İŞLER

Saha testinden önce bunlar tamamlanmalıdır.

### 3.1 M51 — Backlog Reset + Gap Register
- Backlog repo gerçeğine göre temizlenir
- Zaten var / kısmen var / eksik ayrılır

### 3.2 M52 — Import & Geo Pipeline
- Import disiplini
- Batch geocode
- Review standardı
- Cache / retry kuralı

### 3.3 M53 — Stop & Route Productization
- `maxWalkM` policy standardı
- Stop generation kalite kuralı
- OSRM / fallback standardı
- Route quality görünürlüğü

### 3.4 M54 — ROOM Dispatch Completion
- Draft → ROOM → atama zinciri
- Conflict görünürlüğü
- Operasyonel kapanış

### 3.5 M55 — Reports + No-show
- Business reports
- Export V2
- No-show / görev reddi cezası

### 3.6 M56 — KVKK Matrix + ETA/Navigation Quality
- Rol/panel/veri KVKK matrisi
- Mobil KVKK gereksinimi kararı
- ETA kalitesi
- Navigasyon destekli km / zaman / kalan durak görünürlüğü
- Durak kaçırma / yeniden yönlendirme davranışı

### 3.7 M57 — Mobile Hardening
- Ağ kopması / geri gelmesi
- GPS izin durumu
- Session toparlama
- Hata dili
- Android preview/internal build disiplini

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
- Mobil hata/gps/session davranışı toparlanmış

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
