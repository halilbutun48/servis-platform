# M90C.8 — CI / VERIFICATION VISIBILITY

Amaç: yerelde çalışan doğrulama zincirini repo-native görünür hale getirmek; push / pull_request / workflow_dispatch üzerinde aynı kanonik hattı görünür ve tekrar çalıştırılabilir kılmak.

## Kapsam
- kök doğrulama komutu: `npm run verify:ci`
- kök zincir backend + web lint çalıştırır; kanonik web lint kanıtı `artifacts/lint/web_lint_latest.txt` dosyasına yazılır
- closure zinciri: `M90B.1`, `M90C.6`, `M90C.7`, `M90C.8`
- GitHub Actions workflow: `.github/workflows/vardis_verification_visibility.yml`
- görünür artifact'lar: `artifacts/repo-audit/repo_audit_latest.json`, `artifacts/lint/web_lint_latest.txt` ve `artifacts/shareable-export/servis-platform_shareable_*.zip`

## Kurallar
- yeni ürün özelliği açılmaz
- satır azaltma en sona bırakılır
- workflow mevcut green hattı yeniden görünür kılar; yeni acceptance alanı icat etmez
- export hygiene yolu `tools/pack_m90_c7_export_package_hygiene.ps1` üzerinden korunur

## Exit criteria
- `npm run verify:ci` canonical chain'i tek komutta çalıştırır
- root verify zinciri backend + web lint çalıştırır ve web lint sonucunu `artifacts/lint/web_lint_latest.txt` dosyasına yazar
- workflow `push`, `pull_request`, `workflow_dispatch` tetiklerinde görünür
- `repo-verification` işi `npm run verify:ci` çalıştırır
- `shareable-export` işi export hygiene pack çalıştırır
- repo audit, web lint ve sanitized shareable zip artifact olarak yüklenir
- docs / primer / backlog / script guide M90C.8 kapanışını ve kanonik verify artifact yolunu taşır
