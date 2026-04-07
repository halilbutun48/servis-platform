# SCRIPT KILAVUZU — MILESTONE HARITASI V2

Tarih: 2026-04-05  
Repo baz: `servis-platform`  
Amaç: Bu doküman, projedeki milestone hattını **M0'dan gelecekteki M86'ya kadar** tek yerde toplar; her milestone için **ne yaptığı**, **hangi check/runbook/doc ile izlendiği**, **PASS olursa ne sonuç verdiği** ve **kanıt seviyesinin ne olduğu** açıklanır.

---

## 1) Bu doküman nasıl okunmalı?

Bu kılavuz iki katmanlıdır:

- **[TEYİTLİ-REPO]** → Repo içinde doğrudan milestone doc, runbook, check script veya pack izi vardır.
- **[TEYİTLİ-PRIMER]** → Elimizdeki primer o milestone veya milestone bandının durumunu açıkça doğrular.
- **[YENİDEN KURGULANMIŞ]** → Repo check adı, legacy notlar ve mevcut mimari üzerinden dikkatli biçimde yeniden anlatılmıştır.
- **[PLAN]** → Henüz resmi future milestone’dur; proje kararına göre buraya konmuştur.

Bu ayrımı özellikle koruduk; çünkü kullanıcı beklentisi “uydurma roadmap” değil, **kanıtlı ve dürüst bir rehber**dir.

---

## 2) Temel terimler ve kısaltmalar

- **Gate**: Bir milestone’un geçmesi için beklenen kontrol eşiği.
- **Pack**: Birden fazla check’i tek komutta koşturan daha büyük doğrulama zinciri.
- **Smoke**: En temel “sistem ayakta mı?” doğrulaması.
- **SSOT**: Single Source of Truth; resmi gerçeğin tek kaydı.
- **WS**: WebSocket canlı olay hattı.
- **KVKK**: Kişisel verinin görünürlüğü, rızası, retention ve enforcement katmanı.
- **Hot path**: En sık çalışan ve yükte ilk bozulan yol.
- **Runtime**: Uygulamanın gerçekten çalışırken gösterdiği davranış.
- **Stale**: Veri bayat ama tamamen offline değil.
- **Fallback**: Ana yol yoksa başvurulan yedek davranış.
- **OPTIONAL / REQUIRED / OFF**: Özellikle ödeme tarafında kullanılacak kural modları.
- **Commercial Source / Ticari Kaynak**: Komisyon, payment mode ve settlement mantığının bağlandığı ticari kök. İlk aşamada `AGREEMENT` ve `SHIFT_SERIES` kaynak tiplerini kapsar.
- **SHIFT_SERIES**: Kısa süreli iş, 5 günlük iş veya agreement açmadan yönetilen vardiya serisi gibi ticari kaynağı temsil eder.
- **AMC**: Bu repo içindeki mevcut milestone docs/check setinde kanonik bir kısaltma olarak tespit edilmedi. İleride kullanılacaksa ayrıca tanımlanmalı.

---

## 3) Resmi mevcut baz

Elimizdeki primer şu durumu açıkça doğrular:

- `M61` düzeltildi ve geçti.
- `M67→M79` hattı geçti.
- `M80`, `M80.1`, `M80.2`, `M80.3` geçti.
- `M81` geçti.
- Sonuç: `M61→M81` doğrulama zinciri temiz geçti.
- `M81`, mobil omurgayı resmi tools/docs hattına bağladı ama mobil ürünün tüm gerçek kullanım ekranlarının tamamen bittiği anlamına gelmez.
- Saha testine `M82` sonrası çıkılacak.

Bu ana resim primerde açıkça kayıtlıdır.

---

# 4) MILESTONE HATTI — BAŞTAN SONA

## M0 — İskelet / Auth / Roles / Seed  
**Kanıt seviyesi:** [TEYİTLİ-REPO] + [YENİDEN KURGULANMIŞ]

### Ana amaç
Projeyi “tek klasörlük deneme” olmaktan çıkarıp rollü, girişli, sağlık kontrolü olan bir ürün iskeletine oturtmak.

### Ne yapar?
- temel kullanıcı modeli
- rol ayrımı
- seed kullanıcılar
- login akışı
- `/health` ile servis + DB sağlık sinyali
- `/api/me` ile oturumdan role ve temel kullanıcı bilgisini geri döndürme

### Check neye bakar?
Ana referans: `backend/scripts/m0check.js`
- `/health` çalışıyor mu?
- login oluyor mu?
- farklı roller için `/api/me` doğru cevap veriyor mu?

### PASS olursa sonuç
- sistem “kimlikli ve rol bazlı” çalışıyor demektir
- sonraki tüm milestone’ların üstüne oturacağı temel güven katmanı oluşur

### Ana artefaktlar
- `backend/scripts/m0check.js`
- seed kullanıcılar
- auth + `/api/me` zinciri

---

## M1 — Company/Room CRUD + request→approve/assign akışı / erken operasyon değeri  
**Kanıt seviyesi:** [YENİDEN KURGULANMIŞ]

> Legacy notlarda M1’in ilk adı “Company/Room CRUD + request→approve/assign”, başka bir legacy notta ise “No-show / ceza” EPIC’i olarak geçiyor. Bu nedenle burada dürüstçe iki katman birlikte not düşülüyor: erken M1 çizgisi CRUD/onay akışı; sonraki legacy revizyonda M1 hızlı değer olarak penalty/no-show tarafına kaymış görünüyor.

### Ana amaç
İlk işletme akışını kurmak: şirket bir şey talep eder, oda görür, onay/atama yapılır; ayrıca erken “ceza/no-show” değeri sisteme girebilir.

### Ne yapar?
- company/room CRUD temelini taşır
- request → approve → assign zincirini açar
- driver ceza/no-show gibi hızlı operasyonel yaptırımları sisteme katmaya adaydır

### Check / gate ne bakar?
Legacy gate matrisi ve legacy notes’e göre:
- room ceza verebilir mi?
- ceza varsa driver assignment/approve engelleniyor mu?
- audit’e `NO_SHOW_PENALTY_CREATED` benzeri kayıt düşüyor mu?
- notify/new veya scope bazlı olay gidiyor mu?

### PASS olursa sonuç
- sistem sadece kayıt tutmaz; operasyonel karar uygulatmaya başlar
- room/company tarafı gerçek kurallı iş akışına yaklaşır

### Ana artefaktlar
- `docs/_archive/legacy-notes/milestone.md`
- `docs/MILESTONE_GATE_MATRIX.md` (legacy)

---

## M2 — GPS ingest + status standardı + ETA core  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Canlı konum ve ETA omurgasını kurmak.

### Ne yapar?
- sürücü/araç GPS verisini alır
- `LIVE` durumunu yazar
- `GpsLast` ve araç durumunu eşler
- ETA üretir
- WS/event zinciriyle canlılığı besler

### Check neye bakar?
Ana referans: `backend/scripts/m2check.js`
- login (driver/room/company)
- aktif shift var mı?
- `POST /api/gps` başarılı mı?
- DB’de `Vehicle.ACTIVE` + `GpsLast.OK` mapping doğru mu?
- `/api/eta` mantıklı stop listesi dönüyor mu?
- cleanup ile shift düzgün kapanıyor mu?

### PASS olursa sonuç
- proje artık “canlı konum alan” bir sistem olur
- ETA ve harita tabanı kurulur
- sonraki stale/offline/notify katmanlarının zemini hazırlanır

### Ana artefaktlar
- `backend/scripts/m2check.js`
- GPS + ETA route’ları

---

## M3 — Shift/Stop workflow (create/approve/start/reached)  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Shift ve stop yaşam döngüsünü uca kadar yürütmek.

### Ne yapar?
- shift create
- stop add
- stop reorder
- approve/assign
- start
- reached
- ETA ile kalan akışı doğrular

### Check neye bakar?
Ana referans: `backend/scripts/m3check.js`
- company/room/driver login
- shift create
- stop add
- reorder endpoint var mı?
- approve/assign çalışıyor mu?
- start çalışıyor mu?
- driver stop reached diyebiliyor mu?
- ETA stop listesi düzgün mü?

### PASS olursa sonuç
- operasyonun ana omurgası çalışır hale gelir
- “vardiya başlat, durağa ulaş, kalan durakları gör” zinciri resmileşir

### Ana artefaktlar
- `backend/scripts/m3check.js`

---

## M4 — Notification v1 + GPS monitor geçişleri + dedupe  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Canlı konumdan doğan durum geçişlerini kullanıcıya olay olarak taşımak.

### Ne yapar?
- overspeed uyarıları
- `LIVE -> STALE`
- `STALE -> OFFLINE`
- `OFFLINE -> LIVE`
- notify/new ve ilgili scope olayları
- duplicate üretmeme mantığı

### Check neye bakar?
Ana referans: `backend/scripts/m4check.js`
- overspeed bildirimi oluşuyor mu?
- stale bildirimi gidiyor mu?
- `GPS_STALE` dedupe çalışıyor mu?
- offline bildirimi oluşuyor mu?
- recovery bildirimi oluşuyor mu?

