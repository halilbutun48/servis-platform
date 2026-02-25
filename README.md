# SERVIS-PLATFORM — PERSONEL SERVİS V1

GPS tabanlı personel servis platformu (Company / Room / Driver / Personel).  
**Son GREEN:** ✅ GATE PASS (M0→M32) + ✅ PACK PASS (M0→M32)

## Doğrulama (canonical)
- `tools\pack.ps1 -To 32`  → GREEN kanıtı
- `tools\gate.ps1 -To 32`  → compose up + milestone check’ler

> Windows ExecutionPolicy engeli için: `tools\pack.cmd` / `tools\gate.cmd`

## Repo yapısı
- `backend/` Node.js (ESM) + Express + Prisma + jobs + ws
- `web/` Vite + React paneller
- `infra/` docker-compose (db + redis + api + web)
- `docs/` SSOT dokümanlar (PRIMER/API/DB/UI/STARTPACK)
- `tools/` gate/pack scriptleri + primer snapshot

## Opsiyonel servisler (V1.5 / Plan Builder hazırlığı)
- **OSRM**: `OSRM_URL` tanımlanırsa matriks/rota çağrıları çalışır.
- **Solver (OR-Tools)**: `PLAN_SOLVER_URL` tanımlanırsa solve hızlanır; yoksa heuristic fallback devrede.

## Notlar
- Overlay/patch notları: `OVERLAY_NOTES.md`
- Yeni sohbet “yapıştır & devam et”: `tools/PRIMER_SNAPSHOT.md`
