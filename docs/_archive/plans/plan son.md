Planları okudum ✅ (plans.zip içeriği: SPRINT_1..4 + EPIC_B/C/D). Şu anki ekranın (kırmızı alan) için istediğin “oluşturulan vardiyaya personel ekle + rota/durak üret + map önizleme” işi Sprint 1–2’nin UI yüzü ve ROOM tarafında da “önizleme butonu” ile tamamlanıyor.

Aşağıya hem hangi dosyalarda yapacağımızı hem de tasarım/akış önerisini net yazıyorum. En sonda da yeni “primer” taslağını verdim.

1) Planlardan çıkan hedef (Sprint 1–2) — bizim sisteme uyarlama
Sprint 1 (MVP)

Company, bir shift için personel listesini ekleyebilmeli (manuel + CSV/Excel import).

Adres → geocode cache (OK / NEEDS_REVIEW / FAILED).

Import izleri: ShiftImport + ShiftImportRow.

Sprint 2 (Core)

Personel noktalarından durak üretimi (clustering): maxWalkM garantili.

Shift’e duraklar + stopAssignment bağları yazılır.

Company tarafı map önizleme görür.

ROOM tarafı bekleyen talepte “rota/durak önizle” butonuyla aynı haritayı görür.

Bizde halihazırda: Shift + Stops + approve/assign/start akışı var ✅
Eksik: “shift ↔ personel listesi + draft durak üretimi + map preview + room preview”.

2) UI tasarım: COMPANY Shifts paneline yeni sekme
Kırmızı alana eklenecek yeni tab

“Personel & Rota” (veya kısa: “Personel”)

Bu tabın içinde 3 blok:

Hangi vardiya üzerinde çalışıyoruz?

Dropdown: son 50 shift (tercihen DRAFT/REQUESTED öncelikli)

Seçince: “Bu shift için personel sayısı / geocode durumu / durak sayısı” summary.

Personel ekle / içe aktar

Manuel ekle: Ad Soyad, Tel, Adres

Import: CSV/Excel (MVP’de CSV yeter)

Liste: satır satır geoStatus + hata mesajı

NEEDS_REVIEW için: “Konum düzelt” (map üzerinden pin bırak / lat-lng gir)

Durak üret + Map önizleme

Ayar: maxWalkM (default örn 120m)

Buton: “Durakları Oluştur (REPLACE)” → backend draft üretir

Altında: “Haritada Önizle” (durak marker + personel marker + polyline)

Ayrıca: “Talebi Room’a Gönder / Güncelle” (eğer akışta status geçişi istiyorsak)

3) ROOM tarafı: “Rota/Durak Önizle” butonu

ROOM’un bekleyen shift listesinde (senin ROOM panelinde “bekleyen talepler” gördüğün tablo):

Her satıra bir buton:

“Haritada Önizle”

Tıklayınca modal açılır:

shift duraklarını çeker (/api/shifts/:id + /api/shifts/:id/stops gibi)

duraklar + rota çizgisi gösterir.

Bu modalı tek bir ortak component yaparsak hem COMPANY hem ROOM kullanır.

4) Hangi dosyalarda yapacağız?
COMPANY UI

web/src/panels/company/ShiftsPanel.jsx

Tab listesine yeni sekme eklenecek

Yeni tab içeriği buraya konacak (veya component’e bölünecek)

Önerilen yeni component’ler (temiz kalması için):

web/src/panels/company/ShiftPeopleTab.jsx (opsiyonel)

web/src/components/RoutePreviewModal.jsx

web/src/components/ShiftPersonelTable.jsx (opsiyonel)

ROOM UI

ROOM’un shift/pending listesinin olduğu dosya hangisiyse (muhtemelen):

web/src/panels/room/ShiftsPanel.jsx veya benzeri

Oraya “Haritada Önizle” butonu + modal bağlanacak.

5) Backend tarafı (UI’nin dayanağı olacak minimum endpoint seti)

Sprint planlarına uyumlu, minimal set:

Personel listesi / import

POST /api/company/shifts/:id/personels (manuel ekleme)

POST /api/company/shifts/:id/import (CSV/Excel)

GET /api/company/shifts/:id/imports + GET /api/company/imports/:id/rows

PUT /api/company/personels/:id/location (NEEDS_REVIEW düzeltme)

Draft durak üretimi

POST /api/company/shifts/:id/generate-draft?maxWalkM=120&mode=REPLACE

GET /api/shifts/:id/stops (stops + assignment count)

(opsiyonel) GET /api/shifts/:id/stops?include=assignments

UI map preview için stops endpoint’i yeterli. Assignment detayını göstermek istersen include açarız.

6) Bu aşama için yeni PRIMER (yapıştırmalık)