### PASS olursa sonuç
- sistem statik harita değil, durum değişimi okuyan operasyon paneli olur
- bildirim omurgası anlam kazanır

### Ana artefaktlar
- `backend/scripts/m4check.js`

---

## M5 — Stop CRUD + reorder + progress / ETA doğrulama  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Stop yönetimini elle de güvenilir biçimde yapabilmek.

### Ne yapar?
- stop create/update/delete
- reorder
- progress + ETA senaryosu
- regression yakalayan test pack genişlemesi

### Check neye bakar?
Ana referans: `backend/scripts/m5check.js`
- stop add
- stop update
- stop delete
- reorder
- approve/assign
- start
- reached
- reached sonrası ETA remaining mantığı

### PASS olursa sonuç
- durak yönetimi artık kapalı kutu değil, kontrollü düzenlenebilir bir ürüne döner

### Ana artefaktlar
- `backend/scripts/m5check.js`
- legacy notes: review UI + kalite + test pack genişlemesi

---

## M6 — Standartlaştırma / request akışı + WS hazır sinyali  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
İstem, talep ve WS doğrulamasını ortak sözleşmeye yaklaştırmak.

### Ne yapar?
- `ws:ready`
- request create/close
- duplicate open block
- RBAC close kuralı
- `request:update` olay zinciri

### Check neye bakar?
Ana referans: `backend/scripts/m6check.js`
- personel/company/room/driver login
- WS connect + ready
- request validation
- request create
- request:update olayı üç role gidiyor mu?
- duplicate OPEN engelleniyor mu?
- company close yasak mı?
- room close ACCEPTED çalışıyor mu?

### PASS olursa sonuç
- canlı talep/istek akışı resmileşir
- WS tabanı yalnız GPS için değil ürün akışı için de anlam kazanır

### Ana artefaktlar
- `backend/scripts/m6check.js`

---

## M7 — Security hardening: RBAC / scope / rate-limit / validation  
**Kanıt seviyesi:** [YENİDEN KURGULANMIŞ]

### Ana amaç
Projenin ilk güvenlik sertleştirmesini yapmak.

### Ne yapar?
- RBAC ve scope netliği
- room/company/shift/vehicle erişim daraltması
- abuse/rate-limit yaklaşımı
- input validation
- erken yetki sınırı düzeltmeleri

### Check neye bakar?
Ana referans: `backend/scripts/m7check.js`
- öneri/suggestion akışı doğru role mi gidiyor?
- offered/accepted zinciri güvenli mi?
- stop suggestion kabulü doğru shift üzerinde mi?
- RBAC/scope zinciri kırılmadan akıyor mu?

### PASS olursa sonuç
- ürün yanlış kullanıcının yanlış veriyi görme riskini azaltır
- güvenlik temel katmanı ürün omurgasına bağlanır

### Ana artefaktlar
- `backend/scripts/m7check.js`
- legacy milestone note: security hardening

---

## M8 — Route/Stop planlama tamlaştırma: template / plan kopyalama / durak tipleri  
**Kanıt seviyesi:** [TEYİTLİ-REPO] + [YENİDEN KURGULANMIŞ]

### Ana amaç
Durak planlamayı tekrar kullanılabilir hale getirmek.

### Ne yapar?
- template oluşturma
- template stop ekleme
- template reorder
- shift’e template apply
- COMMON/MANUAL gibi durak tipleri
- tutarlı order kuralları

### Check neye bakar?
Ana referans: `backend/scripts/m8check.js`
- template create
- template stops add
- reorder
- DB order doğrulama
- shift create
- apply template (REPLACE)
- shift stops doğrulama

### PASS olursa sonuç
- planlama elle tekrar tekrar kurulan bir yapı olmaktan çıkar
- şablon mantığı ileride wizard/refactor milestone’larına zemin olur

### Ana artefaktlar
- `backend/scripts/m8check.js`

---

## M9 — Driver operasyon: next stop / skip / reopen / cancel / device bağları  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Sürücünün operasyonel akışını olgunlaştırmak.

### Ne yapar?
- next stop gösterir
- skip/reopen destekler
- reached zincirini sürücü ekranına yaklaştırır
- shift complete/cancel akışını oturtur
- cihaz/driver bağlarının ilk sertliğini getirir

### Check neye bakar?
Ana referans: `backend/scripts/m9check.js`
- shift oluştur ve ata
- driver route/active verisi geliyor mu?
- next stop present mi?
- skip endpoint
- next-stop endpoint
- reopen endpoint
- reached endpoint
- ETA kalan duraklarla uyumlu mu?
- yanlış araç için GPS 403 veriyor mu?

### PASS olursa sonuç
- sürücü tarafı ilk kez gerçek operasyon kullanımı hissi verir

### Ana artefaktlar
- `backend/scripts/m9check.js`

---

## M10 — Observability: audit_log + api_requests + retention / health detayları  
**Kanıt seviyesi:** [YENİDEN KURGULANMIŞ]

### Ana amaç
Sistemin yalnız çalışması değil, ölçülebilir ve izlenebilir çalışması.

### Ne yapar?
- health detaylarını büyütür
- audit ve request log görünürlüğünü başlatır
- retention omurgasının ilk dilini kurar
- log standardını yükseltir

### Check neye bakar?
Ana referans: `backend/scripts/m10check.js`
- health detay alanları
- iskelet API/readiness davranışı
- admin/stats veya gözlem alanlarının temel sinyalleri

### PASS olursa sonuç
- ileride M45, M59, M60 gibi daha kurumsal gözlem milestone’larına temel oluşur

### Ana artefaktlar
- `backend/scripts/m10check.js`
- legacy note: observability

---

## M11 — Security hardening + /health detayları  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Temel güvenlik başlıklarını görünür ve ölçülebilir hale getirmek.

### Ne yapar?
- `x-powered-by` gibi gereksiz header’ları kapatır
- `/health` yanıtının biçimini netleştirir
- dbOk / dbLatency gibi alanları sözleşmeye bağlar

### Check neye bakar?
Ana referans: `backend/scripts/m11check.js`
- response status
- `x-powered-by` kapalı mı?
- `/health` gerekli alanları döndürüyor mu?
- `dbOk` boolean mı?
- `dbLatencyMs` number mı?

### PASS olursa sonuç
- sağlık endpoint’i kaba “200 dönüyor” seviyesinden kurumsal readiness sinyaline yaklaşır

### Ana artefaktlar
- `backend/scripts/m11check.js`

---

## M12 — StartPack / Pack tool / release-runbook dosya zemini  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Tek komutla kontrol ve dokümantasyon kültürünü yerleştirmek.

### Ne yapar?
- StartPack
- pack/gate dosya zemini
- release/runbook omurgası
- repo içinde check/runbook standardı

### Check neye bakar?
Ana referans: `backend/scripts/m12check.js`
- gerekli dosyalar var mı?
- pack / startpack / kılavuz dosyaları eksiksiz mi?

### PASS olursa sonuç
- proje “kod var ama kılavuz yok” seviyesinden çıkar
- ilerideki bütün milestone disiplinine kılavuz kültürü yerleşir

### Ana artefaktlar
- `backend/scripts/m12check.js`
- `docs/STARTPACK_V1.md`

---

## M13 — Araç / sürücü oluşturma + approve conflict koruması  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Araç ve sürücü atama çatışmalarını görünür hale getirmek.

### Ne yapar?
- vehicle create
- driver create
- shift create
- approve akışında driver/vehicle conflict üretir ve korur

### Check neye bakar?
Ana referans: `backend/scripts/m13check.js`
- araç oluşturuluyor mu?
- sürücü oluşturuluyor mu?
- shift oluşturuluyor mu?
- approve çalışıyor mu?
- aynı sürücü için conflict 409 mu?
- aynı araç için conflict 409 mu?

### PASS olursa sonuç
- sistem atama yaparken sessiz çakışma üretmez

### Ana artefaktlar
- `backend/scripts/m13check.js`

---

## M14 — Availability / conflict kontrolü  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Müsaitlik kontrolünü gerçek atama öncesi güvenli hale getirmek.

### Ne yapar?
- vehicle/driver listeleme
- blocker shift üretme
- availability sorgusu
- conflict code standardı

### Check neye bakar?
Ana referans: `backend/scripts/m14check.js`
- vehicle list
- driver list
- blocker shift oluşturma
- approve blocker shift
- availability ok/409 davranışı
- `VEHICLE_CONFLICT` veya eşdeğer code doğrulaması

### PASS olursa sonuç
- frontend boş yere kullanıcıyı son adımda çarptırmak yerine önceden conflict okuyabilir

### Ana artefaktlar
- `backend/scripts/m14check.js`

---

## M15 — Vehicle ↔ Driver bind/unbind disiplini  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Araç ve sürücüyü daha kurallı bağlamak.

### Ne yapar?
- bind
- unbind
- auto-unbind
- same-driver başka araç conflict
- RBAC koruması

### Check neye bakar?
Ana referans: `backend/scripts/m15check.js`
- vehicle create
- driver create
- delete/list davranışı
- bind ok
- auto-unbind mantığı
- conflict 409
- unbind sonrası yeniden bind
- company tarafı bind yapamıyor mu?

