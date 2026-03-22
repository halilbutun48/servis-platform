# RUNBOOK — MASTER PACK + REPO AUDIT

Tarih: 2026-03-20

## Amaç
Bu runbook, `M0 -> M66` hattını tek komutta koşturmak ve aynı akış içinde:
- eski/legacy adaylarını görmek,
- duplicate pack/check iskeletlerini görmek,
- boş/tiny dosyaları görmek,
- archive/live gölge dosya çiftlerini görmek,
- temel performans kokularını raporlamak

için hazırlanmıştır.

## Kanonik komutlar
- Tam master hat:
  - `tools\\pack.ps1 -To 66 -RepoDir D:\\servis-platform -NoBuild`
- Reset + full hat:
  - `tools\\reset-and-pack.ps1 -To 66 -NoBuild`
- Sadece repo audit:
  - `tools\\check_repo_audit_master.ps1 -RepoRoot D:\\servis-platform`
- Strict audit:
  - `tools\\check_repo_audit_master.ps1 -RepoRoot D:\\servis-platform -Strict`

## Master pack ne yapar
1. Statik repo check'leri çalıştırır:
   - `M104 repo cleanup`
   - `M105 tools hygiene`
   - `M106 repo hygiene`
2. `M0 -> M41` için `tools\\gate.ps1` çalıştırır.
3. `M42 -> M66` için milestone pack'lerini sırayla çalıştırır.
4. Sonunda `backend/scripts/repo_audit.js` ile repo audit raporu üretir.

## Audit raporu nereye yazılır
- `artifacts/repo-audit/repo_audit_latest.json`

## Audit ne raporlar
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

## Önemli not
Bu audit otomatik cleanup yapmaz. Ama temizliğin ilk fazı için güvenli aday listesini üretir. Asıl cleanup fazında:
- gerçekten kullanılmayan dosyalar
- aynı işi yapan paralel pack/check iskeletleri
- gereksiz event / interval / listener yüzeyleri

tek tek doğrulanıp kaldırılmalıdır.
