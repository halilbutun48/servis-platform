# M34 — Company Guided Flow Runbook (Step 0→6)

Bu runbook, Company tarafında **“az tık”** hedefiyle Plan Builder (M33) üzerinden Guided Flow’u **operasyonel** şekilde yürütmek için.

> Not: Bu akış “yeni bir wizard” değil; mevcut Plan Builder / Shifts ekranının **Guided Mode / stepper** mantığıyla düzenlenmiş halidir.

---

## Step 0 — Ön Kontrol (bloklayıcı / uyarı)

UI: **Company → Shifts → Plan Builder** üst kısmı.

Bloklayıcı (⛔) durumlar (devam etme):
- **Company Hub eksik** veya **0,0**
- Personelde **konum eksik** (lat/lng null)
- Personelde **0,0**

Uyarı (⚠️) durumlar (devam edebilirsin ama kalite düşer):
- `geoStatus=NEEDS_REVIEW` / `FAILED`
- OSRM kapalı
- Solver kapalı (heuristic fallback)

Kısayollar:
- **Hub** → `/company/hub`
- **Geo Review** → `/company/georeview`

Backend contract:
- `GET /api/plan-builder/precheck`

---

## Step 1 — Şablon + Tarih

Plan Builder içindeki:
- **Tarih** (`baseDate`)
- **Şablon item** (`tplKey`)

Bu seçimler “Uygula” sırasında oluşturulacak shift’lerin:
- `startAt` / `endAt` zaman aralığını belirler.

İpucu:
- Gece vardiyası gibi “end <= start” ise sistem otomatik olarak **end’i +1 güne** taşır.

---

## Step 2 — Personel dahil et (eligible)

Plan Builder varsayılanı:
- **Sadece geoStatus=OK**
- **lat/lng dolu**

Eğer eligible 0 ise:
- Geo Review ile düzelt
- veya “Shift Tools → Adresten Bul” ile bulk geocode çalıştır

---

## Step 3 — Durak üret + Önizleme

Parametreler:
- **Araç kapasitesi** → önerilen araç sayısını etkiler
- **Geohash precision** → cluster dar/geniş davranışı
- **Stops maxWalkM** → stop üretiminde yürüme toleransı

Notlar:
- “Araç / Cluster Önizleme” tablosu: her taslak araç için kişi sayısı + grup/merkez bilgisi.

---

## Step 4 — Matris al + Çöz (opsiyonel ama önerilir)

Plan Builder iki şekilde çalışır:

1) **Auto** (önerilen):
- “Stops’u OSRM+Solver ile sırala” açıkken
- “Uygula” sırasında stop sırası optimize edilir.

2) **Manuel debug**:
- Tablo satırında **Matris al** (OSRM Table)
- Tablo satırında **Çöz** (Solver/heuristic)

### OSRM + Solver nasıl açılır?

Compose’da `profiles: ["osrm"]` altında.

Beklenen:
- OSRM: `http://osrm:5000`
- Solver: `http://solver:8000/health`

OSRM data:
- `infra/osrm-data/` repo’da tutulmaz (gitignore)
- Örn: `infra/osrm-data/turkey-latest.osrm` (+ ilişkili `.osrm.*`)

---

## Step 5 — Uygula (N market shift oluştur)

Buton: **“Uygula: N market shift oluştur”**

Yaptıkları:
- N adet market shift oluşturur (`roomId=null`, `status=REQUESTED`)
- Personelleri shift’e bağlar
- Stops generate yapar (`/stops/generate`)
- Opsiyonel: stop sırasını optimize eder

Başarılı olunca otomatik:
- **Toplu Teklif Gönder** modal’ı açılır

---

## Step 6 — Toplu teklif gönder + “Bekleyen Talepler’e Git (filtreli)”

Modal:
- Room seç
- (ops.) tutar/not gir
- **Toplu Teklifleri Gönder**

Gönderim sonrası:
- **“Bekleyen Talepler’e Git (filtreli)”** butonu ile aşağıdaki listeye otomatik odaklanır
- Market Shifts alanı, **shift ID listesine göre filtrelenmiş** halde görünür

Bu noktadan sonra süreç:
- Room’lar teklif/counter yapar
- Company “Teklifler” ekranından takip eder

---

## Sık görülen sorunlar

- **M18 generator shift üretmiyor gibi**: artık check polling yaptığı için flaky değil; gerçek problem varsa check çıktısı teşhis içerir.
- **OSRM kapalı**: Step-4’te matris/çözüm çalışmaz → compose profile ile aç.
- **Eligible düşük**: Geo Review / Shift Tools bulk geocode ile düzelt.