### PASS olursa sonuç
- araç-sürücü ilişkisi rastgele değil, kontrollü kurallı hale gelir

### Ana artefaktlar
- `backend/scripts/m15check.js`

---

## M16 — Personel / rota / suggestion omurgası  
**Kanıt seviyesi:** [TEYİTLİ-REPO] + [TEYİTLİ-DOC]

### Ana amaç
Personel verisi, öneri/suggestion akışı ve rota önizlemeyi ürünsel hale getirmek.

### Ne yapar?
- personel kaydı
- request oluşturma
- suggestion üretme
- suggestion kabul edip stop üretme
- route preview

### Check neye bakar?
Ana referans: `backend/scripts/m16check.js`
- companyId / roomId çözümü
- personel create
- request create
- suggestions dönüyor mu?
- suggestion accept ile stop üretiliyor mu?
- route preview çalışıyor mu?

### PASS olursa sonuç
- personel tabanı ile rota planı arasında ilk ciddi ürün köprüsü kurulmuş olur

### Alt fazlar
#### M16.1 — Personel & Rota Backend (Import + Geocode Cache + Stop Generate + Route Preview)
**Kanıt:** `docs/MILESTONE_M16_1.md`

#### M16.2 — UI soft-switch destekleyen backend contract testleri
**Kanıt:** `backend/scripts/m162check.js`
- `/api/shifts/:id/people`
- `/api/shifts/:id/route-preview`
- assignmentCount sanity

#### M16.3 — Personel konum seçici + KVKK veri minimizasyonu
**Kanıt:** `backend/scripts/m163check.js`
- geçici adres / koordinat mantığı
- manual override
- `NEEDS_REVIEW -> OK` davranışı
- kalıcı esas verinin lat/lng olduğu kontratı

---

## M17 — Agreements backend / approve-conflict / extend-cancel / monitor  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Sözleşmeyi resmi domain nesnesi haline getirmek.

### Ne yapar?
- agreement create
- approve
- conflict 409
- extend / cancel zemini
- agreement monitor ile DONE

### Check neye bakar?
Ana referans: `backend/scripts/m17check.js`
- agreement A oluştur
- approve et
- aynı pencereye agreement B oluştur, approve et → conflict bekle
- farklı pencereye agreement C oluştur → geçsin
- availability agreement reservation’ı görsün
- geçmiş agreement monitor ile DONE olsun

### PASS olursa sonuç
- pazarlık sonrası sözleşme artık resmi ürün nesnesi olur
- availability ve operasyon agreement domain’ini tanır

### Ana artefaktlar
- `backend/scripts/m17check.js`
- agreement route’ları

---

## M18 — Agreement → daily shift generator  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Sözleşmeyi otomatik operasyon üretimine bağlamak.

### Ne yapar?
- agreement onaylanınca günlük vardiya üretir
- duplicate/dedupe guard koyar

### Check neye bakar?
Ana referans: `backend/scripts/m18check.js`
- agreement oluştur
- approve et
- generator tick bekle
- ACTIVE shift üretildi mi?
- ikinci shift üretmeme guard’ı çalışıyor mu?

### PASS olursa sonuç
- ticari akış ile operasyon birbirine bağlanır

### Ana artefaktlar
- `backend/scripts/m18check.js`
- generator job’ları

---

## M19 — Hub + direction/pattern + route preview summary/path  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Rota önizlemeyi daha ürünsel ve özetli hale getirmek.

### Ne yapar?
- hub
- direction OUTBOUND/INBOUND
- pattern LOOP vb.
- summary + path points
- distance/duration estimate

### Check neye bakar?
Ana referans: `backend/scripts/m19check.js`
- shift’i hub + direction/pattern ile oluştur
- 2 stop ekle
- route-preview dönüyor mu?
- summary present mi?
- path present mi?
- direction/pattern doğru mu?
- km/süre numeric mi?

### PASS olursa sonuç
- rota preview “çizgi var/yok” seviyesinden ürün sinyali taşıyan özetli preview’ye çıkar

### Ana artefaktlar
- `backend/scripts/m19check.js`

---

## M20 — Availability bulk endpoint  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Birden fazla araç/sürücü için toplu müsaitlik sorgulamak.

### Ne yapar?
- bulk availability
- shift conflict
- agreement-first conflict değerlendirmesi

### Check neye bakar?
Ana referans: `backend/scripts/m20check.js`
- iki izole vehicle/driver çifti oluştur
- birini blocker shift ile kilitle
- bulk sorguda biri conflict, diğeri ok görünsün
- sonra agreement conflict yarat
- bulk artık agreement conflict raporlasın

### PASS olursa sonuç
- UI tek tek araç denemek yerine toplu uygunluk okuyabilir

### Ana artefaktlar
- `backend/scripts/m20check.js`

---

## M21 — SUPER_ADMIN panel backend readiness  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Super Admin yönetim yüzeyinin backend hazır olduğunu kanıtlamak.

### Ne yapar?
- company create/list
- room create/list
- room hub update
- RBAC kontrolü

### Check neye bakar?
Ana referans: `backend/scripts/m21check.js`
- super admin login
- company create/list
- room create/list
- room hub update
- company kullanıcısı company create yapamasın

### PASS olursa sonuç
- super admin tarafı gerçek yönetim yüzeyi olmaya başlar

### Ana artefaktlar
- `backend/scripts/m21check.js`

---

## M22 — Room Directory + Agreement UX (Company)  
**Kanıt seviyesi:** [TEYİTLİ-DOC]

### Ana amaç
Company’nin room seçimini agreement üzerinden yapabildiği UX’i kurmak.

### Ne yapar?
- `GET /api/rooms`
- room search
- hasHub filtresi
- agreement create’te room dropdown
- company tarafında room directory görünürlüğü

### Check neye bakar?
Ana referanslar:
- `docs/MILESTONE_M22.md`
- `backend/scripts/m22check.js`

### PASS olursa sonuç
- company tarafı room’u sabit bağlı eski model gibi değil, directory mantığıyla seçebilir

---

## M23 — WS agreement:update → Agreements Auto-Refresh  
**Kanıt seviyesi:** [TEYİTLİ-DOC]

### Ana amaç
Agreement listelerinin manuel refresh olmadan kendini yenilemesi.

### Ne yapar?
- `agreement:update` event’ini topic invalidation’a doğru bağlar
- payload `kind` yetersiz kalsa bile event adından refresh çıkarır

### Check neye bakar?
- company + room WS connect
- agreement create / approve / cancel sonrası auto-refresh zinciri

### PASS olursa sonuç
- agreement ekranları stale kalmaz

### Ana artefaktlar
- `docs/MILESTONE_M23.md`
- `backend/scripts/m23check.js`

---

## M24 — Shift Marketplace Offers (Multi-Room)  
**Kanıt seviyesi:** [TEYİTLİ-DOC]

### Ana amaç
Aynı shift için çok odalı teklif toplama ve birini kabul etme modeli.

### Ne yapar?
- market shift
- `ShiftOffer`
- company çok room’a teklif atar
- room counter verir
- company birini accept eder, diğerleri CANCELLED olur

### Check neye bakar?
- market shift oluşturma
- 2+ room’a teklif
- room counter
- accept sonrası diğer tekliflerin iptali

### PASS olursa sonuç
- ürün gerçek pazaryeri davranışına yaklaşır

### Ana artefaktlar
- `docs/MILESTONE_M24.md`
- `backend/scripts/m24check.js`

---

## M25 — Aradaki ticari/UX geçiş katmanı  
**Kanıt seviyesi:** [YENİDEN KURGULANMIŞ]

### Ana amaç
M24 ile M26 arasındaki company premium/workflow çizgisine geçiş zemini.

### Ne yapar?
- teklif ve agreement yüzeyini tek akışa hazırlayan ara UX/hazırlıklar
- M26 öncesi checklist netliği

### Check neye bakar?
Ana referans: `backend/scripts/m25check.js`
- company/room agreement ve ticari akışın temel kullanılabilirliği

### PASS olursa sonuç
- company tarafı “premium workflow”a geçmeden önce ticari omurgası oturur

---

## M26 — Company Premium Workflow + Agreement Presets (V1)  
**Kanıt seviyesi:** [TEYİTLİ-DOC]

### Ana amaç
Company tarafında az tıklamalı, daha güvenli workflow.

### Ne yapar?
- Company Home/Workflow paneli
- hızlı agreement formu
- plan presetleri
- son room hatırlama

### Check neye bakar?
- company rooms directory
- agreement create/list/cancel
- preset akışının görünür olması

### PASS olursa sonuç
- company deneyimi daha operasyonel ve rehberli hale gelir

---

## M27 — Agreement Wizard (preset paketler + tek ekran plan)  
**Kanıt seviyesi:** [TEYİTLİ-DOC başlığı] + [YENİDEN KURGULANMIŞ]

### Ana amaç
Agreement oluşturmayı wizard benzeri daha güvenli bir çizgiye çekmek.