Aşağıyı SSOT’a “Next” bölümü olarak ekleyebilirsin:

PERSONEL-SERVIS V1 — NEXT (M16) PRIMER

Hedef: Company shift için personel ekleme + import + geocode review + durak üret + map önizleme; ROOM tarafında rota/durak önizleme.

UI:

Company ShiftsPanel tabs: Yeni Talep / Vardiya Şablonları / Personel & Rota

Personel & Rota tab:

Shift seç → personel ekle/import → geocode status → maxWalkM ile durak üret (REPLACE) → map preview

Room pending list: “Haritada Önizle” modalı (aynı component)

Backend:

Personel cache: geoStatus (OK/NEEDS_REVIEW/FAILED), geoManualOverride

Import izleri: ShiftImport, ShiftImportRow

Durak üretimi: clusterStops(maxWalkM) + StopAssignment

Gate/Test:

M16CHECK: shift oluştur → import (deterministik sample) → draft üret → stop sayısı + maxWalkM garantisi → UI preview endpointleri 200.

7) Devam için benden istediğin tek şey

ROOM tarafında “bekleyen talepler” tablosu hangi dosyada ise onu da at (full file).
Ben de:

COMPANY: yeni tab + personel akışı

ROOM: “Haritada Önizle” butonu + modal

Ortak RoutePreviewModal component
şeklinde tek commitlik net patch planı çıkarayım (istersen yine full-replace veririm).

İstersen şimdi web/src/panels/room/... içinde bekleyen shift listesinin olduğu dosyayı yapıştır; bir sonraki adımda direkt kod patch’e girelim.
Backend’te artık M16’nin “personel + import + durak üret + harita önizleme” akışını ayağa kaldıracağız. UI tarafını sen zaten bağlamışsın; şimdi UI’nın çağıracağı minimal ama “ileri genişletilebilir” backend parçalarını ekleyelim.

Aşağıdaki plan “tek commitlik net patch” olarak ilerler (istersen iki commit de olabilir: backend + docs).

1) M16 için backend’te hedeflediğimiz en küçük API seti

UI’daki Personel & Rota tabı + ROOM “Haritada Önizle” modalı için 5 şey yeterli:

Shift personel listesi

GET /api/shifts/:id/people

Shift’e personel ekle / replace

POST /api/shifts/:id/people (tek ekleme)

PUT /api/shifts/:id/people (REPLACE toplu)

Import izleri (opsiyonel ama planın parçası)

POST /api/shifts/:id/people/import (rows + meta)

GET /api/shifts/:id/imports (son importları göster)

Durak üret (REPLACE)

POST /api/shifts/:id/stops/generate body: { maxWalkM: 200, mode:"REPLACE" }

Harita önizleme payload

GET /api/shifts/:id/route-preview

hem COMPANY hem ROOM bu endpoint’ten modalı besler

Not: Eğer hâlihazırda GET /api/shifts/:id ve GET /api/shifts/:id/stops gibi endpoint’lerin varsa, route-preview sadece “people + assignments + stops” tek response olarak birleştiren ince bir wrapper da olabilir.

2) Prisma / DB: eklenecek modeller (M16)
2.1 Geo cache & shift personeli

GeoStatus enum: OK | NEEDS_REVIEW | FAILED

ShiftPersonel (shift bazlı import satırları burada yaşasın)

shiftId, fullName, phone, addressText

lat, lng

geoStatus, geoManualOverride

source (MANUAL / IMPORT)

createdAt, updatedAt

2.2 Import izleri (audit)

ShiftImport (bir import işlemi)

shiftId, createdByUserId, kind, metaJson

ShiftImportRow (import satırları)

importId, fullName, addressText, lat, lng, geoStatus, rawJson

2.3 Stop assignment

StopAssignment

shiftId

stopId (sizde stop tablosu neyse ona FK)

shiftPersonelId

Burada önemli nokta: “plan” uzun vadede company personel havuzu istiyor olabilir; ama M16 için shift-scoped tutmak hem hızlı hem UI’yi hemen çalıştırır. Sonra isterseniz CompanyPersonel’e evrilir.

3) Durak üret algoritması (garanti: maxWalkM)

M16CHECK’in “maxWalkM garantisi” için en güvenlisi:

Her durak için pivot bir personel seç (stop koordinatı = pivot koordinatı)

Pivot’a maxWalkM içinde kalanları bu durağa ata

Kalanlardan devam et

Bu yöntem “stop koordinatı pivot olduğu için” atanan herkesin mesafesi ≤ maxWalkM garantisini bozmuyor.

Basit ama iyi sonuç için pivot seçimini şöyle yap:

Kalanlar içinde, çevresinde en çok kişi olanı pivot seç (O(n²), n küçükken ok)

