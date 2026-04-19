# MILESTONE M92 REPO VERIFICATION SPINE

Status: canonical verification spine

## Amac

Repo dogrulamasini tek resmi giris kapisina toplamak. Eski milestone/check dosyalari kanit olarak kalir; gunluk kalite kapisi `npm run verify:repo` olur.

## Kapsam

- Root lint ve web lint evidence
- Docs / SSOT hizasi
- Hot acceptance kontrolleri
- Web contract / cache kontrolleri
- M90 closure ve repo audit kontrolleri
- M0 -> latest static milestone zinciri
- M91 route preview acceptance bandi

## Kanonik komutlar

- `npm run verify:repo`
- `npm run verify:ci`
- `npm run verify:final`
- `tools\check-repo.ps1 -Phase all`
- `npm --prefix backend run m92check`
- `tools\pack_m92_repo_verification_spine.ps1 -RepoRoot D:\servis-platform`

## Kabul kurali

Yeni check veya milestone eklendiginde once ilgili tekil check yazilir, sonra `run_repo_check_chain.js` veya `run_m0_latest.js` uzerinden tek catiya baglanir, en son bu M92 check'i yeni girisi dogrular.
