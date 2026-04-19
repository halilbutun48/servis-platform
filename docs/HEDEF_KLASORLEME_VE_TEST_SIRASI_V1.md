# HEDEF KLASÃ–RLEME VE TEST SIRASI V1

Bu belge, repo iÃ§indeki script / check / tools / runbook / docs yapÄ±sÄ±nÄ± yeni canonical gerÃ§eÄŸe gÃ¶re yeniden hizalamak iÃ§in hazÄ±rlanmÄ±ÅŸtÄ±r.

AmaÃ§, tek seferde agresif taÅŸÄ±ma yapmak deÄŸil; kanonik Ã§alÄ±ÅŸma sÄ±rasÄ±nÄ± koruyarak, alias destekli ve kontrollÃ¼ bir yeniden dÃ¼zenleme yapmaktÄ±r.

---

## 1. Temel karar

Yeni resmi giriÅŸ artÄ±k ÅŸudur:

- `npm run verify:repo`

Yeni resmi kapanÄ±ÅŸ giriÅŸi ÅŸudur:

- `npm run verify:final`

`tools/pack_living.ps1` korunur; ancak birincil resmi giriÅŸ deÄŸil, compatibility / geniÅŸ master prova hattÄ± olarak konumlanÄ±r.

---

## 2. Kanonik doÄŸrulama sÄ±rasÄ±

Repoâ€™nun resmi doÄŸrulama sÄ±rasÄ± aÅŸaÄŸÄ±daki gibidir:

1. lint
2. docs / ssot
3. hot
4. web-contract
5. closure
6. milestones

Bu sÄ±ra repo check chain ile birebir uyumlu kalmalÄ±dÄ±r.

### GÃ¼nlÃ¼k geliÅŸtirme sÄ±rasÄ±

- `npm run verify:repo`

### Final kapanÄ±ÅŸ sÄ±rasÄ±

1. `npm run verify:final`
2. `pwsh -ExecutionPolicy Bypass -File .\tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`
3. `pwsh -ExecutionPolicy Bypass -File .\tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`
4. `git status --short`

### Compatibility / geniÅŸ master prova

- `tools/pack_living.ps1`

Not: `pack_living` artÄ±k resmi ilk giriÅŸ deÄŸildir; legacy/living geniÅŸ kapsama hattÄ±dÄ±r.

---

## 3. Hedef tools klasÃ¶r dÃ¼zeni

```text
tools/
  README.md
  PRIMER_SNAPSHOT.md
  CHECKLIST_SSOT.md

  wrappers/
    verify_repo.ps1
    verify_final.ps1
    verify_closure.ps1
    pack_living.ps1

  packs/
    canonical/
      pack_repo_closure.ps1
      pack_export_hygiene.ps1
      pack_ci_visibility.ps1
    living/
      pack_phase_m0_m41.ps1
      pack_phase_m42_m58.ps1
      pack_phase_m59_m66.ps1
      pack_phase_m67_m75.ps1
      pack_phase_m76_m81.ps1
    milestones/
      pack_m77_kvkk_uyum_katmani.ps1
      ...
      pack_m92_repo_verification_spine.ps1
    compat/
      pack_m71_room_title_hotfix.ps1
      pack_m72_georeview_token_hotfix.ps1
      ...

  checks/
    canonical/
      check_repo_contract.ps1
      check_export_hygiene.ps1
      check_ci_visibility.ps1
      check_safe_closure.ps1
    living/
      check_static_repo.ps1
      check_m67_m75_static.ps1
      check_m76_m81_static.ps1
    milestones/
      check_m77_kvkk_uyum_katmani_repo_contract.ps1
      ...
      check_m92_repo_verification_spine.ps1
    compat/
      check_m71_room_title_hotfix_repo_contract.ps1
      ...

  _archive/
  _backup/
```

### Bu dÃ¼zenin anlamÄ±

- `wrappers/`: kullanÄ±cÄ±ya gÃ¶rÃ¼nen kÄ±sa giriÅŸler
- `packs/canonical/`: bugÃ¼nÃ¼n resmi kapanÄ±ÅŸ ve repo hijyeni hattÄ±
- `packs/living/`: tarihsel / phase bazlÄ± living hat
- `packs/milestones/`: milestone bazlÄ± tekil packâ€™ler
- `packs/compat/`: eski alias / geÃ§iÅŸ paketleri
- `checks/*`: aynÄ± ayrÄ±mÄ±n repo contract ve doÄŸrulama karÅŸÄ±lÄ±ÄŸÄ±