### Ne yapar?
- preset paketleri
- tek ekran planlama
- kullanıcı hatasını azaltma

### Check neye bakar?
- agreement create akışında wizard benzeri kontrol ve preset davranışları

### PASS olursa sonuç
- sözleşme kurma daha öğretici ve hata dostu hale gelir

### Ana artefaktlar
- `docs/MILESTONE_M27.md`
- `backend/scripts/m27check.js`

---

## M28 — One-Click Flow (Company premium UX)  
**Kanıt seviyesi:** [TEYİTLİ-DOC başlığı]

### Ana amaç
Company tarafında iş açma ve anlaşma akışını daha az adımda toplamak.

### Ne yapar?
- tek akışlı premium UX
- hızlı karar ve kısayol odaklı panel davranışları

### Check neye bakar?
- company tarafında hızlı create/use akışları

### PASS olursa sonuç
- şirket tarafı ürün içinde daha az kaybolur

### Ana artefaktlar
- `docs/MILESTONE_M28.md`
- `backend/scripts/m28check.js`

---

## M29 — Onboarding Checklist + Offer Flow Clarity  
**Kanıt seviyesi:** [TEYİTLİ-DOC başlığı]

### Ana amaç
İlk kullanım ve teklif akışındaki belirsizliği azaltmak.

### Ne yapar?
- onboarding checklist
- teklif akışı netliği
- kullanıcıya sıradaki adımı daha görünür kılmak

### Check neye bakar?
- onboarding ve teklif akışı görünürlüğü

### PASS olursa sonuç
- “ne yapacağım?” sorusu azalır

### Ana artefaktlar
- `docs/MILESTONE_M29.md`
- `backend/scripts/m29check.js`

---

## M30 — One-Flow Marketplace + Driver/Personel UX  
**Kanıt seviyesi:** [TEYİTLİ-DOC başlığı]

### Ana amaç
Pazaryeri akışı ile sürücü/personel deneyimini daha birleşik hale getirmek.

### Ne yapar?
- one-flow yaklaşımı
- driver/personel tarafında daha okunur akış

### Check neye bakar?
- role göre pazar/operasyon akışının kopmadan ilerlemesi

### PASS olursa sonuç
- ticari ve operasyonel taraflar daha tek omurgada hissedilir

### Ana artefaktlar
- `docs/MILESTONE_M30.md`
- `backend/scripts/m30check.js`

---

## M31 — Operasyon otomasyonu + kullanım kılavuzu  
**Kanıt seviyesi:** [TEYİTLİ-DOC]

### Ana amaç
Sahada az işlem, hızlı operasyon ve yazılı kullanım rehberi.

### Ne yapar?
- ROOM: Onayla + Başlat
- DRIVER: büyük Reached + Enter
- rol bazlı kullanım kılavuzları

### Check neye bakar?
- tek akışta approve + start
- driver enter shortcut
- docs kullanım kılavuzları mevcut mu?

### PASS olursa sonuç
- operasyon daha hızlı işler
- docs tarafı rol bazlı öğrenme sunar

---

## M32 — Template UI Refactor (Wizard-style)  
**Kanıt seviyesi:** [TEYİTLİ-DOC]

### Ana amaç
Vardiya şablonlarını anlaşılır hale getirmek.

### Ne yapar?
- paket/gün/süre mantığı
- localStorage company template’leri
- eski şablon migrate

### Check neye bakar?
- template create/edit/delete
- new request ekranını doldurma

### PASS olursa sonuç
- şablon sistemi daha öğretici ve tekrar kullanılabilir hale gelir

---

## M33 — Plan Builder plumbing / deterministik davranış  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Plan Builder omurgasının deterministik ve mount edilmiş halde çalışması.

### Ne yapar?
- precheck / matrix / order / solver/OSRM opsiyonel davranış
- plan builder temel kontratı

### Check neye bakar?
Ana referans: `backend/scripts/m33check.js`
- square matrix
- order determinism
- required IDs and consistent apply davranışı

### PASS olursa sonuç
- plan builder bir demo widget değil, kontratlı altyapı haline gelir

---

## M34 — Plan Builder Step-0 precheck + single apply flow + bulk offers  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Plan Builder’ın önce precheck, sonra tek apply akışıyla çalışması.

### Ne yapar?
- company hub set
- market shift create
- people / stops / bulk offers
- precheck sözleşmesi

### Check neye bakar?
- step-0 precheck
- create market shift
- people/stops oluşturma
- bulk offer zinciri

### PASS olursa sonuç
- plan builder akışı daha güvenli ve tek yönlü hale gelir

### Ana artefaktlar
- `backend/scripts/m34check.js`
- `docs/RUNBOOK_M34.md`
- `docs/RUNBOOK_M34_STEP0.md`

---

## M35 — ROOM offered shift visibility + offer-scoped preview auth  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Room’un henüz bağlı olmadığı market shift’i güvenli scope ile görebilmesi.

### Ne yapar?
- offered market shift görünürlüğü
- active offer scope ile route-preview yetkisi

### Check neye bakar?
- includeOffered
- room scope altında preview auth

### PASS olursa sonuç
- room tarafı market teklifleri operasyonel olarak değerlendirebilir

---

## M36 — SUPER_ADMIN ops pack  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Super admin’in şirket, oda ve kullanıcı yönetimini gerçek operasyon paneli haline getirmek.

### Ne yapar?
- company/room update-delete
- admin users create/disable/reset

### Check neye bakar?
- super admin login
- company create/list
- room create/list
- admin user işlemleri

### PASS olursa sonuç
- sistemde merkezi yönetim katmanı güçlenir

---

## M37 — E2E School + Parent check  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
School/Parent alanının E2E doğrulaması.

### Ne yapar?
- school kind/company
- parent role
- parent canlı araç görme ve çocukla ilişkili akışlar

### Check neye bakar?
- school ve parent uçtan uca senaryo
- GPS pulse ile canlılık
- child/vehicle ilişkisi

### PASS olursa sonuç
- ürün sadece personel değil, okul/veli tarafını da taşıdığını kanıtlar

---

## M38 — KVKK consent gate + prod guards  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Rıza olmadan kritik veriye erişimi kısıtlamak.

### Ne yapar?
- parent live ve driver GPS üstünde consent gate
- KVKK acceptance
- prod guard yaklaşımı

### Check neye bakar?
- consent yok → 403
- consent al → erişim açılır
- active shift + assigned vehicle senaryosu

### PASS olursa sonuç
- KVKK yalnız doküman değil, ürün davranışına bağlanır

---

## M39 — Retention run endpoint (dryRun)  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Retention işini admin endpoint olarak görünür kılmak.

### Ne yapar?
- retention cutoffs
- dryRun summary
- apiRequest / auditLog / notification / gpsPoint blokları

### Check neye bakar?
- `POST /api/admin/retention/run`
- structured summary shape

### PASS olursa sonuç
- retention yalnız cron/job değil, gözlenebilir yönetim fonksiyonu olur

---

## M40 — RBAC matrix + log export audit trail  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Export işlemlerini de RBAC ve audit altına almak.

### Ne yapar?
- log export
- forbidden export
- `LOG_EXPORT` audit izi

### Check neye bakar?
- room başka veriyi export edemiyor mu?
- super admin export sonrası audit izi oluşuyor mu?

### PASS olursa sonuç
- veri dışa çıkışı da denetlenebilir hale gelir

---

## M41 — Refresh token + device binding + Redis rate-limit  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Oturum ve cihaz güvenliğini sertleştirmek.

### Ne yapar?
- refresh endpoint
- driver device binding
- farklı deviceId reddi
- rate-limit zemini

### Check neye bakar?
- mevcut bound device ile login
- farklı device rejection
- refresh davranışı

### PASS olursa sonuç
- sürücü girişi daha güvenli ve cihaz bağlı hale gelir

---

## M42 — Optional release: Check-in module  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Check-in modülünü opsiyonel release olarak sisteme eklemek.

### Ne yapar?
- aktif shift üzerinden check-in
- driver code / geçici PIN zinciriyle ilişkili kullanım
- izole vehicle/driver senaryosu

### Check neye bakar?
- izole araç/sürücü oluşturma
- credentials üretimi
- active shift/check-in senaryosu

### PASS olursa sonuç
- check-in modülü ürün içinde kontrollü açılıp kapatılabilir hale gelir

---

## M43 — Parent access cleanup / invite gate  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
School → parent erişim daveti ve erişim kapısını temizlemek.

### Ne yapar?
- parent invite token
- access code
- parent kabul akışı
- school student ile link

### Check neye bakar?
- school login
- student çözümü
- parent access create
- token/accessCode üretimi

### PASS olursa sonuç
- veli erişimi ürünsel ve yönetilebilir hale gelir

---

## M44 — Telematics  
**Kanıt seviyesi:** [TEYİTLİ-REPO] + [TEYİTLİ-DOC runbook]

### Ana amaç
Araç cihazı / vendor kaynaklı GPS’i sisteme bağlamak.

### Ne yapar?
- telematics token/hash
- telematics POST ingest
- araç ile cihaz ilişkisi
- `GpsLast` üstünden canlılığa katkı

