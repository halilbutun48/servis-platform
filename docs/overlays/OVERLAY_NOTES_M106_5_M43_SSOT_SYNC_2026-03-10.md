# OVERLAY NOTES — M106.5 M43 SSOT SYNC (2026-03-10)

Amaç:
- M43 green sonrası doküman hattındaki SSOT senkron kaymasını kapatmak
- tools primer ile docs primer/startpack/checklist hattını aynı resmi duruma getirmek

Bu overlay ne yapar:
- `docs/PRIMER_SSOT.md` dosyasını M43-green içeriğiyle günceller
- `docs/PRIMER_SNAPSHOT_2026-03-10_FINAL.md` dosyasını güncel primer ile hizalar
- `tools/CHECKLIST_SSOT.md` ve `docs/CHECKLIST_SSOT.md` içinde M43’ü resmi green olarak işaretler
- `docs/STARTPACK_V1.md` içinde current green ve sonraki hedef bilgisini M43/M44 durumuna göre düzeltir
- `M106 REPO HYGIENE + LINK TTL CHECK PASS` adlandırmasını checklist/startpack hattında hizalar

Bu overlay ne yapmaz:
- çalışan backend/web koduna dokunmaz
- pack/gate script davranışını değiştirmez
- M41 ana regresyon veya M43 runtime hattını değiştirmez