---

## 4. Hedef docs / runbook dÃ¼zeni

```text
docs/
  PRIMER_SSOT.md
  CHECKLIST_SSOT.md
  MILESTONE_REGISTRY_V1.md
  NEXT_BACKLOG_V1.md

  runbooks/
    canonical/
      RUNBOOK_REPO_VERIFY.md
      RUNBOOK_FINAL_CLOSURE.md
      RUNBOOK_EXPORT_HYGIENE.md
      RUNBOOK_CI_VISIBILITY.md
    living/
      RUNBOOK_LIVING_MASTER.md
      RUNBOOK_HISTORICAL_ROUTE.md
    milestones/
      RUNBOOK_M77_KVKK_UYUM_KATMANI.md
      ...
      RUNBOOK_M92_REPO_VERIFICATION_SPINE.md
    compat/
      RUNBOOK_COMPAT_ALIASES.md
```

### Kural

- â€œBugÃ¼n hangi komutu Ã§alÄ±ÅŸtÄ±racaÄŸÄ±m?â€ sorusunun cevabÄ± canonical runbookâ€™ta olmalÄ±
- milestone runbookâ€™larÄ± tarihsel ve teknik iz iÃ§in yaÅŸamaya devam etmeli
- compat dokÃ¼manlarÄ± eski â†’ yeni geÃ§iÅŸi gÃ¶rÃ¼nÃ¼r kÄ±lmalÄ±

---

## 5. Ä°simlendirme politikasÄ±

### KullanÄ±cÄ±ya gÃ¶rÃ¼nen kÄ±sa isimler

- `verify_repo.ps1`
- `verify_final.ps1`
- `verify_closure.ps1`
- `pack_living.ps1`

### Teknik / milestone isimleri

- `pack_m90_c7_export_package_hygiene.ps1`
- `check_m90_c8_ci_verification_visibility_repo_contract.ps1`
- `pack_m92_repo_verification_spine.ps1`

### Ä°lke

- wrapper isimleri kÄ±sa ve gÃ¶rev odaklÄ± olur
- milestone isimleri teknik ve iz sÃ¼rÃ¼lebilir kalÄ±r
- kÄ±sa wrapper ile teknik milestone ismi aynÄ± seviyede kullanÄ±lmaz

---

## 6. Alias politikasÄ±

Eski yollar tek seferde silinmez.

### AÅŸama 1

- eski dosya adÄ± yerinde kalÄ±r
- iÃ§inden yeni hedefe delegasyon yapÄ±lÄ±r

### AÅŸama 2

- README / primer / checklist yeni yolu gÃ¶sterir
- eski yol `compat` olarak iÅŸaretlenir

### AÅŸama 3

- yeterli geÃ§iÅŸ sonrasÄ± eski alias archive edilir

### Ã–rnek

Eski:
- `tools/pack_m77_kvkk_uyum_katmani.ps1`

Yeni hedef:
- `tools/packs/milestones/pack_m77_kvkk_uyum_katmani.ps1`

Eski dosya bir sÃ¼re yaÅŸar, ama yalnÄ±z delegasyon yapar.

---

## 7. Resmi Ã§alÄ±ÅŸma modeli

### Resmi giriÅŸ

- `npm run verify:repo`

### Resmi final giriÅŸ

- `npm run verify:final`

### Resmi paylaÅŸÄ±m/export akÄ±ÅŸÄ±

- export hygiene
- shareable bundle
- temiz `git status`

### Compatibility / legacy geniÅŸ doÄŸrulama

- `tools/pack_living.ps1`
- gerekirse phase packâ€™ler ve tekil milestone packâ€™ler

---

## 8. Ne yapÄ±lmayacak

AÅŸaÄŸÄ±dakiler tek seferde yapÄ±lmayacaktÄ±r:

