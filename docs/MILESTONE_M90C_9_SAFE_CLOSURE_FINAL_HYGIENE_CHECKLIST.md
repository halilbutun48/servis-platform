# M90C.9 — GUVENLI KAPANIS / FINAL HYGIENE CHECKLIST

Amac: release/shareable/export/verify siralamasini tek resmi checklist altinda kilitlemek.

## Kapsam
- root final verify girisi: `npm run verify:final`
- final verify zinciri backend + web lint calistirir; web lint kanonik kaniti `artifacts/lint/web_lint_latest.txt` dosyasina yazilir
- Windows tarafinda export/hijyen kapanisi icin `pwsh` tercihinin yazili hale gelmesi
- `tools/export_shareable_repo_bundle.ps1` icinde PowerShell 5.1 uyumlu fallback mantiginin korunmasi
- final closure sirasi: verify -> export hygiene pack -> shareable export -> git status
- satir azaltma politikasinin sona birakildiginin tekrar kilitlenmesi

## Cikis olcutleri
- `tools/repo_contract_state.json` icinde `safeClosureFinalHygiene` policy vardir
- root package `verify:final` komutunu sunar
- backend package `m90c9check` komutunu sunar
- docs/primer/backlog/tools/script guide M90C.9 satirini tasir
- export tool icinde `tar.exe` / `.NET ZipFile` fallback korunur; PS5 kirik API kullanimi geri gelmez
- pack komutu final closure sirasini tek yerde calistirir

## Kanonik komut
- `tools\pack_m90_c9_safe_closure_final_hygiene.ps1 -RepoRoot D:\servis-platform`
