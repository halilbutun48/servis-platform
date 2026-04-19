# RUNBOOK M92 REPO VERIFICATION SPINE

Amaç: repo kontrol sistemini tek cati altinda calistirmak ve eski script karmasini kanit zinciri olarak duzenli tutmak.

## Tek resmi giris

- Root: `npm run verify:repo`
- CI alias: `npm run verify:ci`
- Final alias: `npm run verify:final`
- PowerShell wrapper: `tools\check-repo.ps1 -Phase all`
- Sadece M92 guard: `npm --prefix backend run m92check`

## Faz sirasi

`backend/scripts/run_repo_check_chain.js` su sirayla calisir:

1. `lint`: backend syntax scan + web lint evidence
2. `docs`: docs/SSOT ve M61 milestone hizasi
3. `hot`: M58/M76/M77/M78/M79/M82 acceptance guardlari
4. `web-contract`: M82.2 web contract/cache guard
5. `closure`: M90B.1, repo audit, M90C.6, M90C.7, M90C.8, M90C.9
6. `milestones`: `run_m0_latest.js --static-only --to latest --continue`

## Parca parca calistirma

- `node backend/scripts/run_repo_check_chain.js --phase lint`
- `node backend/scripts/run_repo_check_chain.js --phase docs,closure`
- `node backend/scripts/run_repo_check_chain.js --phase milestones`
- `node backend/scripts/run_repo_check_chain.js --list`

## Bakim kurali

- Eski `mXcheck.js` dosyalari silinmez; davranis kaniti olarak kalir.
- Yeni milestone check dosyasi `backend/scripts/m<no>..._check.js` formatinda eklenir.
- Gunluk kapilar package scriptleri uzerinden `run_repo_check_chain.js`'e baglanir.
- M92 check'i, package aliaslari, tools wrapper, manifest, state ve docs baglantisini kontrol eder.

## Beklenen sonuc

`npm run verify:repo` yesil olmalidir. Static-only milestone kosusunda integration/API/DB isteyen scriptler skip edilebilir; bu normaldir.
