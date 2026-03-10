PERSONEL-SERVIS V1 — PROJECT SPEC (SSOT)
Ürün açıklaması (tek sayfa)

Personel-Servis V1, şirketlerin ve servis operasyon ekiplerinin günlük personel shuttle (vardiya/shift) operasyonunu uçtan uca yönetmesi için geliştirilmiş GPS tabanlı, rol bazlı ve doğrulanabilir (GREEN disiplinli) bir platformdur.

Problem
Araç/şoför/rota planlama Excel / WhatsApp / manuel yöntemlerle yürür.
Canlı takip yoktur; gecikme, hız ihlali ve “araç kayboldu (STALE/OFFLINE)” geç fark edilir.
Personel talepleri merkezi toplanamaz; operasyonel cluster üretilemez.
Uzun dönem servis anlaşmaları manuel vardiyaya dökülür.
Araç/şoför çakışmaları geç yakalanır.
Gerçek rota ile tahmini rota arasında fark oluşur.

Çözüm (V1 Neler Sunar)
🚦 Operasyon Paneli (ROOM)
Vehicle/Driver CRUD
Shift approve / assign / start
Stop suggestions + from-suggestion
Request close (ACCEPTED)
Agreement approve + conflict yönetimi
Availability kontrolü (shift + agreement + bulk)

🏢 Şirket Paneli (COMPANY)
Shift create
Route template yönetimi (REPLACE)
Agreement create / list / cancel / extend
Shift list + agreement badge

🚗 Şoför Akışı (DRIVER)
Assigned vehicle ile GPS gönderimi
Active route görüntüleme
Stop progression (reached / skip / reopen)
Shift complete

👤 Personel Akışı (PERSONEL)
Lat/Lng zorunlu request create
Stop suggestion üretimine veri sağlar

🔴 Realtime + Uyarılar
Overspeed detection
LIVE → STALE → OFFLINE → LIVE geçişleri
Notification dedupe
WebSocket auto-refresh

🔁 Agreement → Günlük Shift Otomasyonu (M18)
Onaylı agreement’lardan bugünün shift’leri otomatik üretilir
Duplicate guard ile aynı güne ikinci shift yazılmaz
🗺 Route Preview + Route Learning (M19)
OSRM ile estimated km/süre hesaplama
OSRM match ile gerçek GPS polyline üretme
Belirli örnek sonrası rota LEARNED olur
ESTIMATED → LEARNED deterministik geçiş

⚡ Bulk Availability (M20)
Tek endpoint ile tüm araçların uygunluk kontrolü
Agreement conflict öncelikli raporlanır
DB yükü azaltılır
Hedef Kullanıcılar
ROOM (Operasyon)
COMPANY (Planlama)
DRIVER
PERSONEL
SUPER_ADMIN (Kurulum + Yönetim)
SUPER_ADMIN (M21 Güncellemesi)
Company create/list
Room create/list (company bağlantılı)
Sistem kurulum & seed
RBAC izolasyonu
V1’de update/delete minimal tutulabilir; genişletme sonraki milestone’lara bırakılabilir.

Amaç
Öğrenci/parent yok.
GPS tabanlı personel servisi platformu:
Canlı araç takibi
Rota/durak planı
Shift lifecycle
Notification sistemi
Request → suggestion → stop entegrasyonu
Agreement + çakışma yönetimi
Agreement’tan günlük shift otomasyonu
Route learning ile gerçek rota doğrulama

Mimari
Backend: Node.js (ESM) + Express + Prisma
DB: PostgreSQL (Docker)
Redis: monitor + dedupe + jobs
Realtime: Socket.IO
OSRM: route + match
Web: Vite + React
Monorepo: backend/, web/, infra/, docs/, tools/

GREEN Disiplini
“Çalışıyor” demek:
tools/pack.ps1 -To <hedef>
PACK PASS almak.

Her milestone:
Check script (backend/scripts/mXcheck.js)
Docs update (SSOT)
Gate PASS zorunlu
Kurallar (SSOT)

1️⃣ Scope / RBAC
Company sadece kendi scope’unu görür.
Room sadece kendi room scope’unu yönetir.
Driver sadece assigned vehicle/shift ile işlem yapar.
Personel sadece kendi request’lerini görür.

2️⃣ Shift Overlap Kuralları
Aynı driver aynı zaman aralığında 2 shift’e atanamaz → 409
Aynı vehicle aynı zaman aralığında 2 shift’e atanamaz → 409

3️⃣ Agreement Rezervasyon Kuralları (M17)
Aynı time window’da aynı vehicle/driver başka agreement’a verilemez → 409
Availability hem shift hem agreement rezervasyonunu dikkate alır.
Determinism: agreement conflict önce raporlanır.

4️⃣ Route Learning Kuralları (M19)
GPS history match edilir.
Sample threshold sonrası RouteLearned kaydı oluşur.
Preview’de:
source = ESTIMATED | LEARNED
LEARNED varsa estimated override edilir.

5️⃣ Monitoring & Dedupe
GPS state machine: LIVE → STALE → OFFLINE → LIVE
Aynı transition tekrar tekrar notification üretmez.
agreementMonitor: süresi dolan agreement → DONE
M18 — Agreement → Günlük Shift Otomatik Üretimi ✅

Amaç
Onaylı agreement’lardan günlük shift üretmek.

Kurallar
Status: APPROVED/ACTIVE
vehicleId + driverId atanmış olmalı
weekMask bugünü içermeli
Midnight aşımı desteklenir
Unique: (agreementId, startAt)

Conflict
Üretimden önce shiftConflict kontrol edilir
Conflict varsa üretim skip edilir

UI
Agreement shift’lerde badge
Filtre: “Agreement shifts only”
Milestone Yol Haritası (Güncel)

✅ M0–M15: CRUD + shift + gps + ws + notifications + overlap/bind
✅ M16: requests → suggestions → stops + template REPLACE
✅ M16.2: shift people + route-preview + assignmentCount
✅ M16.3: geo review + manual override
✅ M17: agreements + conflict + monitor + availability
✅ M18: agreement → daily shift generator
✅ M19: OSRM + route learning
✅ M20: bulk availability
✅ M21: SUPER_ADMIN companies + rooms panel

DoD (Başarı Kriteri)
Pack PASS olmadan milestone tamam sayılmaz.
Agreement happy path çalışır.
Route preview ESTIMATED → LEARNED geçişi doğrulanır.
Bulk availability deterministik conflict raporlar.
M18 happy path: agreement approve → bugün shift oluşur → listede badge görünür.
M21: SUPER_ADMIN company + room create UI’dan yapılabilir.

M102/M104 sync — Personel erişim modeli
Personel için klasik login desteklenebilir; ancak ürünün ana kullanımında login zorunlu değildir.
Şirket/school tarafı vardiyaya bağlı olarak tek kişiye özel, süreli canlı erişim linki üretir.
Bu link personelin sadece kendi servis/ETA/navigasyon bilgisini açar ve düşük sürtünmeli saha erişimi sağlar.


## Login'siz erişim / süreli link politikası
- Parent invite ve personel public live link varsayılan self-serve akışlarıdır.
- Preset süreler: **1 hafta / 1 ay / 6 ay / 1 yıl**.
- Personel public link, güvenlik gereği ham tokenı sadece ilk üretimde gösterir.