- tÃ¼m tools/runbook dosyalarÄ±nÄ± big-bang rename etmek
- eski aliasâ€™larÄ± aynÄ± turda silmek
- milestone tarihÃ§esini sade gÃ¶rÃ¼nÃ¼m iÃ§in ezmek
- `verify:repo` yerine yeni ana giriÅŸ icat etmek
- canonical sÄ±ra netleÅŸmeden fiziksel taÅŸÄ±ma yapmak

---

## 9. GeÃ§iÅŸ planÄ±

### Tur 1 â€” hizalama

Hedef:
- canonical sÄ±ra dokÃ¼manÄ±
- wrapper standardÄ±
- alias politikasÄ±
- tools/docs hedef klasÃ¶r planÄ±
- README / primer / checklist gÃ¼ncellemesi

Ã‡Ä±ktÄ±:
- fiziksel taÅŸÄ±ma yok ya da minimum
- repo contract zinciri korunur

### Tur 2 â€” kontrollÃ¼ fiziksel taÅŸÄ±ma

Hedef:
- packs/checks klasÃ¶rlerini yeni sÄ±nÄ±flara taÅŸÄ±mak
- runbook klasÃ¶rlerini ayÄ±rmak
- eski dosyalarÄ± delegasyon aliasâ€™Ä± olarak bÄ±rakmak

KoÅŸul:
- her tur sonunda `npm run verify:repo`

### Tur 3 â€” temizlik

Hedef:
- gerÃ§ekten kullanÄ±lmayan aliasâ€™larÄ± archive etmek
- duplicate / legacy yollarÄ± kapatmak
- docs sadeleÅŸtirme

KoÅŸul:
- final kapanÄ±ÅŸ ve export hygiene zinciri bozulmamalÄ±

---

## 10. Agreement / shift yeni gerÃ§eÄŸi iÃ§in Ã¶zel not

Yeni canonical iÅŸ kuralÄ±:

- agreement doÄŸrudan companyâ€™den aÃ§Ä±lmaz
- doÄŸru akÄ±ÅŸ: `vardiya oluÅŸtur -> SÃ¶zleÅŸmeye DÃ¶nÃ¼ÅŸtÃ¼r -> rolling Ã¼retim`

Bu nedenle:
- direct agreement create bekleyen legacy script/check/doc Ã¶ÄŸeleri geÃ§iÅŸ planÄ±nda ayrÄ±ca temizlenmelidir
- legacy agreement testleri, canonical verification dizisinin ayrÄ± bir cleanup alt baÅŸlÄ±ÄŸÄ± olarak ele alÄ±nmalÄ±dÄ±r

---

## 11. BaÅŸarÄ± Ã¶lÃ§Ã¼tÃ¼

Bu yeniden hizalama baÅŸarÄ±lÄ± sayÄ±labilmesi iÃ§in:

1. `npm run verify:repo` PASS kalmalÄ±
2. `npm run verify:final` PASS kalmalÄ±
3. canonical giriÅŸler deÄŸiÅŸmeden sadeleÅŸmeli
4. eski â†’ yeni yol haritasÄ± gÃ¶rÃ¼nÃ¼r olmalÄ±
5. yeni biri repoâ€™ya girince ilk bakÄ±ÅŸta hangi komutu Ã§alÄ±ÅŸtÄ±racaÄŸÄ±nÄ± anlayabilmeli

---

## 12. KÄ±sa karar Ã¶zeti

- Big-bang taÅŸÄ±ma yapÄ±lmaz
- Ã–nce canonical sÄ±ra sabitlenir
- Sonra alias destekli kontrollÃ¼ taÅŸÄ±ma yapÄ±lÄ±r
- En son temizlik yapÄ±lÄ±r
- `verify:repo` birincil giriÅŸ olarak korunur
- `pack_living` compatibility / geniÅŸ prova hattÄ± olarak yaÅŸamaya devam eder


## Tur 2 ilerleme notu
- Fiziksel buyuk tasima yapilmadan `tools/wrappers` katmani eklendi.
- Root altindaki mevcut giris dosyalari compatibility amaciyla korunur.
- Hedef duzen: wrapperlar yeni yapinin iskeletini kurar, root dosyalar kontrollu gecis boyunca yasamaya devam eder.
- Bu turda urun koduna dokunulmaz; yalniz tools giris katmani netlestirilir.
