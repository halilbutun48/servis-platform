# RUNBOOK — MASTER PACK + REPO AUDIT

Tarih: 2026-03-20

## Amaç
Bu runbook, `M0 -> M66` hattını tek komutta koşturmak ve aynı akış içinde repo sağlığını raporlamak için kullanılır.

## Kanonik komutlar
- Tam master hat: `tools\\pack.ps1 -To 66 -RepoDir D:\\servis-platform -NoBuild`
- Reset + full hat: `tools\\reset-and-pack.ps1 -To 66 -NoBuild`
- Sadece repo audit: `tools\\check_repo_audit_master.ps1 -RepoRoot D:\\servis-platform`
- Strict audit: `tools\\check_repo_audit_master.ps1 -RepoRoot D:\\servis-platform -Strict`

## Master pack akışı
1. `M104 / M105 / M106` statik repo check'leri
2. `M0 -> M41` için `tools\\gate.ps1`
3. `M42 -> M66` milestone pack zinciri
4. `backend/scripts/repo_audit.js` ile repo audit raporu

## Audit raporu nereye yazılır?
- `artifacts/repo-audit/repo_audit_latest.json`

## Audit ne raporlar?
- exact duplicate text dosyaları
- pack script consolidation candidate grupları
- check script consolidation candidate grupları
- backend script consolidation candidate grupları
- orphan / legacy adayları
- tiny dosyalar
- archive/live shadow pair'ler
- temel performans kokuları:
  - `useEffect`
  - `setInterval`
  - `addEventListener`
  - backend `.on(`
  - backend `setInterval`

## Nasıl okunmalı?
- Audit otomatik cleanup yapmaz.
- Önce gerçek aday listesi üretir.
- Sonra cleanup dalgaları küçük ve doğrulanabilir paketler halinde uygulanır.
- Her dalga sonrası ilgili pack / check / audit yeniden çalıştırılır.

## Kural
- Master pack kanonik giriş noktasıdır.
- Repo audit, cleanup kararının kaynağıdır.
- Audit çıktısı tek başına silme kararı vermez; her aday ayrıca doğrulanır.
