# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — PRIMER SSOT

Tarih: 2026-03-17
Timezone: Europe/Istanbul
Repo: `D:\servis-platform`
Branch: `main`

## 0) Resmi green taban

Ana resmi green durum:
- ✅ `M41 PACK PASS`
- ✅ `M42 OPTIONAL PACK PASS`
- ✅ `STEP 0.6 STABIL PACK PASS`
- ✅ `STEP 1 SECURITY FOUNDATION PACK PASS`
- ✅ `STEP 1 TOTP STEP-UP PACK PASS`
- ✅ `M104 REPO CLEANUP CHECK PASS`
- ✅ `M105 TOOLS HYGIENE CHECK PASS`
- ✅ `M106 REPO HYGIENE + LINK TTL CHECK PASS`
- ✅ `M43 GOOGLE AUTH + INVITE GATE PACK PASS OK`
- ✅ `M44 TELEMATICS PACK PASS OK`
- ✅ `M45 RETENTION + BACKUP PACK PASS OK`
- ✅ `M46 AI COPILOT FOUNDATION PACK PASS OK`
- ✅ `M46.1–M46.9 zinciri green`
- ✅ `M47 KVKK NOTICE / CONSENT FRAMEWORK PACK PASS OK`
- ✅ `M47.2 CAPACITY & LOAD BASELINE PACK PASS OK`
- ✅ `M47.3 PRODUCTION RESILIENCE + EDGE SECURITY PACK PASS OK`
- ✅ `M47.4 MOBILE READINESS WEB PASS PACK PASS OK`
- ✅ `M47.4-R CLEAN RERUN / REPRO FIX VERIFIED`
- ✅ `M48 DRIVER MOBILE FOUNDATION PACK PASS OK`
- ✅ `M48.5 ROOM / COMPANY TABLET READINESS PACK PASS OK`
- ✅ `M49 MOBILE BETA HARDENING PACK PASS OK`
- ✅ `M49.1 DRIVER VOICE GUIDANCE + STOP ETA PACK PASS OK`
- ✅ `M50 MOBILE RELEASE READINESS PACK PASS OK`

Not:
- Son resmi pack-green çizgi hâlâ `M50` seviyesidir.
- `M51+` satırları aşağıda aktif ürün / repo durumu olarak yazılır; pack-green promotion anlamına gelmez.
- Bu zip içinde `.git` olmadığı için resmi tag promotion yalnızca canlı repo içinde yapılmalıdır.

## 1) Güncel aktif durum

- `M51` başladı ve docs/backlog tarafı işlendi.
- `M52 Import + Geo Pipeline` ana akış olarak çalışır duruma geldi ve kod tarafı kapatıldı.
- `M53 Stop & Route Productization` başlatıldı.
- `M53.1` stop policy contract docs tarafında işlendi.
- `M53.2-A` stop generation summary + preset görünürlüğü test edildi ve çalışır görüldü.
- `M53.3` Planlama Merkezi / Plan Builder sadeleştirme çalışması aktif; en dikkat isteyen alan burasıdır.

## 2) Kesin çalışan / doğrulanan durum

### M52.1 — Import Contract
Test edilip çalışan davranış:
- Excel / CSV import
- `REPLACE` / `MERGE`
- import summary kartı
- warning UI
- eksik / hatalı satırlarda sistemin düşmemesi
- review gerektiren kayıtların ayrılması

### M52.2 — Geo State + Geo Review
Test edilip çalışan davranış:
- `geoStatus` + `geoReason` / `geoReasonText`
- satır bazlı **Adresten Bul**
- Geo Review içinde ad / telefon / adres düzenleme
- Geo Review içinde `lat` / `lng` düzenleme
- `Kaydet`
- `OK Yap`
- toplu **Adresten Bul**
- reason filtresi
- bulundu / bulunamadı / hata sayaçları

### M52.3-A — Import Summary Quick Actions
Test edilip çalışan davranış:
- import summary içinden **Geo Review'a Git**
- review kayıtlarını topluca bul
- toplu geocode sonrası bazı kayıtların `OK` olması
- sayaçların değişmesi
- listenin güncellenmesi

