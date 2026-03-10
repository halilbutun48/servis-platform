# OVERLAY — M42 Optional Release

Bu overlay şunları yapar:
- M42’yi “opsiyonel hazırlık” yerine **hazır optional release** olarak sabitler
- check-in için eksik Prisma modellerini ekler
- M42 için ayrı optional check scripti ekler
- ana `pack.ps1` akışını bozmadan `tools/pack_m42_optional.ps1` oluşturur
- primer/checklist/startpack dokümanlarını yeni modele çeker

## Sonrası
1. overlay zip’i repo köküne çıkar
2. M41 ana çizgi için: `tools\pack.ps1 -To 41`
3. M42 optional için: `tools\pack_m42_optional.ps1`