Deterministik olsun diye tie-break: id küçük olan

4) RBAC kuralları (kritik)

COMPANY

kendi companyId’sine ait shift’lerde people/import/generate yapabilir

ROOM

kendi roomId’sine ait shift’lerde route-preview görebilir

(people listesi istersen sadece preview içinde özet dönsün)

DRIVER/PERSONEL

M16 kapsamında gerek yok; şimdilik kapalı kalsın

5) WS / invalidate (UI autoReload bozulmasın)

Sende useAutoReload("shifts", ...) var. O yüzden backend’te:

import / people replace / generate stops sonrası tek bir publish yeter:

event adı mutlaka shift içersin (senin invalidate/guessTopics kuralın)

örn: shift:route:update veya shift:people:update

En basit:

import/people/generate sonrası ws.publish("shift:update", { shiftId, roomId, companyId })

6) M16CHECK (pack’e eklenecek)

Yeni script: backend/scripts/m16check.js

Akış:

company login

shift create

POST /api/shifts/:id/people/import (deterministik sample rows: lat/lng hazır)

POST /api/shifts/:id/stops/generate maxWalkM=200

DB’den/endpoint’ten assignments çek → haversine ile her personel-stop mesafesi ≤ 200m doğrula

GET /api/shifts/:id/route-preview (COMPANY 200)

aynı shift için ROOM token ile route-preview (200)

Sonra tools/pack.ps1 içine M16 stage eklenir:

M16CHECK çalışır

FULLCHECK içine dahil etmek şart değil ama güzel olur

7) Repo temizliği (şu an sende görünenler)

docs/_archive/plans.zip gibi zip’leri commit’lemeyelim (repo şişmesin).