### Check neye bakar?
- telematics token doğrulama
- postRaw ingest
- DB tarafında araçla bağlanma

### PASS olursa sonuç
- sistem yalnız sürücü telefon GPS’ine bağımlı kalmaz
- ileride araç GPS öncelik sistemi için zemin oluşur

### Ana artefaktlar
- `backend/scripts/m44_telematics_check.js`
- telematics runbook/notları

---

## M45 — Retention + Backup  
**Kanıt seviyesi:** [TEYİTLİ-REPO] + [TEYİTLİ-DOC]

### Ana amaç
Kurumsal veri saklama ve yedek disiplinini resmi hale getirmek.

### Ne yapar?
- retention policy endpoint
- backup policy endpoint
- backup manifest
- retention dryRun
- retention audit izi

### Check neye bakar?
Ana referans: `backend/scripts/m45_retention_backup_check.js`
- retention policy alanları
- gps retention görünürlüğü
- telematics uses gpsPoint
- backup policy
- backup manifest
- retention run audit

### PASS olursa sonuç
- veri yaşam döngüsü ve geri dönüş güveni kurumsal omurgaya bağlanır

---

## M46 — AI Copilot foundation  
**Kanıt seviyesi:** [TEYİTLİ-REPO] + [TEYİTLİ-RUNBOOK]

### Ana amaç
Copilot’u ürün içine resmi yardımcı katman olarak sokmak.

### Ne yapar?
- scoped shift/vehicle keşfi
- role bağlı yardımlar
- AI route/tool temel sözleşmeleri
- ürün içi açıklayıcı yardım

### Check neye bakar?
Ana temel referans: `backend/scripts/m46_ai_copilot_check.js`
- room/company/super/driver login
- shift ve vehicle keşfi
- scoped AI/coplilot davranışı

### Alt fazlar
- **M46.1** AI copilot enrichment
- **M46.2** intent expansion
- **M46.3** quality evidence
- **M46.4** decision consistency
- **M46.5** action prioritization
- **M46.6-A** AI job guide
- **M46.6-B** AI job guide precheck
- **M46.6-C** AI screen help
- **M46.6-C2** screen coverage terminology
- **M46.6-D** AI chat shell
- **M46.6-D2** AI context chat
- **M46.6-D3** AI actionable chat
- **M46.6-D4** simple role mode
- **M46.6-T** AI location source guide
- **M46.7** driver code login rehber first
- **M46.8** driver access hardening
- **M46.9** session refresh security

### PASS olursa sonuç
- copilot ürün içi uzman rehber olmaya başlar; sade Türkçe, ekran bağlamı ve aksiyon yönlendirmesi zemini oluşur

### Ana artefaktlar
- `backend/scripts/m46_*`
- `docs/RUNBOOK_M46_*`

---

## M47 — KVKK notice/consent framework + capacity/load + production resilience  
**Kanıt seviyesi:** [TEYİTLİ-REPO] + [TEYİTLİ-RUNBOOK]

### Ana amaç
Pilot öncesi güvenlik, rıza ve ölçek gözlem katmanını sertleştirmek.

### Ne yapar?
- KVKK notice/consent framework
- capacity/load baseline
- production resilience + edge security
- mobile readiness web pass gibi tamamlayıcı hazırlıklar

### Check neye bakar?
- `m47_kvkk_notice_consent_framework_check.js`
- `m47_2_capacity_load_baseline_check.js`
- `m47_3_production_resilience_edge_security_check.js`

### PASS olursa sonuç
- rıza, kapasite ve edge güvenliği aynı anda görünür hale gelir

### Ana artefaktlar
- `docs/RUNBOOK_M47_*`
- `backend/scripts/m47_*`

---

## M48 — Driver mobile foundation / room-company tablet readiness  
**Kanıt seviyesi:** [TEYİTLİ-RUNBOOK] + [YENİDEN KURGULANMIŞ]

### Ana amaç
Mobil ve tablet kullanımını erken saha mantığında hazırlamak.

### Ne yapar?
- driver mobil temeli
- room/company tablet readiness

### Check neye bakar?
Runbook seviyesinde repo çıktıları ve kullanım hazırlığı.

### PASS olursa sonuç
- sürücü mobil hattı ve büyük ekran/tabet akışı pilot öncesi oturur

### Ana artefaktlar
- `docs/RUNBOOK_M48_DRIVER_MOBILE_FOUNDATION.md`
- `docs/RUNBOOK_M48_5_ROOM_COMPANY_TABLET_READINESS.md`

---

## M49 — Mobile beta hardening + driver voice guidance / stop ETA  
**Kanıt seviyesi:** [TEYİTLİ-RUNBOOK]

### Ana amaç
Mobil sürücü deneyimini beta seviyesinde sertleştirmek.

### Ne yapar?
- mobile beta hardening
- driver voice guidance
- stop ETA görünürlüğü

### Check neye bakar?
Runbook ve ilgili pack/check izleri üzerinden mobil davranış bütünlüğü.

### PASS olursa sonuç
- mobil sürücü tarafı daha saha yakın hale gelir

### Ana artefaktlar
- `docs/RUNBOOK_M49_MOBILE_BETA_HARDENING.md`
- `docs/RUNBOOK_M49_1_DRIVER_VOICE_GUIDANCE_STOP_ETA.md`

---

## M50 — Mobile release readiness  
**Kanıt seviyesi:** [TEYİTLİ-RUNBOOK]

### Ana amaç
Mobil tarafı release düşüncesiyle paketlemek.

### Ne yapar?
- release readiness
- env ve dağıtım zemini
- mobil hataların erken kapanışı

### Check neye bakar?
Runbook seviyesinde build ve release hazırlık maddeleri.

### PASS olursa sonuç
- M57/M58/M81 hattına giden mobil temel olgunlaşır

### Ana artefaktlar
- `docs/RUNBOOK_M50_MOBILE_RELEASE_READINESS.md`

---

## M51 — Pre-pilot gap closure  
**Kanıt seviyesi:** [TEYİTLİ-DOC]

### Ana amaç
Yeni özellik eklemek değil; eksikleri netleştirip sıralamak.

### Ne yapar?
- backlog reset
- gap register
- capability sınıflandırma
- saha öncesi kapanacakların net listesi

### Check neye bakar?
- repo capability’lerinin doğru sınıflanması
- M52–M57 sırasının sabitlenmesi

### PASS olursa sonuç
- “önce ne kapanacak?” tartışması yazılı hale gelir

---

## M52 — Import & Geo Pipeline  
**Kanıt seviyesi:** [TEYİTLİ-DOC]

### Ana amaç
Import → geocode → review → stop generation zincirini ürün kuralı haline getirmek.

### Ne yapar?
- import contract
- geo state rules
- batch geocode flow
- review UX cleanup

### Check neye bakar?
- import trail
- `OK / NEEDS_REVIEW / FAILED`
- manual override ezilmiyor mu?
- M53 için temiz veri üretiyor mu?

### PASS olursa sonuç
- veri içeri alma hattı saha öncesi daha kurallı olur

---

## M53 — Stop & Route Productization  
**Kanıt seviyesi:** [TEYİTLİ-DOC]

### Ana amaç
Durak üretimi ve rota preview’yi ürün standardına bağlamak.

### Ne yapar?
- default `maxWalkM`
- summary sinyalleri
- quality summary
- preview standardı

### Alt faz
#### M53.3 — Plan Builder Stage-3 Reorder + Transfer Completion
- reorder ve transfer tamamlama ürün kuralı

### PASS olursa sonuç
- route/stop üretimi daha standardize hale gelir

---

## M54 — Dispatch approve repack + driver route delivery  
**Kanıt seviyesi:** [TEYİTLİ-RUNBOOK]

### Ana amaç
Dispatch ve sürücüye rota teslim çizgisini sıkılaştırmak.

### Ne yapar?
- approval sonrası operasyon paketi yenilenmesi
- sürücüye rota/görev teslimi

### Alt fazlar
- `M54.3` Dispatch approve repack
- `M54.4` Driver route delivery

### PASS olursa sonuç
- onay sonrası saha paketinin güncel ve teslim edilebilir olduğu güveni oluşur

---

## M55 — Reports / No-show  
**Kanıt seviyesi:** [TEYİTLİ-RUNBOOK]

### Ana amaç
Rapor ve no-show davranışlarını ürünsel hale getirmek.

### Ne yapar?
- rapor yüzeyleri
- no-show kayıtları / metrikleri

### Check neye bakar?
- `backend/scripts/m55_reports_no_show_check.js`

### PASS olursa sonuç
- sistem operasyon geçmişini raporlayabilir hale gelir

---

## M56 — KVKK ETA quality  
**Kanıt seviyesi:** [TEYİTLİ-RUNBOOK]

### Ana amaç
ETA ve görünürlük kalitesini KVKK ile birlikte ele almak.

### Ne yapar?
- KVKK matrix / ETA foundation
- visibility / ETA quality
- ETA skip/reroute

