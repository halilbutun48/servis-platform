# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — PRIMER SNAPSHOT

Tarih: 2026-03-18
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
- ✅ `M51–M53 BACKFILL VERIFICATION PACK PASS OK`
- ✅ `M54.3 DISPATCH APPROVE + REPACK PACK PASS OK`
- ✅ `M54.4 DRIVER ROUTE DELIVERY PACK PASS OK`
- ✅ `M55 REPORTS + NO_SHOW PACK PASS OK`
- ✅ `POST-M41 EXTERNAL PACK RUNNER PASS OK`

Not:
- Resmi green çizgi artık `M55` seviyesine kadar doğrulanmıştır.
- `M42+` pack script'leri self-only çalışır; tam M42 → M54.4 hattının kanonik komutu `tools\pack_post_m41_to_m54_4.ps1 -RepoRoot D:\servis-platform -NoBuild` şeklindedir.
- `M55` ayrı kanonik pack olarak `tools\pack_m55_reports_no_show.ps1 -RepoRoot D:\servis-platform` ile doğrulanır.
- Bu zip içinde `.git` olmadığı için resmi tag promotion yalnızca canlı repo içinde yapılmalıdır.

## 1) Güncel aktif durum
- `M51–M53` backfill verification hattı runtime + repo-contract ile geçti.
- `M52 Import + Geo Pipeline` ve `M53 Stop & Route Productization / Organization-Gezi` görünürlüğü resmi green zincirine dahil oldu.
- `M54.1` Dispatch Preview ve `M54.2` Editable Dispatch Preview, `M54.3` pack-green sonucu ile fiilen doğrulanmış kabul edilir.
- `M54.3` Dispatch Approve + Repack `PACK PASS OK` seviyesindedir.
- `M54.4` Driver Route Delivery explicit shift route endpoint'i ve `Today → Route` deep link'i ile resmi verify hattından geçti.
- `M55` Reports + Gelmedi Kaydı hattı runtime + repo-contract ile resmi green doğrulamasına eklendi.
- Post-M41 external runner `PASS OK` olduğundan `M42 → M54.4` tam hattı tek komutla tekrar koşturulabilir.
- `M45` retention + backup kanıt araçları: `tools\pack_m45_retention_backup.ps1`, `tools\backup_create_m45.ps1`, `tools\backup_restore_m45.ps1`, `docs\RUNBOOK_M45_RETENTION_BACKUP.md`.
- Tek araç yeterli / dispatch gerektirmeyen işlerde `Araç → Pakete Kopyala` ve `Driver → Pakete Kopyala` UI kolaylığı korunur.
- Canlı liste satır yüksekliği / layout sıkışması düzeltilmiştir.

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
- `M56 — KVKK Matrix + ETA/Navigation Quality`
- `M57 — Mobile Hardening`
- `M58 — Final Pilot Readiness`

## 5) M54 için kapanan yön
M54 mevcut repo durumunda şu şekilde kapanmıştır:
- `M54.1` preview katmanı çalışır
- `M54.2` room tarafı araç / şoför seçimi çalışır
- `M54.3` preview → approve → repack zinciri pack ile kanıtlanmıştır
- `M54.4` sürücünün Today ekranından kendi shift rotasına gitmesi explicit route endpoint ile netleştirilmiştir

Kalan odak artık yeni planner yazmak değil, `M56+` hattına geçişi hazırlamaktır.

## 6) Sabit ürün / repo kuralları
- Driver login ana akışı `Sürücü Kodu + PIN` olarak korunur.
- İlk girişte PIN değişimi zorunludur.
- `driver@demo.com / demo123` yalnızca hızlı panel / smoke kontrol hesabıdır.
- ürün içi konum dili: `sürücünün telefon GPS'i`
- overlay standardı: **tek zip / tek kök klasör / nested root yok**
- değişiklikler mümkünse tek seferde overlay paket olarak taşınır
- CHECKLIST'te `[x]` yalnızca pack/check green sonrasında işaretlenir

## 7) Yeni sohbet için ilk cümle
Repo şu an `M55`'e kadar resmi green; ana post-M41 dış runner `tools\pack_post_m41_to_m54_4.ps1` ile `M54.4`'e kadar gider, `M55` ise `tools\pack_m55_reports_no_show.ps1` ile ayrı kanonik pack olarak doğrulanır. Sonraki odak `M56 KVKK Matrix + ETA/Navigation Quality` hattıdır.


## M55 — Reports + Gelmedi Kaydı
- Reports endpointleri ve ROOM/COMPANY rapor ekranı iskeleti eklendi.
- Gelmedi kaydı (NO_SHOW) veri modeli ve backend guard açıldı.
- Aktif kayıtlı sürücü approve/apply aşamasında `ACTIVE_NO_SHOW_PENALTY` ile bloklanır.
