# OVERLAY NOTES — BOOTSTRAP CHECK SYNC HARDENING (2026-03-28)

Amaç
- M104/M105/M106 ve ortak başlangıç doküman kontrollerini exact cümle bağımlılığından çıkarıp daha dayanıklı hale getirmek.

Yapılanlar
- `tools/check_tools_hygiene_m105.ps1` marker + legacy phrase fallback ile sertleştirildi.
- `tools/check_repo_hygiene_m106.ps1` marker + legacy phrase fallback ile sertleştirildi.
- `README.md`, `tools/README.md`, `docs/STARTPACK_V1.md`, `docs/PRIMER_SSOT.md`, `tools/PRIMER_SNAPSHOT.md`, checklist dosyalarına stabil marker yorumları eklendi.

Not
- Path/dosya/doğrudan davranış kontrolleri sert bırakıldı.
- Sadece ortak doküman metni kontrolleri daha esnek hale getirildi.