### Alt fazlar
- `M56.1` KVKK matrix ETA foundation
- `M56.2` KVKK visibility ETA quality
- `M56.3` ETA skip reroute

### PASS olursa sonuç
- ETA kalitesi veri görünürlüğü ile çelişmeden çalışır

---

## M57 — Mobile hardening  
**Kanıt seviyesi:** [TEYİTLİ-DOC]

### Ana amaç
Sürücü telefon uygulamasını saha öncesi sertleştirmek.

### Ne yapar?
- foreground GPS publish
- offline/online toparlama
- session failure UX
- KVKK blocking görünürlüğü
- Android preview/internal build disiplini

### Alt fazlar
- `M57.1` Foreground GPS publish + izin kapısı
- `M57.2` Offline/online toparlama + retry dili
- `M57.3` Session failure + KVKK blocking
- `M57.4` Android preview/internal build disiplini

### PASS olursa sonuç
- mobil sürücü uygulaması resmi checklist’e alınabilir hale gelir

---

## M58 — Final pilot readiness  
**Kanıt seviyesi:** [TEYİTLİ-DOC]

### Ana amaç
Pilot öncesi son kontrol kapısı.

### Ne yapar?
- final pilot checklist
- saha testi akışları
- mobil gerçek cihaz / preview build doğrulaması
- go / no-go dili

### Check neye bakar?
- `backend/scripts/m58_final_pilot_readiness_check.js`
- pack / repo contract / runbook seti

### PASS olursa sonuç
- repo pilot hazırlık kontratını karşılıyor denir; yine de resmi green için manuel saha kabul gerekir

---

## M59 — Observability + field diagnostics  
**Kanıt seviyesi:** [TEYİTLİ-DOC]

### Ana amaç
Saha teşhisini yönetilebilir kılmak.

### Ne yapar?
- observability manifest
- field diagnostics yüzeyi
- runtime ve saha sorunlarının daha okunur hale gelmesi

### Check neye bakar?
- `backend/scripts/m59_observability_field_diagnostics_check.js`

### PASS olursa sonuç
- saha sorunu yaşandığında “neden?” sorusuna repo içinden cevap aranabilir

---

## M60 — Field Acceptance Center  
**Kanıt seviyesi:** [TEYİTLİ-DOC]

### Ana amaç
Saha kabulünü ürün içi merkezde toplamak.

### Ne yapar?
- acceptance merkezi
- saha checklist’leri
- kabul/red/eksik akışı

### Check neye bakar?
- `backend/scripts/m60_field_acceptance_center_check.js`

### PASS olursa sonuç
- kabul süreci dağınık not olmaktan çıkar

---

## M61 — SSOT + Milestone hizası  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER]

### Ana amaç
Resmi ürün yönünü tek kayıtta toplamak.

### Ne yapar?
- milestone registry
- SSOT alignment paneli
- hizalama manifesti

### Check neye bakar?
- registry
- panel
- route
- pack/check/runbook seti

### PASS olursa sonuç
- bundan sonraki milestone’lar drift olmadan ilerler
- kural: M61 green olmadan M62 açılmaz

---

## M62 — Ticari omurga güçlendirme  
**Kanıt seviyesi:** [TEYİTLİ-DOC]

### Ana amaç
Talep, teklif, karşı teklif, pazarlık geçmişi ve sözleşmeye geçiş kapısını resmi ticari omurgaya dönüştürmek.

### Ne yapar?
- commercial core manifest
- super admin paneli
- ticari route’lar

### Check neye bakar?
- `backend/scripts/m62_commercial_core_strengthening_check.js`

### PASS olursa sonuç
- ürün artık sadece operasyon değil, resmi ticari akış omurgası taşır

---

## M63 — Güven + kalite + hizmet değerlendirme  
**Kanıt seviyesi:** [TEYİTLİ-DOC]

### Ana amaç
Hizmet kalitesini ve güven sinyallerini ürün içine almak.

### Ne yapar?
- service evaluation store
- trust quality manifest
- score görünürlüğü

### Check neye bakar?
- `backend/scripts/m63_trust_quality_service_evaluation_check.js`

### PASS olursa sonuç
- company/room seçimleri sadece fiyat değil kalite sinyali de taşır

---

## M64 — Doğal Copilot katmanı  
**Kanıt seviyesi:** [TEYİTLİ-DOC]

### Ana amaç
Copilot’u daha doğal Türkçe ve daha açıklayıcı hale getirmek.

### Ne yapar?
- doğal cevap manifesti
- kısa konuşma hafızası iskeleti
- neden ilerlemiyor kartı
- basit anlat kartı

### Check neye bakar?
- `backend/scripts/m64_natural_copilot_layer_check.js`

### PASS olursa sonuç
- copilot artık daha insani ve role uygun açıklama katmanı taşır

---

## M65 — Pilot launch gate  
**Kanıt seviyesi:** [TEYİTLİ-DOC]

### Ana amaç
Pilot öncesi resmi geçiş kapısını koymak.

### Ne yapar?
- launch gate manifest
- go/no-go mantığı
- pilot açılış eşiği

### Check neye bakar?
- `backend/scripts/m65_pilot_launch_gate_check.js`

### PASS olursa sonuç
- saha lansmanı “hissettik açtık” değil, kapılı karar haline gelir

---

## M66 — Operation reassignment  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ana amaç
Operasyonel atama değişikliğini resmi ürün davranışı yapmak.

### Ne yapar?
- `/reassign` endpoint
- operation-events endpoint
- room panelde Atamayı Değiştir
- company/room operasyon kaydı
- audit `SHIFT_REASSIGN`

### Check neye bakar?
- required files
- route skeleton
- audit event
- removed/new driver handoff events
- modal ve Türkçe reason mapping
- pack/runbook wiring

### PASS olursa sonuç
- operasyon sırasında araç/sürücü değişikliği kontrollü ve kaydedilebilir hale gelir

---

## M67 — Kurumsal ölçek hazırlık paketi  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER (band pass)]

### Ana amaç
Company fetch mimarisini ölçmek ve ölçek sorunlarını görünür hale getirmek.

### Ne yapar?
- fetch storm ölçümü
- scale readiness
- 100/300/1000 kullanıcı yük hazırlığı
- ağır ekranları işaretleme

### Check neye bakar?
- fetch tekrarları
- 429/5xx riski
- visible-only loading eksikleri
- AbortController eksikleri

### PASS olursa sonuç
- kurumsal ölçek sertleştirme sırası netleşir

---

## M68 — Fetch hardening  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER]

### Ana amaç
İlk ölçek ölçümünden çıkan ana fetch sorunlarını azaltmak.

### Ne yapar?
- gereksiz çağrı azaltımı
- fetch davranışı sıkılaştırma
- menü/panel bazlı veri yükünü daha kontrollü yapmak

### Check neye bakar?
- `backend/scripts/m68_fetch_hardening_check.js`

### PASS olursa sonuç
- ürün yük altında daha az savruk davranır

---

## M69 — Fetch hardening phase-2  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER]

### Ana amaç
İlk fetch sertleştirmesini ikinci dalgaya taşımak.

### Ne yapar?
- daha derin endpoint azaltımı
- fetch zincirinde ikinci faz optimizasyonlar

### Check neye bakar?
- `backend/scripts/m69_fetch_hardening_phase2_check.js`

### PASS olursa sonuç
- büyük şirket kullanımı için daha sakin yük profili çıkar

---

## M70 — Checker sync + hot path  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER]

### Ana amaç
Check hattı ile hot path ürün gerçeğini hizalamak.

### Ne yapar?
- checker sync
- hot path contract hizası

### Check neye bakar?
- `backend/scripts/m70_checker_sync_hot_path_check.js`

### PASS olursa sonuç
- check’ler sahte değil, daha gerçek ürün davranışını ölçer

---

## M71 — Summary endpoints + hot path reduction  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER]

### Ana amaç
Sık kullanılan özet endpoint’leri ile yükü azaltmak.

### Ne yapar?
- summary endpoint’ler
- selection guard’lar
- copilot route/context hotfix’leri

### Check neye bakar?
- `m71_*` script ailesi
- selected entity, floating drawer, route bridge, ui contract vb.

### PASS olursa sonuç
- hem copilot hem panel summary akışları daha düşük yükle çalışır

---

## M72 — Hot endpoint reduction  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER]

### Ana amaç
Aşırı sık çağrılan endpoint’leri azaltmak.

### Ne yapar?
- geo review token ve hot endpoint daraltmaları
- high-frequency request riskini düşürme

### Check neye bakar?
- `backend/scripts/m72_hot_endpoint_reduction_check.js`

### PASS olursa sonuç
- sıcak path’ler daha ölçek dostu hale gelir

---

## M73 — Hot path phase-2  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER]

### Ana amaç
Hot path reduction’ın ikinci fazını kapatmak.

### Ne yapar?
- önemli panel ve endpoint yüklerini daha da azaltma

### Check neye bakar?
- `backend/scripts/m73_hot_path_phase2_check.js`

### PASS olursa sonuç
- ürün yoğun kullanımda daha dayanıklı hale gelir

---

## M74 — Hot path phase-3  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER]

