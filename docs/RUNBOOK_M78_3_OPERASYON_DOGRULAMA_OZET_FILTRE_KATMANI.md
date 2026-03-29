# RUNBOOK M78.3 OPERASYON DOGRULAMA OZET VE FILTRE KATMANI

Amaç: M78.2 ile açılan ilk kayıt katmanını daha okunur hale getirmek. Aynı ekranda filtre, son güncelleme ve export görünürlüğü açılır.

## Kapsam
- role göre aynı operasyon doğrulama ekranı
- filtre: durum / kanıt türü / sadece kayıtlılar
- kayıt özeti: son güncelleyen / son güncelleme / son referans
- export görünürlüğü: hazır satırların okunması
- `STABLE_TO = 78` korunur

## Endpointler
- `GET /api/operation-verification/summary?role=ROOM`
- `GET /api/operation-verification/export-preview?role=ROOM&limit=8`
- `POST /api/operation-verification/records/upsert`

## Beklenen sonuç
1. super admin > operasyon doğrulama ekranı açılır
2. rol seçilir
3. filtreler ile görünüm daraltılır
4. son güncelleyen / son güncelleme okunur
5. kayıt görünürlüğü tablosu son satırları gösterir

## Pack doğrulaması
- M78.3 repo-contract PASS
- M78.3 node check PASS
- `artifacts/operations/m78_3_operasyon_dogrulama_ozet_filtre_katmani_latest.json` raporu üretilir
