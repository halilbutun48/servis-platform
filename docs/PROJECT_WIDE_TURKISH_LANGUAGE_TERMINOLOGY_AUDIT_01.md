# #15 Project-wide Turkish Language / Terminology Audit

Durum: `GREEN` — bounded closure corrective evidence tamamlandı. #17’nin immutable tarihçesi ve görsel corrective tag'i değiştirilmedi; #18 başlatılmadı.

## Canonical decisions

- `COMPANY`: `Hizmet Alan Firma`; kısa kullanım: `Firma`.
- `ROOM`: `Turizm/Taşımacılık Firması`; kısa kullanım: `Taşımacılık Firması`.
- `SCHOOL` ve `ORGANIZATION`: backend’de yeni rol değildir; `COMPANY` + `CompanyKind` olarak korunur.
- `human approval`: `Kullanıcı onayı` / `Onayınız gerekli`.
- `Sefer Abi`: tek kullanıcıya dönük yardımcı adı ve tek birincil giriş noktasıdır.
- Teknik durumlar bağlama göre `Çevrim dışı`, `Canlı`, `Güncel değil`, `Konum sinyali` gibi Türkçe karşılıklara dönüştürülür; backend enum/API alanları değiştirilmez.
- Harita rota kaynakları ortak kullanıcı metninden gösterilir. `ESTIMATED` yalnızca iç/API değeridir; kullanıcıya `Tahmini rota` gösterilir.
- Canlı konum yokken tahmini rota çizilirse ana açıklama `Canlı konum alınamıyor. Haritada tahmini rota gösteriliyor.` olur. Tanılama ayrıntıları açıklandığında da `Rota kaynağı: Tahmini rota` görünür; canlı konum ile tahmini rota birbirine karıştırılmaz.

## Real rendered census

Dedicated Playwright browser acceptance ile doğrulanan yüzeyler: NavDock/task home, COMPANY/ROOM canlı harita ve mobil web, seçili araç odağı, map GPS/rota/kanıt açıklıkları, Sefer Abi kapalı/hızlı/tam görünüm ve bağlam devamlılığı, Command Center, SUPER_ADMIN işlemler/ticari akış/doğal yardımcı/araçlar, DRIVER cihaz-eşleşmesi ve doğrulama yüzeyleri, PERSONEL, PARENT, SCHOOL, ORGANIZATION, finans/teklif/sözleşme/vardiya, public landing ve hatalı giriş.

Gerçek durum matrisi ayrıca empty, loading, success, validation, permission denied, cross-kind denied, not-found, stale/offline, missing data, retry/recovery, duplicate conflict, confirmation, cancellation ve map diagnostic terminology durumlarını kapsar.

Real screenshot evidence directory:
`backend/artifacts/browser-smoke/project-wide-turkish-terminology-audit-01/`

The dedicated acceptance commands are:

```text
npm run smoke:projectwideturkishterminology01
npm run check:projectwideturkishterminology01
```

Son gerçek run: `8/8` context, `15/15` state family, `24` screenshot. Beklenen negatif durumların 3 HTTP/console kaydı vardır (`404`/`403`); bunlar state kabulünde açıkça izin verilen yanıtlardır. Beklenmeyen browser/page/HTTP hatası yoktur.

## Rendered context matrix

| Context | Result | Evidence |
| --- | --- | --- |
| SUPER_ADMIN | PASS | operations, commercial core, natural assistant, vehicles |
| COMPANY | PASS | desktop/mobile live map and focus |
| ROOM | PASS | desktop/mobile live map and focus |
| DRIVER | PASS | real bound browser session; no guard bypass |
| PERSONEL | PASS | live surface |
| PARENT | PASS | live surface |
| SCHOOL | PASS | real company-kind context |
| ORGANIZATION | PASS | real company-kind context |

`#15_RENDERED_CONTEXT_PASS_COUNT=8/8`.

## Map diagnostic addendum evidence