### Ana amaç
Hot path reduction üçüncü faz.

### Ne yapar?
- phase-3 daraltmalar
- seçime bağlı pahalı akışları daha kontrollü hale getirme

### Check neye bakar?
- `backend/scripts/m74_hot_path_phase3_check.js`

### PASS olursa sonuç
- company/room tarafında yoğun veri ekranları daha kontrollü çalışır

---

## M75 — Hot path phase-4 / living baseline  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER]

### Ana amaç
Hot path sertleştirmesini baseline seviyesine bağlamak.

### Ne yapar?
- living baseline
- repo contract/hotfix hizası

### Check neye bakar?
- `backend/scripts/m75_hot_path_phase4_check.js`

### PASS olursa sonuç
- bundan sonrası için resmi baseline oluşur

---

## M76A-1 — Minimum normalization  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER]

### Ana amaç
Check/runbook/doküman ve repo sözleşmesini minimum ortak biçime çekmek.

### Ne yapar?
- naming/hiza temizlikleri
- repo contract normalize

### Check neye bakar?
- `backend/scripts/m76a_1_minimum_normalization_check.js`

### PASS olursa sonuç
- dağınıklık ilk kez topluca azalır

---

## M76B — Living matrix + tools consolidation  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER]

### Ana amaç
Tooling ve living matrix’i tek hatta toplamak.

### Ne yapar?
- tools consolidation
- matrix güncellemeleri
- static repo check runner hizası

### Check neye bakar?
- `backend/scripts/m76b_living_matrix_tools_consolidation_check.js`

### PASS olursa sonuç
- doğrulama hattı daha okunur hale gelir

---

## M76A-2 — Final normalization + archiving  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER]

### Ana amaç
Normalization sürecini arşivleme ve final hiza ile kapatmak.

### Ne yapar?
- final normalization
- archiving
- eski/yaşayan doküman ayrımı

### Check neye bakar?
- `backend/scripts/m76a_2_final_normalization_archiving_check.js`

### PASS olursa sonuç
- repo daha yönetilebilir belge/topoloji yapısına geçer

---

## M77 — KVKK + uyum katmanı  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER]

### Ana amaç
KVKK, retention, export trail ve anonymize hedeflerini resmi omurgaya bağlamak.

### Ne yapar?
- KVKK görünürlük matrix’i
- retention enforcement
- export trail
- audit izi
- anonymize hedefleri

### Check neye bakar?
- `backend/scripts/m77_kvkk_uyum_katmani_check.js`

### PASS olursa sonuç
- ürün uyum katmanını operasyon dışında ayrı bir resmi omurga olarak taşır

---

## M78 — Checklist + operasyon doğrulama iskeleti  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER]

### Ana amaç
Operasyon doğrulamasını checklist mantığına bağlamak.

### Ne yapar?
- proof / checklist iskeleti
- operasyon doğrulama omurgası

### Check neye bakar?
- `backend/scripts/m78_checklist_operasyon_dogrulama_check.js`

### PASS olursa sonuç
- operasyon verisi yalnız listelenmez; doğrulama mantığına bağlanır

---

## M78.1 — Operasyon doğrulama yüzeyi  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER]

### Ana amaç
Operasyon doğrulama bilgisini görünür yüzeye taşımak.

### Check neye bakar?
- `backend/scripts/m78_1_operasyon_dogrulama_yuzeyi_check.js`

### PASS olursa sonuç
- operatör kayıtları daha rahat okuyabilir

---

## M78.2 — Operasyon doğrulama kayıt katmanı  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER]

### Ana amaç
Doğrulama kayıtlarını kalıcı ve yorumlanabilir hale getirmek.

### Check neye bakar?
- `backend/scripts/m78_2_operasyon_dogrulama_kayit_katmani_check.js`

### PASS olursa sonuç
- operasyon doğrulama iz bırakır, geçmişe bakılabilir

---

## M78.3 — Operasyon doğrulama özet ve filtre katmanı  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER]

### Ana amaç
Doğrulama kayıtlarını daha okunur ve filtrelenebilir hale getirmek.

### Check neye bakar?
- `backend/scripts/m78_3_operasyon_dogrulama_ozet_filtre_katmani_check.js`

### PASS olursa sonuç
- kayıtlar aynı ekranda daha okunur hale gelir

---

## M79 — Copilot acceptance / ürün içi uzman rehber kabul turu  
**Kanıt seviyesi:** [TEYİTLİ-DOC registry] + [TEYİTLİ-PRIMER]

### Ana amaç
Copilot’un gerçekten ürün içi uzman rehber seviyesine çıkıp çıkmadığını doğrulamak.

### Ne yapar?
- rol, ekran ve seçili kayıt bağlamını daha güvenilir okur
- sade Türkçe, neden açıklaması ve sonraki doğru adım davranışı

### Check neye bakar?
- `m79_a*`, `m79_b*`, `m79_c*`, `m79_d1*` check ailesi
- acceptance pack

### PASS olursa sonuç
- copilot deneyimi kabul eşiğine bağlanır

---

## M80 — Final sert kabul ve yük güveni  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER]

### Ana amaç
Pilot readiness, saha acceptance, copilot acceptance ve load güvenini tek son kabul kapısında toplamak.

### Ne yapar?
- final kabul kapısı
- yük güveni görünürlüğü
- snapshot/kanıt hijyeni
- OSRM opsiyonel çalışma kontratı

### Check neye bakar?
- `backend/scripts/m80_final_sert_kabul_yuk_guveni_check.js`
- M80 pack / repo contract

### PASS olursa sonuç
- M80 kapısının repo içinde resmi olarak açıldığı anlaşılır; yine de final green için son daraltmalar gerekir

---

## M80.1 — Hot panel daraltma  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER]

### Ana amaç
En pahalı panel giriş yükünü düşürmek.

### Check neye bakar?
- `backend/scripts/m80_1_hot_panel_daraltma_check.js`

### PASS olursa sonuç
- panel ilk açılış yükü daralır

---

## M80.2 — Agreements + Shifts giriş yükü  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER]

### Ana amaç
Agreement ve shift ekranlarına girişteki yükü azaltmak.

### Check neye bakar?
- `backend/scripts/m80_2_agreements_shifts_giris_yuku_check.js`

### PASS olursa sonuç
- ticari ve operasyon panelleri daha hızlı ilk frame verir

---

## M80.3 — GeoReview + Shifts son giriş yükü  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER]

### Ana amaç
GeoReview ve shifts son giriş yüklerini de daraltarak M80 kapısını tamamlamak.

### Check neye bakar?
- `backend/scripts/m80_3_georeview_shifts_son_giris_yuku_check.js`

### PASS olursa sonuç
- hot panel zinciri daha kontrollü hale gelir

---

## M81 — Mobile saha sertleştirme  
**Kanıt seviyesi:** [TEYİTLİ-DOC] + [TEYİTLİ-PRIMER]

### Ana amaç
Mobil omurgayı resmi quality hattına bağlamak.

### Ne yapar?
- Android + iOS build/distribution disiplini
- release/env/version disiplini
- foreground + background GPS runtime omurgası
- runtime görünürlüğü
- background permission / task state / runtime snapshot / session failure / KVKK blocking / last sync

### Check neye bakar?
- iOS readiness
- Android preview/internal build
- release/env discipline
- M81 mobile saha sertleştirme pack

### PASS olursa sonuç
- mobil altyapı ve runtime sertleştirme resmi hatta bağlanır
- ama mobil ürünün tüm gerçek kullanım ekranları bitmiş sayılmaz

---

# 5) Bundan sonrası — planlı future milestone’lar

## M82 — Saha öncesi çekirdek sertleştirme + controlled cleanup  
**Kanıt seviyesi:** [PLAN]

### Ana amaç
Mevcut repo eksiklerini kapatmadan yeni ticari genişlemeye gitmemek.

### M82.1 — Backend correctness kilidi
- route snapshot invalidation tam düzeltme
- stop add/update/delete/template/hub/direction/pattern sonrası snapshot yenileme
- backend preview cache invalidation
- transaction eksiklerini kapatma
- merkezi error contract

### M82.2 — Web UI + API kontrat sertleştirme + büyük dosyaları parçalama
- frontend preview cache invalidation
- modal/panel/route-preview senkronu
- ortak hata modeli
- büyük dosyaları modüler parçalama
  - `web/src/panels/company/ShiftsPanel.jsx`
  - `web/src/panels/room/ShiftsPanel.jsx`
  - `web/src/panels/room/VehiclesPanel.jsx`
  - `web/src/panels/company/GuidedPlanModal.jsx`
  - `backend/src/routes/shifts/company.js`
  - `backend/src/routes/shifts/room.js`

### M82.3 — Mobil gerçek kullanım tamamlama
- mobil ürün envanteri
- vardiya detayı
- rota okunurluğu
- haritaya aç / navigasyon
- sade Türkçe UX

### M82.4 — Background GPS / offline davranış sertleştirme
- görev yoksa / izin yoksa / KVKK blok / session düşmesi / retry queue