İstersen docs/_archive/*.zip’i .gitignore’a al.

docs/PRIMER_SSOT.md değişikliği ise commit’e girebilir (SSOT güncellensin).

Şimdi sıradaki net adım

Prisma modellerini ekle + migrate

shifts route’una people/import/generate/preview endpointlerini ekle

backend/scripts/m16check.js + tools/pack.ps1’e M16 stage

tek commit + pack

PowerShell (en fazla 3 komut):

Repo’yu açtım ve hızlıca “M16 backend” açısından nerede olduğumuzu netleştirdim:

Şu an repoda zaten olanlar (önemli tespitler)

Shift + Stop altyapısı var (Stop modeli shiftId/order/lat/lng/type/state ile hazır).

Template tarafı backend’de var: RouteTemplate + RouteTemplateStop ve apply/reorder akışları mevcut.

Personel tablosu var: Personel(companyId, fullName, phone, homeLat/homeLng) ama adres / geocode durum alanları yok.

PickupRequest var ve M7’de “stop-suggestions” bunun üzerinden çalışıyor; fakat PickupRequest oluşturma şu an personel tarafına bağlı ve “shift planlama/import” ihtiyacını tam karşılamıyor.

UI tarafında senin commit’lediğin M16 ekranları şimdilik localStorage + /api/shifts/:id (stops) ile idare ediyor; backend’e bağlanacak yerler için net endpoint seti gerekiyor.

M16 Backend’i “sade ve tek hat” yapmak için önerdiğim sıra

Aşağıdaki sıra, UI’yi bozmadan backend’i adım adım ekleyecek şekilde:

1) Prisma şema (DB) – M16’nın omurgası

Hedef: “Shift’e bağlı planlanan personel listesi + import izleri + assignment” data modelini kurmak.

Önerilen eklemeler:

Personel’e geocode cache alanları

homeAddress (string, nullable)

geoStatus enum: OK | NEEDS_REVIEW | FAILED

geoManualOverride (bool default false)

opsiyonel: geoUpdatedAt, geoNote (neden review/failed)

ShiftPersonel (shift ↔ personel join)

shiftId, personelId

opsiyonel: pickupLat/pickupLng (snapshot istersen), note, createdAt

unique: (shiftId, personelId)

ShiftImport + ShiftImportRow (import izi)

ShiftImport: shiftId, createdByUserId, fileName, createdAt

ShiftImportRow: importId, rowNo, rawJson, fullName, phone, address, lat/lng, geoStatus, personelId?

StopAssignment (durak ↔ shift personel eşlemesi)

shiftId, stopId, personelId, walkM

unique: (shiftId, personelId) (her personel tek durağa)

Not: Stop modelini değiştirmeye gerek yok; “durak üretimi” Stop’ları REPLACE ederek yazacak.

2) Backend endpoint seti (UI + test için minimum)

Amaç: UI’de “Personel & Rota” tabının backend’e bağlanacağı net API’yi vermek; ROOM tarafı da aynı preview’u kullanacak.

Company (COMPANY role)

GET /api/shifts/:id/people

shift’e bağlı personel listesi + geoStatus özetleri

PUT /api/shifts/:id/people (REPLACE)

body: { items:[{fullName, phone, address?, lat?, lng?, geoManualOverride?}] }

içeride: Personel upsert (companyId + phone gibi bir anahtar) + ShiftPersonel replace

POST /api/shifts/:id/people/import

ilk etapta “file upload” yerine JSON rows kabul etsin (M16CHECK deterministik olur)

import izlerini ShiftImport/ShiftImportRow’a yaz

POST /api/shifts/:id/stops/generate?maxWalkM=250&mode=REPLACE

ShiftPersonel noktalarından durak üret

Stop’ları (type=PICKUP) REPLACE yaz

StopAssignment oluştur (walk mesafeleriyle)

GET /api/shifts/:id/route-preview

shift + stops + assignment + people özetini tek payload’da döndür (Room modal da bunu kullanır)

Room (ROOM role)

GET /api/shifts/:id/route-preview endpointi aynı kalır, sadece scope check (roomId) ile.

3) Durak üretim algoritması (maxWalkM garantili)

Plan dosyalarında da hedef bu: “maxWalkM içinde kalacak şekilde cluster”.

Basit ve güvenli yaklaşım (garanti verir):

Unassigned personellerden birini “seed” al.

Seed noktasına maxWalkM içindeki tüm personelleri aday cluster yap.

Cluster merkezini “centroid” değil medoid seç (cluster içindeki bir personel noktasını merkez yap):

Böylece “merkez → her kişi mesafesi” kontrol edilebilir, garanti sağlanır.

Cluster finalize → Stop oluştur.

Atamaları yaz (StopAssignment.walkM).

Tüm personeller bitene kadar devam.

Bu yöntem, mevcut M7 clusterPoints’tan farklı: clusterPoints zincirleme bağ yüzünden “uçtan uca > maxWalkM” üretebilir; burada her kişi → durak limiti garanti.

4) M16CHECK (pack’e entegre)

Şu an tools/pack.ps1 ve tools/gate.ps1 “M0..M15”e kadar gidiyor.

M16 için:

backend/scripts/m16check.js ekle (m15check patterninde)

tools/pack.ps1 + tools/gate.ps1 → -To 16 destekle

M16CHECK senaryosu:

shift oluştur (REQUESTED/DRAFT olabilir)

/people/import ile deterministik örnek satırlar bas

/stops/generate?maxWalkM=... çağır

stop sayısı > 0 ve her assignment için walkM <= maxWalkM

/route-preview 200 + payload doğrulama

5) UI entegrasyon (senin mevcut M16 UI’yi bozmadan)

Senin UI şu an localStorage ile çalışıyor; backend gelince iki aşama öneriyorum:

Soft switch (fallback’lı)

ShiftPeopleTab.jsx: önce /api/shifts/:id/people dene, 404/501 ise localStorage’a düş.

“Generate stops” butonu /api/shifts/:id/stops/generate varsa onu kullan, yoksa local preview devam.

Hard switch

localStorage sadece “draft UI cache” olarak kalır ya da tamamen kaldırılır.

Git/commit tarafı (senin son status’la bağlantılı)

Senin yazdığın git status çıktısına göre:

Commit (8abbab8) içine girenler:
web/src/panels/company/ShiftsPanel.jsx + ShiftPeopleTab.jsx + RoutePreviewModal.jsx + ShiftPersonelTable.jsx + web/src/panels/room/ShiftsPanel.jsx ✅

Ama o anda commit’e girmemiş olanlar: docs/PRIMER_SSOT.md ve docs/_archive/... (plans.zip vs) — bunlar için ayrı “docs housekeeping” commit’i mantıklı.

Sıradaki net adım

Backend’de başlamamız gereken yer Prisma schema + db push uyumlu alanlar (1. adım).
İstersen bir sonraki mesajında “M16 backend’i tek commit mi, yoksa (schema+api+check) / (ui bind) / (docs) şeklinde 2-3 commit mi gidelim?” demene gerek yok—benim önerim:

Commit A: prisma + endpointler + m16check + pack/gate 16

Commit B: UI backend fallback bağlama (localStorage fallback kalsın)

Commit C: PRIMER_SSOT güncelle + docs/_archive gitignore/temizlik

Hazırsan, bir sonraki adım olarak ben sana schema.prisma için M16 eklerini ve backend route dosyalarında hangi noktalara ne ekleneceğini “full-replace / patch” şeklinde çıkarayım.



Evet, bunu temiz ve doğru şekilde yapabiliriz — şu anki “tek seferlik Shift” akışını bozmadan, araya “Anlaşma / Periyodik Rezervasyon” diye ayrı bir katman ekleyerek.

Aşağıdaki model tam senin dediğini karşılıyor:

Company bir tarih aralığı seçer (örn. 2026-02-02 → 2026-05-02)

Bu aralıkta hafta deseni seçer (5/6/7 gün veya custom)

Her gün için saat aralığı seçer (örn. 07:30–09:30; gece vardiyası gibi “ertesi güne taşan” da destek)

Room onaylayıp aracı/driver’ı atayınca:

Araç sadece o saat pencerelerinde o company için “rezerve” olur

Diğer saatlerde başka işe gidebilir

Süre bitince sistem otomatik DONE yapar

Süre uzat ve iptal endpoint/UI ile yönetilir

En doğru yaklaşım: Shift’i şişirmek yerine “Agreement / Contract” eklemek
Neden?

Şu an Shift zaten canlı operasyon (approve/start/reached/eta vs.) için kullanılıyor. “1 ay/1 yıl, haftada 5 gün, her gün 2 saat” gibi şeyler Shift tablosunu ya patlatır (günlük shift üretmek) ya da karmaşıklaştırır.

Bu yüzden yeni bir entity:

DB (Prisma) – yeni model (öneri)

Agreement (veya Contract):

companyId, roomId

vehicleId, driverId (approve sonrası dolu)

startDate (DATE), endDate (DATE)

weekMask (bitmask: Pzt..Paz)

startMin, endMin (dakika: 0..1439)

endMin < startMin ise midnight aşımı var demektir

status: REQUESTED | APPROVED | ACTIVE | DONE | CANCELLED | REJECTED

Opsiyonel: seatDemand, companyOfferAmount/note, roomOfferAmount/note (pazarlık istersen)

Kritik: Araç “company’ye bağlandı” bilgisini Vehicle üzerinde tutmuyoruz (çünkü saat bazlı bağ). Bağı Agreement schedule belirliyor.

Çakışma kuralı (senin istediğin gibi)

Araç farklı saatlerde başka yerde çalışabilir, ama aynı saat penceresinde başka company’ye gidemez.

Bunu şu 2 yere ekliyoruz:

Agreement onayı sırasında: aynı araçta aynı zaman penceresine denk gelen başka ACTIVE/APPROVED Agreement var mı? → varsa 409

Mevcut /api/availability içine:
Availability hesaplanırken sadece Shift overlap değil, Agreement overlap da kontrol edilecek.

companyId parametresi gönderirsek: aynı company’nin agreement’ı “conflict” sayılmaz

farklı company → conflict

Bu sayede ROOM panelde “Approve” yaparken zaten doğru bloke olur.

Otomatik kapanma (DONE)

Backend’de zaten monitor mantıkları var (GPS stale vs). Aynı şekilde:

agreementMonitor periyodik çalışır

now > agreementEffectiveEndUtc ise status → DONE

UI listelerde otomatik “kapandı” görünür

(istersen) WS event: agreement:update ile canlı güncellenir

UI şablonlar (senin istediğin hazır seçimler)
1) Haftalık desen preset’leri

Haftada 5 gün (Pzt–Cum)

Haftada 6 gün (Pzt–Cmt)

Haftada 7 gün (Her gün)

Custom checkbox (Pzt..Paz)

2) Tarih aralığı preset’leri

1 hafta, 1 ay, 3 ay, 6 ay, 1 sene
Seçince endDate otomatik hesaplanır (startDate baz alınır)

3) Saat preset’leri

Sabah / Akşam / Gece (senin preset saatlerin)

Custom start/end

end < start ise UI “ertesi gün” diye badge gösterir

Bu işi repo üzerinde sırayla nasıl yapalım? (net milestone plan)
M17 (Backend) — Agreement altyapısı

Prisma: Agreement modeli + enum + index’ler

Routes:

POST /api/agreements (COMPANY request)

GET /api/agreements?take=200

PUT /api/agreements/:id/approve (ROOM assign vehicle+driver)

PUT /api/agreements/:id/cancel (COMPANY)

PUT /api/agreements/:id/extend (COMPANY veya ROOM, politika neyse)

Conflict engine:

agreement overlap fonksiyonu

/api/availability içine agreement kontrolü

Monitor:

auto DONE

M18 (UI) — Company/Room ekranlarına bağlama

Company ShiftsPanel: “Anlaşma” modunu aç (tarih aralığı + hafta deseni + saat)

Room ShiftsPanel: pending anlaşmaları approve/reject

Süre uzat / iptal butonları

Sonraki adımda (M16 import/rota) ile birleşir: Agreement → personel listesi → durak üret → map preview. (Zaten UI modallarını yaptın.)

Şu an senin repoda “backend tarafına geçmeden önce” yapılacak en kritik karar

Periyodik bağlama işini “Shift”in içine mi gömeceğiz, yoksa ayrı Agreement mı yapacağız?

Benim önerim %100 Agreement: mevcut M0..M15 pack akışını kırmadan ilerlersin ve “araç sadece belirli saatlerde bağlı” gereksinimini en doğru karşılayan yapı bu.

Küçük not: “Shift listesinde otomatik kapanacak” beklentisi

Agreement’ı UI’da Shift listesi içinde de gösterebiliriz (tek satır: “Anlaşma”).
Operasyonel günlük sürüş takibi için istersen ileride:

Agreement’tan “bugünün gerçek Shift’i”ni otomatik üretme (rolling) yaparız (isteğe bağlı, M19 gibi)

Senin “git status” tarafındaki kalanları da kapatalım (istersen ayrı doküman commit)

Şu an UI commit’i tamam. Kalanlar (docs + plans archive) ayrı commit olsun ki temiz dursun:

git add docs/PRIMER_SSOT.md docs/_archive/plans.zip "docs/_archive/plans/plan son.md"
git commit -m "docs: archive plans + update primer"
tools/pack.ps1 -To 15


İstersen bir sonraki adımda ben doğrudan backend M17 için (Prisma + routes + availability + monitor) “FULL REPLACE” dosyaları tek tek çıkarayım:

backend/prisma/schema.prisma

backend/src/routes/agreements.js (veya /routes/agreements/index.js yapına göre)

backend/src/services/agreementConflict.js

backend/src/routes/availability.js (agreement check ekli)

backend/src/server.js (monitor hook)

Sen “Agreement adı” için Agreement mi Contract mı olsun söylemene bile gerek yok; ben Agreement ile giderim (net).

Aynen bu şekilde milestone’lara bölelim; hem temiz ilerleriz hem de M0..M15 pack’i kırmadan yeni işleri ekleriz. Aşağıdaki roadmap’i “M16’dan sonra” numaralayarak yazdım (senin mevcut düzenine uyumlu).

M16.0 — Repo Temizliği + Doküman Arşivi

Amaç: UI commit’lerin tamam; repoda kalan doküman/plan parçalarını “tek, temiz docs commit” ile kapatmak.

Kapsam

docs/PRIMER_SSOT.md güncellemesini commit’e almak

docs/_archive/plans.zip ve plan dosyalarını (istersen) arşiv olarak repoya almak

(Opsiyonel) ileride büyürse docs/_archive/ için gitignore/kurallar

DoD

git status temiz (docs tarafı da commitlenmiş)

tools/pack.ps1 -To 15 PASS (mevcut gate bozulmadı)

M16.1 — People & Route Backend MVP (Import + Cache + Durak Üret + Preview)

Amaç: Company’nin “Personel & Rota” tabını gerçek backend data ile beslemek; ROOM tarafı aynı preview payload’u görsün.

DB (Prisma)

Personel alanlarını genişlet:

homeAddress?, geoStatus (OK/NEEDS_REVIEW/FAILED), geoManualOverride (bool)

opsiyonel: geoUpdatedAt?, geoNote?

Yeni tablolar:

ShiftPersonel (shift ↔ personel join, unique (shiftId, personelId))

ShiftImport, ShiftImportRow (import izi + satır ham verisi)

StopAssignment (shiftStop ↔ personel eşlemesi + walkM)

API (minimum set)

GET /api/shifts/:id/people

PUT /api/shifts/:id/people (REPLACE)

POST /api/shifts/:id/people/import (ilk etap JSON rows)

POST /api/shifts/:id/stops/generate?maxWalkM=...&mode=REPLACE

GET /api/shifts/:id/route-preview (shift + stops + assignment + people özet)

Algoritma (maxWalkM garantili)

“seed + maxWalkM içinde cluster” + medoid merkez

Her personel için walkM <= maxWalkM garanti (DoD’de test)

Test/Gate

backend/scripts/m16check.js

tools/pack.ps1 / gate → -To 16 desteği

M16CHECK: import → generate → assignment doğrula → preview 200

DoD

M16CHECK PASS

M0..M15 + FULLCHECK + SMOKE PASS kalır

M16.2 — UI’yi Backend’e Bağlama (Fallback’lı)

Amaç: Senin yaptığın M16 UI bozulmadan backend’e “soft switch”.

Kapsam

ShiftPeopleTab.jsx:

önce backend’den oku/yaz; endpoint yoksa 404’te localStorage fallback

RoutePreviewModal.jsx:

preview’yu /api/shifts/:id/route-preview ile doldur

RoomShiftsPanel.jsx:

“Haritada Önizle” butonu aynı modal ile /route-preview gösterir

DoD

UI’da personel ekle/import → preview gerçek payload ile çalışır

endpoint yoksa (dev ortam) localStorage ile yine çalışır

M16.3 — Geocode Review UI + Manual Override

Amaç: NEEDS_REVIEW/FAILED personeller operasyonel düzeltilebilsin.

Backend

GET /api/company/personels?geoStatus=NEEDS_REVIEW

PUT /api/company/personels/:id/location (lat/lng + geoManualOverride=true + geoStatus=OK)

UI

Company’de “NEEDS_REVIEW listesi” + düzeltme ekranı

DoD

Manual fix sonrası preview/generate akışı OK

M17.0 — Periyodik Anlaşma (Agreement) Backend

Amaç: “Tarih aralığı + haftanın günleri + saat penceresi” ile aracı sadece o zamanlarda company’ye rezerve etmek; bitince otomatik kapanmak; süre uzat/iptal.

DB

Agreement (veya Contract) modeli:

companyId, roomId, vehicleId?, driverId?

startDate, endDate (DATE)

weekMask (Pzt..Paz bitmask)

startMin, endMin (dakika)

midnight aşımı: endMin < startMin

status: REQUESTED/APPROVED/ACTIVE/DONE/CANCELLED/REJECTED

ops: offer alanları (company/room amount/note)

API

POST /api/agreements (COMPANY request)

GET /api/agreements?take=...

PUT /api/agreements/:id/approve (ROOM assign vehicle+driver)

PUT /api/agreements/:id/cancel (COMPANY)

PUT /api/agreements/:id/extend (policy’ye göre)

Conflict/Availability entegrasyonu

/api/availability içine agreement overlap kontrolü

Onay sırasında 409 conflict code ile dön (shiftConflict mantığına benzer)

Monitor

agreementMonitor: endDate + endMin geçince DONE

Test

m17check.js + pack -To 17

DoD

Aynı saat penceresinde farklı company’ye aynı araç verilemez

Farklı saatlerde aynı araç kullanılabilir

Süre bitince otomatik DONE

Extend/cancel çalışır

M17.1 — Agreement UI (Company + Room)

Company

Preset’ler:

Haftada 5/6/7 gün + custom checkbox

Süre preset: 1 hafta / 1 ay / 3 ay / 6 ay / 1 sene

Saat preset: Sabah/Akşam/Gece + custom (midnight aşımı badge)

“Süre uzat” ve “İptal” aksiyonları

Room

Pending anlaşma listesi + approve(assign vehicle/driver)

İstersek burada da “harita önizle” (M16 route-preview ile birleşir)

DoD

Agreement lifecycle UI’dan uçtan uca yönetilir

M18 — (Opsiyonel) Agreement → Günlük Shift Otomatik Üretimi

Amaç: “Anlaşma var, bugün için operasyonel shift otomatik oluşsun” (ileride istersen).

Cron: bugün için schedule pencereleri → shift create (duplicate guard)

Driver operasyonu aynen Shift akışından yürür

Şu an hemen yapılacak ilk milestone

Bence sırayla M16.0 → M16.1 (repo temiz + backend MVP) en doğru; çünkü senin UI hazır, backend gelince modal/preview gerçek çalışmaya başlayacak.
Personel upsert (companyId + phone/email gibi anahtarlarla; phone yoksa “fullName+address” ile best-effort)

ShiftPersonel replace

POST /api/shifts/:id/people/import

İlk etap: file upload yok; JSON rows kabul.

ShiftImport + ShiftImportRow yaz.

Upsert + ShiftPersonel replace ile bağla.

POST /api/shifts/:id/stops/generate?maxWalkM=250&mode=REPLACE

ShiftPersonel noktalarından “clusterStops(maxWalkM)” üret

Stop’ları REPLACE yaz (type = COMMON; name = “Durak 1..n”)

StopAssignment yaz (walkM ile)

GET /api/shifts/:id/route-preview

return: { shift, stops, assignments, people }

UI modal hem COMPANY hem ROOM tarafında bunu kullanır.

3.3 Room (ROOM)

GET /api/shifts/:id/route-preview (aynı endpoint; sadece scope check)

4) Durak üretim algoritması (maxWalkM garantili)

Hedef: “Her personel atandığı durağa maxWalkM içinde yürüsün.”

Güvenli yaklaşım:

Unassigned listeden bir “seed personel” seç.

Seed noktasına maxWalkM içinde olan tüm personelleri “candidate cluster” yap.

Cluster merkezi olarak medoid seç:

Cluster içindeki noktalardan birini “stop center” yap.

Bu center seçimiyle tüm personellerin mesafesi <= maxWalkM olacak şekilde doğrula.

Cluster finalize:

Stop oluştur (lat/lng = medoid)

O cluster’daki personelleri bu stop’a ata (StopAssignment.walkM yaz)

Bitene kadar devam.

Bu yöntem “uçtan uca büyüyen cluster” riskini engeller; garanti verir.

5) Gate/Test: M16CHECK

backend/scripts/m16check.js senaryosu:

shift oluştur (company)

import rows (deterministik sample)

generate stops (maxWalkM=250)

assert:

stopCount > 0

her assignment.walkM <= maxWalkM

route-preview 200 + payload shape doğrula

Araçlar:

tools/gate.ps1 ve tools/pack.ps1 -To 16 destekleyecek.

6) File-by-file patch listesi (tek milestone değişiklik seti)
Backend

backend/prisma/schema.prisma

backend/src/routes/shifts/company.js (people/import/generate/preview ekleri)

backend/src/routes/shifts/room.js (route-preview erişimi)

backend/src/routes/shifts/shared.js (route-preview helper veya scope helper)

backend/src/services/clusterStops.js (yeni: maxWalkM guaranteed)

backend/src/services/routePreview.js (yeni: tek payload builder)

backend/scripts/m16check.js (yeni)

tools/gate.ps1 (M16 stage ekle)

tools/pack.ps1 (TargetStage max 16)

Docs

docs/DB_SCHEMA_V1.md (yeni tabloları ekle)

docs/API_SPEC_V1.md (yeni endpointleri ekle)

docs/PRIMER_SSOT.md (NEXT’e M16.1 link)

7) Notlar / sınırlar

İlk sürümde gerçek geocoding entegrasyonu şart değil:

lat/lng yoksa geoStatus = NEEDS_REVIEW

lat/lng varsa geoStatus = OK

Import’ta “user yaratma” yok; sadece plan personeli olarak Personel kaydı tutulabilir.

Stop type eklemek istersen (PICKUP), UI mapping’e de dokunmak gerekir; ilk etap COMMON ile güvenli.


---

## Hangisini PRIMER içine alalım?
- **PRIMER_SSOT**: sadece “M16.1 var, hedefi bu, detay dosyada” şeklinde kalsın ✅  
- Tüm patch plan / endpoint listesi / acceptance kriterleri: **`docs/M16_1_BACKEND_PLAN.md`** ✅

---

## İstersen tek seferde docs commit (en fazla 3 PS komut)
(İstediğin gibi sade)

```powershell
git add docs/PRIMER_SSOT.md docs/M16_1_BACKEND_PLAN.md
git commit -m "docs: add M16.1 backend plan + refresh SSOT"
tools/pack.ps1 -To 15


İstersen bir sonraki adımda M16.1’i gerçekten implement edeceğimiz “tek milestone patch planını” yine aynı formatta (dosya dosya: schema + route + service + m16check + gate/pack) çıkarırım.


Durak Üretim Algoritması (maxWalkM garantili)

Hedef: Her personel → atandığı durak yürüme mesafesi walkM <= maxWalkM.

Önerilen “garantili” yaklaşım (medoid tabanlı):

Atanmamış personellerden birini seed seç

Seed’e maxWalkM içinde kalanları aday cluster yap

Cluster merkezi olarak medoid seç (cluster içindeki bir personel noktasını merkez al)

Merkez→her kişi mesafesini kontrol et; limit dışı varsa çıkar

Stop oluştur, cluster’daki personelleri o stop’a ata (StopAssignment.walkM)

Bitene kadar devam

Bu yöntem zincirleme cluster gibi “uçtan uca” taşma üretmez; garanti sağlar.

Doğrulama (Gate/Test)
M16CHECK senaryosu (deterministik)

Shift oluştur

/people/import ile deterministik sample rows bas

/stops/generate?maxWalkM=... çağır

Stop sayısı > 0

Her assignment için walkM <= maxWalkM

/route-preview 200 + temel alanlar var

Pack/Gate entegrasyonu

tools/pack.ps1 ve gate runner “-To 16” destekler

backend/scripts/m16check.js eklenir

M16.1 GREEN hedefi: PACK PASS (M0..M16 + FULLCHECK + SMOKE)

UI Bağlantı Notları (kısa)

Company “Personel & Rota” tabı:

önce /people dener; yoksa localStorage fallback (geçiş dönemi)

generate stops: /stops/generate

map preview: /route-preview

Room “Bekleyen Talepler” tablosu:

“Haritada Önizle” butonu → RoutePreviewModal → /route-preview

Kabul Kriterleri

REPLACE operasyonları idempotent çalışır (tekrar çağrılınca aynı sonuç)

maxWalkM garantisi test ile doğrulanır

Scope/RBAC: COMPANY sadece kendi shift’lerine, ROOM sadece kendi room shift’lerine erişir

route-preview tek payload ile hem Company hem Room modal ihtiyacını karşılar