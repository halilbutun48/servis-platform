# M34 Step-0 — Ön Kontrol Runbook (Company Guided Flow)

Bu runbook, **Guided Flow** başlamadan önce “sahada patlayan” klasik eksikleri yakalamak için.

## 0) Hızlı kontrol (UI’nin çağıracağı contract)

- Endpoint: `GET /api/plan-builder/precheck`
- Role: `COMPANY` (veya `SUPER_ADMIN`)
- Amaç: Hub, personel konum kalitesi, OSRM ve solver servis durumu.

Beklenen:
- `companyHub.ok = true` (hubLat/hubLng dolu ve 0,0 değil)
- `personels.missingLatLng = 0` ve `personels.zeroLatLng = 0`
- OSRM/solver opsiyonel:
  - Default PACK’te (profile kapalıyken) `osrm.ok=false` ve `solver.reachable=false` normaldir.
  - Guided çözüm adımında (Step-4) **OSRM + solver aktif olmalı**.

## 1) OSRM profile (docker compose)

Repo’da OSRM+solver servisleri compose’da `profiles: ["osrm"]` altında.

- Profil kapalıysa:
  - API yine ayağa kalkar.
  - `/api/plan-builder/osrm-table` → 200 + `{ ok:false, error:"osrm:fetchFailed" }`

- Profil açıkken (prod/dev plan-builder):
  - OSRM: `OSRM_URL=http://osrm:5000`
  - Solver: `PLAN_SOLVER_URL=http://solver:8000` (opsiyonel ama önerilir)

## 2) OSRM veri dosyası (repo’ya girmez)

`infra/osrm-data/` gitignore’dadır.

Beklenen örnek:
- `infra/osrm-data/turkey-latest.osrm` (ve ilişkili .osrm.* dosyaları)

## 3) Step-0 karar matrisi

| Bulgu | Etki | UI aksiyon |
|---|---|---|
| hub yok / 0,0 | durak/rota üretemez | Company → Hub ekranına yönlendir |
| personelde missing/0,0 | plan/solve yanlış | “Geocode / düzelt” ekranına yönlendir |
| OSRM kapalı | matris alınamaz | “OSRM profile aç” uyarısı |
| Solver kapalı | çözüm heuristic olur | “solver aç (opsiyonel)” uyarısı |

## 4) Guided Flow ile entegrasyon notu

- Step-0 sadece “bloklayıcı” hataları kırmızı yapmalı:
  - Hub eksik
  - Personel konum eksik/0,0
- OSRM/Solver: Step-4’te gerçek ihtiyaç.
  - Step-0’da “warning” olabilir.

