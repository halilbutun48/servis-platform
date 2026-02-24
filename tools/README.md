# Tools (Windows friendly)

Bu klasörde sadece çalıştırma/doğrulama script’leri tutulur.

## Canonical doğrulama (M0→M32)
- `tools\gate.ps1 -To 32` → compose up + milestone check’ler
- `tools\pack.ps1 -To 32` → gate + smoke + fullcheck + milestone check’ler (**GREEN kanıtı**)

> “Green” = `tools/pack.ps1 -To <hedef>` **PACK PASS**

## ExecutionPolicy / imza engeli (Windows)
PowerShell `.ps1` dosyaları imza/ExecutionPolicy nedeniyle çalışmıyorsa:
- `tools\gate.cmd` → `gate.ps1` için wrapper (Bypass)
- `tools\pack.cmd` → `pack.ps1` için wrapper (Bypass)

CMD wrapper’lar `-NoProfile` ve `-ExecutionPolicy Bypass` ile çalışır.

Canonical doküman: `docs/PRIMER_SSOT.md`  
Yeni sohbet yapıştırmalık: `tools/PRIMER_SNAPSHOT.md`