### M53.1 — Stop Policy Contract
Resmi kararlar:
- Company default `maxWalkM = 250`
- School default `maxWalkM = 50`
- backend hard limit `50..2000`
- resmi özet alanları: toplam kişi, durak sayısı, tekil kişi sayısı, kapsanan kişi sayısı, review sayısı, dışarıda / skip sayısı, stop başına kişi dağılımı
- route quality minimum görünürlük: tahmini km, tahmini süre, başlangıç noktası, rota kaynağı / kalite sinyali, hub dahil / hariç stop ayrımı

### M53.2-A — Stop Generation Summary
Testte görülen çalışan durum:
- `maxWalkM` alanı var
- Company `250` ve School `50` presetleri görünüyor
- Stop Generation Özeti kartı görünüyor
- kartta `maxWalkM`, durak, kapsanan, tekil, toplam kişi, review, dışarıda/skip, stop dağılım satırı görünüyor
- hub dahil / hariç sayım farkı mevcut; bu hata değil, sayı dili / etiket netliği konusudur

## 3) M53.3 için net ürün kararları

### Tek oluşturma kaynağı
- Company tarafında oluşturma için tek kaynak **Planlama Merkezi** olmalıdır.
- **Vardiyalar** ekranı takip / operasyon ekranı olarak kalmalıdır.
- **Organizasyon Merkezi** ikinci plan motoru gibi davranmamalı; Planlama Merkezi yönüne uyarlanmalıdır.

### Stage-3 temel kullanıcı akışı
- `Rota önerisi oluştur`
- `Ön izle`
- `Ayrı market teklifi oluştur`

### Stage-3 iş kuralları
- Matris al ve çöz kullanıcıya ayrı teknik adım gibi sunulmamalıdır.
- `Uygula: N market shift oluştur` ile `Ayrı market teklifi oluştur` aynı işi yapıyorsa basic akıştan tekine düşülmelidir.
- Company tarafında araç kapasitesi operasyonel karar değildir; gerçek kapasite Room tarafında netleşmelidir.
- Geohash precision ve benzeri teknik parametreler basic akışta baskın görünmemelidir.
- Company veriyi hazırlar, taslak rota / cluster önerisini görür ve ayrı market tekliflerini çıkarır.
- Room gerçek araç, sürücü, kapasite ve operasyon kararını verir.

## 4) Yakın resmi rota
- `M53.3 — Planlama Merkezi sadeleştirme + gerçek teklif akışı`
- `M54 — ROOM Dispatch Planner / draft → ROOM → atama zinciri`
- `M55 — Reports + No-show`
- `M56 — KVKK Matrix + Mobile Hardening`
- `M57 — Final Pilot Readiness`

## 5) M54 için bugünkü yön
Room tarafında hedeflenen zincir:
- gelen teklif / draftı aç
- boştaki araç + uygun sürücü havuzunu gör
- personelleri yakınlık + kapasite + operasyonel uygunluğa göre araçlara böl
- araç bazlı yeni duraklar üret
- OSRM + solver ile durak sırasını iyileştir
- Room preview ile onaylasın
- child shift'ler oluşsun ve sürücü yalnızca kendi rotasını görsün

## 6) Sabit ürün / repo kuralları
- Driver login ana akışı `Sürücü Kodu + PIN` olarak korunur.
- İlk girişte PIN değişimi zorunludur.
- `driver@demo.com / demo123` yalnızca hızlı panel / smoke kontrol hesabıdır.
- ürün içi konum dili: `sürücünün telefon GPS'i`
- overlay standardı: **tek zip / tek kök klasör / nested root yok**
- değişiklikler mümkünse tek seferde overlay paket olarak taşınır
- CHECKLIST'te `[x]` yalnızca pack/check green sonrasında işaretlenir

## 7) Yeni sohbet için ilk cümle
Repo şu an M50'ye kadar resmi green; M51 docs/backlog işlendi, M52 import+geo hattı çalışır durumda kapatıldı, M53 başladı. Şu an en kritik aktif iş Planlama Merkezi'ni tek oluşturma kaynağına indirip Stage-3 akışını sadeleştirmek; ardından M54'te Room tarafında gelen teklifi boştaki araçlara yakınlık + OSRM/solver mantığıyla dağıtan dispatch planner'a geçilecek.