### M82.5 — Canlı konum kaynak önceliği
- araç GPS’i varsa birinci kaynak
- sürücünün telefon GPS’i fallback
- selected live source
- conflict görünürlüğü

### M82.6 — Release / env / acceptance sertleştirme
- mobil koordinat `0` truthy bug fix
- placeholder env URL reddi
- stricter env validation

### M82.7 — Repo hygiene + cleanup
- `dist`, `.bak`, `overlay-backups`, geçici kalıntılar, encoding, env paketleme politikası

### M82.8 — Verification 2.0
- M81 check hattını gerçeğe yaklaştırma
- runtime’a daha yakın smoke ve acceptance doğrulamaları
- `verify:hot`, `repo_contract_state`, README/STARTPACK/tools README hizası

### PASS olursa sonuç
- proje 10/10 kaliteye yaklaşmak için önce temel borcunu kapatır

---

## M82.9 — Dormant payment backbone + commercial source abstraction  
**Kanıt seviyesi:** [PLAN]

### Ana amaç
Ödeme mimarisini şimdi kurmak, ama tam para akışını sonra açmak; ayrıca ödeme/komisyon mantığını yalnız agreement’e kilitlemeyip kısa iş ve vardiya serisini de kapsayan ticari kaynak omurgasına geçirmek.

### Ne yapar?
- `paymentMode = OFF | OPTIONAL | REQUIRED`
- `CommissionRule`
- `SettlementPlan`
- `SettlementEntry`
- `PaymentAccount`
- provider adapter interface
- `CommercialSource` mantığı: ilk fazda `AGREEMENT | SHIFT_SERIES`
- agreement oluştuğunda payment/commission snapshot
- kısa iş / 5 günlük iş / vardiya serisi oluştuğunda `SHIFT_SERIES` üzerinden payment/commission snapshot
- settlement kayıtlarını yalnız agreement’e değil ilgili ticari kaynağa bağlama

### Check / tasarım kapısı neye bakar?
- ticari kaynak agreement ise settlement ve komisyon snapshot agreement’ten türeyebiliyor mu?
- ticari kaynak kısa iş/vardiya serisi ise agreement açmadan aynı omurga çalışabiliyor mu?
- `OFF / OPTIONAL / REQUIRED` modları veri modelinde ve servis katmanında taşınıyor mu?
- gelecekte gerçek tahsilat/payout açılmadan önce readonly ve dormant akış kurulmuş mu?

### PASS olursa sonuç
- ürün ücretsiz kalabilir ama gelecekteki komisyon/aracılık geliri için omurgası hazır olur
- yalnız uzun sözleşmeli iş değil, kısa süreli vardiya serileri de aynı ticari omurgaya oturur
- ödeme tarafı sonradan yamalı eklenti değil, çekirdek domain uzantısı haline gelir

---

## M82.10 — Super Admin ticari ayarlar + oda bazlı komisyon override  
**Kanıt seviyesi:** [PLAN]

### Ana amaç
Ödeme modu ve komisyon oranını merkezi yönetmek; ayrıca varsayılan oranı gerektiğinde oda bazlı override ile değiştirebilmek.

### Ne yapar?
- Super Admin ödeme modu seçer
- global komisyon oranı sade girilir: `1`, `2`, `3` → yüzde
- oda bazlı komisyon override tanımlanabilir
- backend güvenli saklar (örn. bps)
- audit izi oluşur
- çözüm sırası tanımlanır: özel ticari kaynak override > oda override > global varsayılan

### Check / tasarım kapısı neye bakar?
- Super Admin global oranı değiştirebiliyor mu?
- belirli oda için farklı oran yazılabiliyor mu?
- yeni agreement veya yeni `SHIFT_SERIES` oluştuğunda doğru oran snapshot alınıyor mu?
- oran değişince eski ticari kayıtlar bozulmadan kalıyor mu?

### PASS olursa sonuç
- ticari politika kod gömülü değil, yönetilebilir hale gelir
- büyük/özel odalar için kontrollü ticari model kurulabilir
- eski kayıt bozulmadan yeni işlere yeni oran uygulanabilir

---

## M82.11 — Payment readonly ticari yüzey + agreement/kısa iş görünürlüğü  
**Kanıt seviyesi:** [PLAN]

### Ana amaç
Ödeme tam açılmadan önce bile ticari hazırlığı yalnız agreement üzerinde değil, kısa iş ve vardiya serisi ekranlarında da görünür kılmak.

### Ne yapar?
- payment mode görünürlüğü
- komisyon snapshot görünürlüğü
- settlement hazırlık durumu
- feature flag görünürlüğü
- agreement ekranlarında readonly ticari yüzey
- kısa iş / vardiya serisi ekranlarında readonly ticari yüzey

### Check / tasarım kapısı neye bakar?
- agreement ekranı ticari hazırlığı doğru gösteriyor mu?
- `SHIFT_SERIES` tabanlı kısa iş ekranı aynı ticari dili gösterebiliyor mu?
- ödeme kapalı olsa bile kullanıcı ticari mod, oran ve hazırlık durumunu okuyabiliyor mu?

### PASS olursa sonuç
- kullanıcı sistemde ödeme omurgasının hazır olduğunu görür
- agreement’li iş ile kısa iş arasında ticari görünürlük farkı kapanır
- ödeme açılmadan önce bile kurumsal ticari omurga hissi oluşur

---

## M83 — Saha test hazırlık paketi  
**Kanıt seviyesi:** [TEYİTLİ-PRIMER] + [PLAN]

### Ana amaç
Sahaya plansız çıkmamak.

### Ne yapar?
- canlı ortam değişkenleri
- test senaryoları
- operatör uygulama sırası
- cihaz/kullanıcı/rol checklist’i

### PASS olursa sonuç
- saha test günü kaotik değil, kontrollü olur

---

## M84 — Saha gözlem / geri bildirim döngüsü  
**Kanıt seviyesi:** [TEYİTLİ-PRIMER] + [PLAN]

### Ana amaç
Saha çıktısını gerçek ürün girdisine dönüştürmek.

### Ne yapar?
- sorun sınıflama
- hotfix listesi
- tekrar kontrol planı

### PASS olursa sonuç
- saha geri bildirimi dağınık not olarak kalmaz

---

## M85 — Ödeme opsiyonel pilot  
**Kanıt seviyesi:** [PLAN]

### Ana amaç
Ödeme sistemini kontrollü kapsamda opsiyonel denemek.

### Ne yapar?
- `OPTIONAL` mod pilotu
- dış ödeme + sistem içi kayıt uyumu
- komisyon hesap doğrulaması

### PASS olursa sonuç
- ödeme omurgası gerçek veride düşük riskle test edilir

---

## M86 — Ödeme zorunlu rollout  
**Kanıt seviyesi:** [PLAN]

### Ana amaç
Yayılım sonrası gelir modelini sistem içine tam aktive etmek.

### Ne yapar?
- `REQUIRED` mod rollout
- tahsilat + payout
- komisyon aktivasyonu
- iade/iptal/düzeltme politikaları
- güçlü audit ve mutabakat

### PASS olursa sonuç
- platform yazılım lisansından değil, işlem/komisyon aracılığından para kazanan yapıya döner

---

# 6) Kısa stratejik okuma

Bu rehbere göre ürünün evrimi şu çizgidedir:

1. **M0–M12:** iskelet, auth, canlı GPS, stop lifecycle, notify, güvenlik ve runbook disiplini  
2. **M13–M21:** conflict, bind, agreement, availability, super admin readiness  
3. **M22–M32:** company/marketplace UX ve template/wizard ürünleşmesi  
4. **M33–M50:** plan builder, super admin ops, parent/school, KVKK, telematics, copilot, mobil temel  
5. **M51–M58:** pilot öncesi gap closure, import/geo, stop/route productization, mobil hardening, pilot readiness  
6. **M59–M66:** observability, saha acceptance, SSOT, ticari omurga, trust/quality, doğal copilot, launch gate, operation reassignment  
7. **M67–M81:** ölçek sertleştirme, hot path daraltma, normalization, KVKK uyum, operasyon doğrulama, final load/acceptance, mobil saha sertleştirme  
8. **M82–M86:** önce çekirdek kalite borcu, sonra `AGREEMENT | SHIFT_SERIES` tabanlı dormant ticari/ödeme omurgası, sonra saha, sonra gelir modeli aktivasyonu  

---

# 7) Bu dokümanın proje içi kullanımı

Bu dosya şu amaçlarla kullanılmalıdır:

- yeni sohbete primer çıkarmadan önce milestone anlamlarını hızlı hatırlamak
- `mXcheck.js` script’lerinin neden var olduğunu anlamak
- “bu milestone PASS olunca proje ne kazanıyor?” sorusuna tek yerde cevap vermek
- gelecekte M82+ hattını yazarken geçmiş omurgayı bozmamak
- SSOT / STARTPACK / backlog tartışmalarında ortak referans olmak

Öneri: Bu dosya, `STARTPACK_V1.md`, `PRIMER_SSOT.md` ve `MILESTONE_REGISTRY_V1.md` ile birlikte anılsın.
