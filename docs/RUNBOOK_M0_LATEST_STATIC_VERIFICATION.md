# RUNBOOK M0-LATEST STATIC VERIFICATION

Amaç: legacy milestone check hattini guncel repo kokunden, tek komutla ve en son milestone'a kadar calistirmak.

## Canonical komutlar

- Tek repo zinciri: `npm run verify:repo`
- Root: `npm run verify:milestones`
- Dogrudan runner: `node backend/scripts/run_m0_latest.js --static-only --to latest --continue`
- Backend alias: `npm --prefix backend run milestones:static`
- Sadece M91 bandi: `npm --prefix backend run m91check`
- Sadece M92 guard: `npm --prefix backend run m92check`

## Kapsam

- Runner `backend/scripts/m*.js`, `backend/scripts/m*.cjs` ve `backend/scripts/m*.mjs` dosyalarini milestone sirasiyla bulur.
- `m162check.js` ve `m163check.js` legacy adlari M16.2 / M16.3 olarak siralanir; M162 gibi yanlis latest algisi olusmaz.
- Child check'ler repo kokunden calisir ve repo root `argv[2]`, `REPO_ROOT`, `PROJECT_ROOT` olarak verilir.
- `--static-only` modunda API/DB isteyen integration check'ler skip edilir.

## Beklenen sonuc

Su anki kabul sonucu:

- `PASS: 88`
- `FAIL: 0`
- `SKIP: 74`

Skip edilenler integration/API/DB isteyen check'lerdir. Runtime acceptance icin backend + DB + seed ayaga kaldirilip runner `--integration-only` veya API URL ile tekrar calistirilir.

## CI baglantisi

`npm run verify:ci` artik su zinciri kosar:

1. Backend + web lint
2. Docs/SSOT kontrolleri
3. Hot acceptance kontrolleri
4. Web contract/cache kontrolleri
5. M90 closure kontrolleri ve repo audit
6. `verify:milestones` ile M0->latest static milestone zinciri

Guncel tek cati runner bu sirayi `npm run verify:repo` uzerinden calistirir.

## Bakim notu

Yeni milestone check'i eklendiginde dosya adi `m<no>..._check.js` seklinde kalmali. Check repo kokunden de, `backend` icinden de calisabilmelidir; bunun icin path cozumunde `__dirname` veya `process.argv[2]` tercih edilir.
