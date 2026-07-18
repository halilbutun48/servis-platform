# HOT FILE SPLIT WEB PANELS 01

Tarih: 2026-07-18
Repo: `servis-platform`

## 1) Kısa Özet

- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:hotfilesplitwebpanels01`
- Bu milestone, iki sıcak web panelini acceptance-safe şekilde küçültür:
  - `web/src/panels/company/AgreementsPanel.jsx`
  - `web/src/panels/room/AgreementsPanel.jsx`
- Davranış korunur; bridge / preview / counter / approve ayrıntıları companion component dosyalarına taşınır.
- Smoke policy, threshold, skip, timeout/wait ve PASS kriteri gevşetilmez.
- Backend route/service/prisma kapsamı dışındadır.

## 2) Satır Bütçesi

- `web/src/panels/company/AgreementsPanel.jsx`: 1577 satırdan 1288 satıra indi, azaltım `289`.
- `web/src/panels/room/AgreementsPanel.jsx`: 1454 satırdan 1275 satıra indi, azaltım `179`.
- `web/src/panels/company/companyAgreementsBridgeSection.jsx`: `237` satır.
- `web/src/panels/company/companyAgreementsPanelHelpers.js`: `82` satır.
- `web/src/panels/room/roomAgreementsBridgeSection.jsx`: `205` satır.
- `web/src/panels/room/roomAgreementsPanelHelpers.js`: `46` satır.

## 3) Korunan Yüzeyler

- `companyActionClarityScope`
- `roomCriticalFixScope`
- `desktopShiftTable`
- `companyAgreementsDesktopList`
- `companyActionCTA`
- `roomActionCTA`
- `PanelSegmentTabs`
- `ariaLabel="Sözleşme görünümü"`
- `Detayı aç`
- `Detayı kapat`
- `Rota Önizle`
- `Kabul Et`
- `Karşı Teklif`
- `Karşı Teklif Gönder`

## 4) Yapmaz

- Runtime AI action açmaz.
- Tool execution açmaz.
- Write-action dispatcher açmaz.
- DB write açmaz.
- Route apply açmaz.
- Smoke policy değiştirmez.
- Smoke threshold, skip veya PASS kriteri gevşetmez.
- Browser-smoke artifact stage etmez.
- Route/service/prisma değişikliği yapmaz.

## 5) Kanonik Eşleşme

- Check script: `backend/scripts/hot_file_split_web_panels_01_check.js`
- Company agreements panel: `web/src/panels/company/AgreementsPanel.jsx`
- Company bridge helper: `web/src/panels/company/companyAgreementsBridgeSection.jsx`
- Company helper utils: `web/src/panels/company/companyAgreementsPanelHelpers.js`
- Room agreements panel: `web/src/panels/room/AgreementsPanel.jsx`
- Room bridge helper: `web/src/panels/room/roomAgreementsBridgeSection.jsx`
- Room helper utils: `web/src/panels/room/roomAgreementsPanelHelpers.js`

## 6) Handoff

- Bu milestone, şirket ve oda agreements yüzeylerinde bridge/preview sorumluluğunu ayıran acceptance-safe hot-file split adımıdır.
- Sonraki kontrol noktası, product-extensions ve verify zincirlerinde bu split’in görünür kalmasıdır.