`38-map-diagnostic-estimated-route-real.png` gerçek ROOM map yüzeyinde canlı konumu olmayan bir araç ve `ESTIMATED` route-preview yanıtı ile üretildi. Ekran gerçek settled haritayı, `Canlı konum alınamıyor.`, `Haritada tahmini rota gösteriliyor.`, açık `Tanılama ayrıntıları` ve `Rota kaynağı: Tahmini rota` metinlerini gösterir. `ESTIMATED` normal kullanıcı metninde görünmez.

```text
MAP_RAW_ROUTE_SOURCE_ENUM_LEAK_COUNT=0
MAP_ESTIMATED_ROUTE_PRESENTED_AS_LIVE_COUNT=0
MAP_DIAGNOSTIC_TERMINOLOGY_BROWSER_PASS_COUNT=1
```

The shared `web/src/utils/terminology.js` route-source owner is used by `MapView`, ROOM, and COMPANY paths. The route-source machine value remains available as a non-user-facing map data attribute for stable browser instrumentation; it is not rendered as copy or an accessible label.

## #17 handoff and capability safety

- #17 navigation, task-home, map progressive disclosure, Command Center and Sefer Abi shared-context checks remain green.
- Existing authorized multi-vehicle overview/focus proof remains green: overview `2`, focus `2`; cross-tenant and unauthorized ROOM fleet visibility are both `0`.
- COMPANY and ROOM settled map proof is `1` each. Blank-map-final-pass count is `0`.
- Map diagnostic details remain available behind disclosure; route source, location source and freshness values are plain Turkish.
- The summary is compact and preserves selected vehicle, route preview, stops, GPS state, evidence, navigation actions, responsive behavior and Sefer Abi continuity.

## Counter summary

The dedicated check reports zero for the audited role-label, old `Oda`, approval-jargon, Sefer Abi Terminali, Copilot-primary, raw enum/field, internal-engine, English workflow, status-code, #17 navigation/map/assistant/Command Center, role-model, capability, deep-link, approval, finance-semantics, private-finance, responsive, accessible-label, and map diagnostic regressions. It reports one settled COMPANY desktop map and one settled ROOM desktop map; blank maps are not used as final proof.

Historical checker compatibility phrases are comments only and are not rendered. They document why a legacy static checker may still recognize the old contract while the visible UI uses the current Turkish phrase.

## Closure matrix

| Requirement family | Owner/evidence | Classification |
| --- | --- | --- |
| Canonical role/context terminology | `web/src/utils/terminology.js`, role/context browser matrix | `PROVEN_COMPLETE` |
| Rendered terminology across 8 contexts | dedicated real Playwright report, 8 screenshots | `PROVEN_COMPLETE` |
| Error/empty/loading/recovery and approval wording | 15-state real browser matrix | `PROVEN_COMPLETE` |
| Map/GPS/route/evidence terminology | `MapView`, ROOM/COMPANY map paths, screenshot 38 | `PROVEN_COMPLETE` |
| Estimated route is not presented as live | deterministic real browser state; addendum counters `0/0/1` | `PROVEN_COMPLETE` |
| #17 navigation/map/Command Center/Sefer Abi handoff | existing #17 corrective report and focused regression | `PROVEN_COMPLETE` |
| Role authorization and CompanyKind model | unchanged backend enum/auth implementation; tenant checks | `PROVEN_COMPLETE` |
| Finance/reference/approval semantics | focused finance and approval checks | `PROVEN_COMPLETE` |
| Responsive browser and accessible labels | desktop/mobile browser snapshots and labels | `PROVEN_COMPLETE` |
| Physical-device final acceptance | #36 owner | `DEFERRED_BY_LOCKED_OWNER` |
| #18 guided anchor/highlight, #19 NL→form, #20 intelligence, #21 safe action and later future work | locked future owners | `DEFERRED_BY_LOCKED_OWNER` |

## Git and safety

- The historical #17 immutable tag remains unchanged.
- No auth role, API contract, DB value, or protected runtime artifact was changed for wording.
- Protected runtime data is excluded from #15-owned staging.
- Commit/tag/push is authorized only after the full applicable regression chain and explicit-path staging checks pass.
- #18 is not started.
