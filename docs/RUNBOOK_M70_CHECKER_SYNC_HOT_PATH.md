# RUNBOOK M70 — Checker Sync + Hot Path

## Amaç
Bu adım iki şeyi birlikte düzeltir:
1. M67 ölçek/check scriptlerinin artık güncel fetch mimarisini doğru okuması
2. İlk frame’de gereksiz yük üreten birkaç sıcak company akışının inceltilmesi

## Bu adımda yapılanlar
- `scale_readiness_check.js` güncellendi
  - provider-score batch endpoint artık doğru tanınır
  - `vehicles` q/take desteği artık doğru tanınır
  - panel giriş yükü artık ilk effect zincirine göre okunur
- `company_fetch_storm_check.js` güncellendi
  - eski büyük query’ler yerine güncel canonical query’ler kullanılır
  - çoklu kullanıcı baskısı için `virtualUsers` profili eklendi
  - provider-score batch yolu senaryoya dahil edildi
- `WorkflowPanel`
  - ilk açılışta room directory çekmez
  - room listesi sadece Guided Mode açılınca gelir
  - provider score sadece açık tekliflerde görünen odalar için alınır
- `ServiceEvaluationPanel`
  - template ilk frame’de yüklenmez
  - template sadece değerlendirme açılınca alınır
- `agreements` ve `offers/company` endpoint’lerine `q` desteği eklendi
- `companyDataHub` agreements/offers helper’larına `q` passthrough eklendi

## Beklenen etki
- checker artık M68/M69 ile gelen gerçek durumu yanlış okumaz
- Workflow ilk açılışı daha hafif olur
- Hizmet değerlendirme ilk frame’i bir GET daha hafif olur
- M67 tekrar koşusunda tablo daha gerçekçi okunur

## Uygulama sonrası kontrol
1. `tools/pack_m70_checker_sync_hot_path.ps1`
2. sonra `tools/pack_m67_kurumsal_olcek_hazirlik.ps1`
3. şu noktaları karşılaştır:
   - Workflow giriş yükü
   - ServiceEvaluation giriş yükü
   - duplicate entry endpoint family listesi
   - storm check toplam GET / 429 / en sıcak endpointler
