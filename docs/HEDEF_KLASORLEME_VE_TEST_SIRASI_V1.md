# HEDEF KLASÖRLEME VE TEST SIRASI V1

Bu belge, repo içindeki script / check / tools / runbook / docs yapısını yeni canonical gerçeğe göre yeniden hizalamak için hazırlanmıştır.

Amaç, tek seferde agresif taşıma yapmak değil; kanonik çalışma sırasını koruyarak, alias destekli ve kontrollü bir yeniden düzenleme yapmaktır.

---

## 1. Temel karar

Yeni resmi giriş artık şudur:

- `npm run verify:repo`

Yeni resmi kapanış girişi şudur:

- `npm run verify:final`

`tools/pack_living.ps1` korunur; ancak birincil resmi giriş değil, compatibility / geniş master prova hattı olarak konumlanır.

---

## 2. Kanonik doğrulama sırası

Repo’nun resmi doğrulama sırası aşağıdaki gibidir:

1. lint
2. docs / ssot
3. hot
4. web-contract
5. closure
6. milestones

Bu sıra repo check chain ile birebir uyumlu kalmalıdır.

### Günlük geliştirme sırası

- `npm run verify:repo`

### Final kapanış sırası

1. `npm run verify:final`
2. `pwsh -ExecutionPolicy Bypass -File .\tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`
3. `pwsh -ExecutionPolicy Bypass -File .\tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`
4. `git status --short`

### Compatibility / geniş master prova

- `tools/pack_living.ps1`

Not: `pack_living` artık resmi ilk giriş değildir; legacy/living geniş kapsama hattıdır.

---

## 3. Hedef tools klasör düzeni

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

### Bu düzenin anlamı

- `wrappers/`: kullanıcıya görünen kısa girişler
- `packs/canonical/`: bugünün resmi kapanış ve repo hijyeni hattı
- `packs/living/`: tarihsel / phase bazlı living hat
- `packs/milestones/`: milestone bazlı tekil pack’ler
- `packs/compat/`: eski alias / geçiş paketleri
- `checks/*`: aynı ayrımın repo contract ve doğrulama karşılığı

---

## 4. Hedef docs / runbook düzeni

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

- “Bugün hangi komutu çalıştıracağım?” sorusunun cevabı canonical runbook’ta olmalı
- milestone runbook’ları tarihsel ve teknik iz için yaşamaya devam etmeli
- compat dokümanları eski → yeni geçişi görünür kılmalı

---

## 5. İsimlendirme politikası

### Kullanıcıya görünen kısa isimler

- `verify_repo.ps1`
- `verify_final.ps1`
- `verify_closure.ps1`
- `pack_living.ps1`

### Teknik / milestone isimleri

- `pack_m90_c7_export_package_hygiene.ps1`
- `check_m90_c8_ci_verification_visibility_repo_contract.ps1`
- `pack_m92_repo_verification_spine.ps1`

### İlke

- wrapper isimleri kısa ve görev odaklı olur
- milestone isimleri teknik ve iz sürülebilir kalır
- kısa wrapper ile teknik milestone ismi aynı seviyede kullanılmaz

---

## 6. Alias politikası

Eski yollar tek seferde silinmez.

### Aşama 1

- eski dosya adı yerinde kalır
- içinden yeni hedefe delegasyon yapılır

### Aşama 2

- README / primer / checklist yeni yolu gösterir
- eski yol `compat` olarak işaretlenir

### Aşama 3

- yeterli geçiş sonrası eski alias archive edilir

### Örnek

Eski:
- `tools/pack_m77_kvkk_uyum_katmani.ps1`

Yeni hedef:
- `tools/packs/milestones/pack_m77_kvkk_uyum_katmani.ps1`

Eski dosya bir süre yaşar, ama yalnız delegasyon yapar.

---

## 7. Resmi çalışma modeli

### Resmi giriş

- `npm run verify:repo`

### Resmi final giriş

- `npm run verify:final`

### Resmi paylaşım/export akışı

- export hygiene
- shareable bundle
- temiz `git status`

### Compatibility / legacy geniş doğrulama

- `tools/pack_living.ps1`
- gerekirse phase pack’ler ve tekil milestone pack’ler

---

## 8. Ne yapılmayacak

Aşağıdakiler tek seferde yapılmayacaktır:

- tüm tools/runbook dosyalarını big-bang rename etmek
- eski alias’ları aynı turda silmek
- milestone tarihçesini sade görünüm için ezmek
- `verify:repo` yerine yeni ana giriş icat etmek
- canonical sıra netleşmeden fiziksel taşıma yapmak

---

## 9. Geçiş planı

### Tur 1 — hizalama

Hedef:
- canonical sıra dokümanı
- wrapper standardı
- alias politikası
- tools/docs hedef klasör planı
- README / primer / checklist güncellemesi

Çıktı:
- fiziksel taşıma yok ya da minimum
- repo contract zinciri korunur

### Tur 2 — kontrollü fiziksel taşıma

Hedef:
- packs/checks klasörlerini yeni sınıflara taşımak
- runbook klasörlerini ayırmak
- eski dosyaları delegasyon alias’ı olarak bırakmak

Koşul:
- her tur sonunda `npm run verify:repo`

### Tur 3 — temizlik

Hedef:
- gerçekten kullanılmayan alias’ları archive etmek
- duplicate / legacy yolları kapatmak
- docs sadeleştirme

Koşul:
- final kapanış ve export hygiene zinciri bozulmamalı

---

## 10. Agreement / shift yeni gerçeği için özel not

Yeni canonical iş kuralı:

- agreement doğrudan company’den açılmaz
- doğru akış: `vardiya oluştur -> Sözleşmeye Dönüştür -> rolling üretim`

Bu nedenle:
- direct agreement create bekleyen legacy script/check/doc öğeleri geçiş planında ayrıca temizlenmelidir
- legacy agreement testleri, canonical verification dizisinin ayrı bir cleanup alt başlığı olarak ele alınmalıdır

---

## 11. Başarı ölçütü

Bu yeniden hizalama başarılı sayılabilmesi için:

1. `npm run verify:repo` PASS kalmalı
2. `npm run verify:final` PASS kalmalı
3. canonical girişler değişmeden sadeleşmeli
4. eski → yeni yol haritası görünür olmalı
5. yeni biri repo’ya girince ilk bakışta hangi komutu çalıştıracağını anlayabilmeli

---

## 12. Kısa karar özeti

- Big-bang taşıma yapılmaz
- Önce canonical sıra sabitlenir
- Sonra alias destekli kontrollü taşıma yapılır
- En son temizlik yapılır
- `verify:repo` birincil giriş olarak korunur
- `pack_living` compatibility / geniş prova hattı olarak yaşamaya devam eder
