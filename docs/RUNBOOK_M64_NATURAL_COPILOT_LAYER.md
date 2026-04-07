<!-- REPO_CONTRACT_MARKER milestone=M64 slug=natural-copilot-layer -->

# RUNBOOK — M64 DOĞAL COPILOT KATMANI

## Amaç
M64, mevcut read-only / suggestion-first copilot omurgasını bozmadan daha doğal Türkçe cevap, kısa konuşma hafızası, "neden ilerlemiyor?" açıklaması, "şimdi ne yapayım?" yönlendirmesi ve kullanıcı geri bildirimi için resmi iskeleti açar.

## Kapsam
- doğal cevap katmanı manifesti
- kısa konuşma hafızası iskeleti
- neden ilerlemiyor açıklama şablonu
- daha basit anlat seçeneği
- geri bildirim şablonu
- super admin görünürlüğü için M64 paneli
- backend route ve runtime/check iskeleti

## Bu milestone neden açıldı
Ürün ticari ve operasyonel olarak güçlenirken copilot yanıtlarının daha doğal, daha takipli ve daha anlaşılır hale gelmesi gerekir. M64, güvenli karar motorunu koruyup sunum katmanını insan diline yaklaştırmak için açılır.

## Green kuralı
- M63 green olmadan M64 açılmaz.
- M64 green olmadan M65 açılmaz.
- checklist ve primer güncellemesi resmi pack/check sonrası yapılır.

## Kanonik komut
`tools\pack_m64_natural_copilot_layer.ps1 -RepoRoot D:\servis-platform`

## Çıktılar
- `backend/scripts/m64_natural_copilot_layer_check.js`
- `backend/src/ops/naturalCopilotManifest.js`
- `backend/src/routes/naturalCopilot.js`
- `web/src/panels/superadmin/NaturalCopilotPanel.jsx`
- `tools/pack_m64_natural_copilot_layer.ps1`
- `tools/check_m64_natural_copilot_layer_repo_contract.ps1`
- `docs/RUNBOOK_M64_NATURAL_COPILOT_LAYER.md`
- `docs/MILESTONE_M64_NATURAL_COPILOT_LAYER.md`

## Notlar
Bu milestone write-action açmaz. Copilot read-only / suggestion-first çizgisinde kalır. Ama aynı kararı daha doğal Türkçe ile anlatan ve takipli yardım sunan katmanı resmi hale getirir.
