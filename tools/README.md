# Tools (Windows friendly)

Bu klasörde sadece çalıştırma/doğrulama script’leri tutulur.

## ExecutionPolicy / imza engeli (Windows)

PowerShell `.ps1` dosyaları imza/ExecutionPolicy nedeniyle çalışmıyorsa:

- `tools\gate.cmd` → Docker ile **M0–M12** gate çalıştırır (API/DB/Redis’i up eder, health + milestone check).
- `tools\pack.cmd` → `gate` + backend `smoke/fullcheck/m11/m12` çalıştırır.

CMD wrapper’lar `-NoProfile` ve `-ExecutionPolicy Bypass` ile çalışır.

Canonical doküman: `docs/PRIMER_SSOT.md`