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