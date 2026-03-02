OVERLAY — M36.6 — Pack default auto + /api/live/vehicles KVKK gate

Tarih: 2026-03-02

1) tools/pack.ps1
- default `-To` artık **0 (auto)**
- `-To 0` → backend/scripts içindeki en yüksek `m{N}check.js` (contiguous) otomatik seçilir

2) tools/gate.ps1
- default `-To` artık **0 (auto)**
- `-To` max desteklenen değer `tools/gate.ps1` içindeki check list’ten gelir
- `-To` max’ı aşarsa: net hata (sessizce eksik check çalıştırma yok)

3) backend/src/routes/live.js
- `GET /api/live/vehicles` için COMPANY/PERSONEL branch’ine **time-window gate** eklendi:
  - sadece `startAt<=now<=endAt` olan APPROVED/ACTIVE shift’lerin araçları döner

DoD
- `tools/pack.ps1` parametresiz çağrıda M36 PACK PASS
- Company/Personel live map: vardiya aralığı dışında boş dönüyor (KVKK)
