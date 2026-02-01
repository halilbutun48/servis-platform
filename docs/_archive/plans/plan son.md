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