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
- `M51+` satırları aktif ürün / repo durumu olarak yazılır; pack-green promotion anlamına gelmez.
- Bu zip içinde `.git` olmadığı için resmi tag promotion yalnızca canlı repo içinde yapılmalıdır.

## 1) Güncel aktif durum
- `M51` docs/backlog reset hattı işlendi.
- `M52 Import + Geo Pipeline` ana akış olarak çalışır duruma geldi ve kod tarafı kapatıldı.
- `M53 Stop & Route Productization` başlatıldı.
- `M53.1` stop policy contract docs tarafında işlendi.
- `M53.2-A` stop generation summary + preset görünürlüğü test edildi ve çalışır görüldü.
- `M53.3` Planlama Merkezi sadeleştirme ve tek oluşturma kaynağı kararı işlendi.
- `M53.4` Organization / Gezi modu Planlama Merkezi içinde görünür hale geldi.
- `M53.5` round-trip temeli, gidilecek yer kartları, manuel lat/lng fallback, haritadan seç, navigasyon, preview pax fallback ve market öncesi plan-tamlık kontrolü repo durumuna işlendi.
- `Copilot` organization rehberi company kopyası olmaktan ayrışmaya başladı; son ince ayar alanı açıktır.

## 2) Kesin çalışan / doğrulanan durum

### M52.1 — Import Contract
- Excel / CSV import
- `REPLACE` / `MERGE`
- import summary kartı
- warning UI
- eksik / hatalı satırlarda sistemin düşmemesi
- review gerektiren kayıtların ayrılması

### M52.2 — Geo State + Geo Review
- `geoStatus` + `geoReason` / `geoReasonText`
- satır bazlı `Adresten Bul`
- Geo Review içinde ad / telefon / adres düzenleme
- lat/lng düzenleme
- `Kaydet`, `OK Yap`, `Toplu Adresten Bul`
- reason filtresi
- bulundu / bulunamadı / hata sayaçları

### M52.3-A — Import Summary Quick Actions
- `Geo Review'a Git`
- review kayıtlarını topluca bul
- toplu geocode sonrası bazı kayıtların `OK` olması
- sayaçların değişmesi
- listenin güncellenmesi

### M53.1 — Stop Policy Contract
Resmi karar:
- Company default `maxWalkM = 250`
- School default `maxWalkM = 50`
- backend hard limit `50..2000`

Resmi görünürlük:
- toplam kişi / durak / tekil / kapsanan / review / dışarıda-skip
- stop başına kişi dağılımı
- tahmini km / süre
- başlangıç noktası
- rota kaynağı / kalite sinyali
- hub dahil / hariç stop ayrımı

### M53.2-A — Stop Generation Summary
- Company `250` ve School `50` presetleri görünür
- Stop Generation Özeti kartı görünür
- `maxWalkM / durak / kapsanan / tekil / toplam kişi / review / dışarıda-skip / stop dağılım` alanları görünür

### M53.3 — Planlama Merkezi / tek oluşturma kaynağı
- Oluşturma için tek kaynak **Planlama Merkezi** olmalıdır.
- **Vardiyalar** ekranı takip / operasyon ekranı olarak kalmalıdır.
- Basic kullanıcı mantığı: `Rota önerisi oluştur → Ön izle → Ayrı market teklifi oluştur`.
- Company taslak plan / teklif hazırlar; Room gerçek araç / sürücü / kapasite kararı ile operasyonel planı tamamlar.

### M53.4–M53.5 — Organization / Gezi modu görünür repo durumu
- Organization kullanıcısı için Planlama Merkezi üst kimliği ayrıştı.
- Organization step-2 içinde `Tahmini kişi sayısı`, `Toplanma noktası adı`, `Gidilecek yerler`, `Dönüş tipi` alanları görünüyor.
- Gidilecek yerler ayrı kart/satır mantığında giriliyor.
- Her yer için `Bul`, manuel `lat/lng`, `Haritadan seç`, `Navigasyonda aç` destekleri bulunuyor.
- Preview tarafında organization planı için `Tahmini kişi` fallback'i okunuyor.
- Koordinat eksiği olan plan markete düşmeden önce durduruluyor.

## 3) Bugünkü ürün kararları
- Planlama Merkezi tek üretim merkezi olarak kalır.
- Company ve School akışı bozulmaz.
- Organization alanları yalnızca organization modunda görünür.
- Organization temel akışı:
  - `Toplanma noktası`
  - `Plan paketi`
  - `Tahmini kişi sayısı`
  - `Gidilecek yerler`
  - `Ön izleme / teklif`
  - `Vardiyalar`
- Gidilecek yerler tek textarea değil, ayrı yer kartları şeklinde tutulur.
- Adres bulunamazsa manuel `lat/lng` veya haritadan seçim ile tamamlanır.
- Koordinatlar tamam olmadan organization planı markete düşmez.

## 4) Yakın resmi rota
- `M54 — Room Dispatch Planner / draft → ROOM → atama zinciri`
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
- Room preview ile onayla
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
Repo şu an M50'ye kadar resmi green; M51 docs/backlog işlendi, M52 import+geo hattı çalışır durumda kapatıldı, M53 başladı. Şu an en kritik aktif iş M54 Room Dispatch Planner: gelen teklif/draftı boştaki araçlara yakınlık + kapasite + OSRM/solver mantığıyla dağıtıp child shift'lere çeviren operasyonel planner kurmak.
