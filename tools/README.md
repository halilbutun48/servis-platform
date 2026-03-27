# TOOLS README

## Kanonik komutlar
- Yaşayan master hat: `tools\pack.ps1 -To 75 -RepoDir D:\servis-platform -NoBuild`
- Yaşayan tek giriş: `tools\pack_living.ps1 -To 75 -RepoRoot D:\servis-platform -NoBuild`
- Yaşayan static doğrulama: `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- Yaşayan runtime doğrulama: `tools\verify_living_runtime.ps1 -To 75 -RepoRoot D:\servis-platform -NoBuild`
- Repo audit: `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- M76A-1 pack: `tools\pack_m76a_1_minimum_normalization.ps1 -RepoRoot D:\servis-platform`
- M76B pack: `tools\pack_m76b_living_matrix_tools_consolidation.ps1 -RepoRoot D:\servis-platform`

## Güncel çalışma notu
- Repo şu an **M75 living baseline** üstünde durur.
- M76A-1 minimum normalizasyon ve M76B living matrix/tools consolidation adımları açıktır.
- Tüm root pack/check dosyalarını tek seferde taşımak yerine, yeni living girişler klasör altında toplanır ve uyumluluk korunur.
- Geçici `_m*` overlay klasörleri repo içine commitlenmez.

## Master pack
`tools\pack.ps1 -To 75` yaşayan ana çatıdır.

Akış:
1. `M104 / M105 / M106` statik repo check'leri
2. `M0 -> M41` gate
3. `M42 -> M58` phase pack
4. `M59 -> M66` phase pack
5. `M67 -> M75` phase pack
6. repo audit

## Living giriş düzeni
- Faz wrapper'ları: `tools\packs\living\`
- Living check girişleri: `tools\checks\living\`
- Dışarıdaki kanonik girişler: `pack.ps1`, `pack_living.ps1`, `verify_living_static.ps1`, `verify_living_runtime.ps1`, `gate.ps1`
- Legacy root pack/check dosyaları uyumluluk için korunur.

## Repo audit
- wrapper: `tools\check_repo_audit_master.ps1`
- script: `backend\scripts\repo_audit.js`
- rapor: `artifacts/repo-audit/repo_audit_latest.json`

## Tools hijyen check
- script: `check_tools_hygiene_m105.ps1`
- calistirma: `.\tools\check_tools_hygiene_m105.ps1 -RepoRoot D:\servis-platform`

## Tarihsel uyumluluk notu
- Eski ana girişlerden `tools\pack.ps1 -To 66`, `tools\pack.ps1 -To 76` ve `tools\pack_docs_ssot.ps1` referansları statik check uyumluluğu için metinlerde korunabilir.
