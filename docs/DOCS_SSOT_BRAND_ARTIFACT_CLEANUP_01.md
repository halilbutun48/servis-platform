# DOCS / SSOT / Brand / Artifact Cleanup 01

Tarih: 2026-05-24  
Kapsam: docs, SSOT, brand, overlay, archive, pack/export/wrapper kalıntıları  
Not: Bu belge audit raporudur. Ürün/business flow değiştirmez, runtime-data dokunmaz, schema/migration açmaz.

## 1) Özet

| Metric | Count | Not |
| --- | ---: | --- |
| Taranan `docs` dosyası | `496` | docs ağacının tamamı |
| Brand term bulgusu | `24` | `Vardis` / `vardis` / `VARDIS` geçen dosyalar |
| Vardis user-facing yüzey | `9` | visible label / browser title / favicon / logo / docs entry |
| Vardis internal / historical yüzey | `15` | workflow filename, legacy keys, evidence docs |
| Overlay / patch / archive / artifact family | `457` | `docs/overlays`, `docs/_archive`, pack/export/wrapper/release tool yüzeyleri |
| Remove candidate | `0` | güvenli silme için referanssız aday bulunmadı |
| Removed (bu cleanup turu) | `0` | bu turda yeni silme yapılmadı |
| Needs review | `4` | tarihsel/internal identifier veya legacy evidence notu gereken yüzeyler |

## 2) Docs Registry

| Path | Status | Reason | Owner milestone | Active/current? | Action |
| --- | --- | --- | --- | --- | --- |
| `README.md` | `CURRENT_SSOT` | SeferPakt ürün tanımı ve tarihsel kabul kapısı linki artık generic label ile gösteriliyor. | `DOCS-SSOT-BRAND-ARTIFACT-CLEANUP-01` | Yes | Keep |
| `docs/README.md` | `CURRENT_SSOT` | Docs index, historical evidence label'ını generic isimle gösteriyor. | `DOCS-SSOT-BRAND-ARTIFACT-CLEANUP-01` | Yes | Keep |
| `docs/AGENTS.md` | `CURRENT_SSOT` | Ürün adı SeferPakt olarak hizalandı. | `DOCS-SSOT-BRAND-ARTIFACT-CLEANUP-01` | Yes | Keep |
| `docs/PRIMER_SSOT.md` | `CURRENT_SSOT` | Marka dili SeferPakt; workflow path tarihi/internal olarak işaretlendi. | `DOCS-SSOT-BRAND-ARTIFACT-CLEANUP-01` | Yes | Keep |
| `tools/PRIMER_SNAPSHOT.md` | `CURRENT_SSOT` | Snapshot ürün çerçevesi SeferPakt'a hizalandı. | `DOCS-SSOT-BRAND-ARTIFACT-CLEANUP-01` | Yes | Keep |
| `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md` | `CURRENT_MILESTONE_DOC` | Script / milestone rehberi, yeni cleanup check dahil edildi. | `SCRIPT-HARNESS-CONSOLIDATION-01` + `DOCS-SSOT-BRAND-ARTIFACT-CLEANUP-01` | Yes | Keep |
| `docs/SCRIPT_HARNESS_CONSOLIDATION_01.md` | `CURRENT_SSOT` | Script registry ve legacy family analizi korunuyor. | `SCRIPT-HARNESS-CONSOLIDATION-01` | Yes | Keep |
| `docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md` | `CURRENT_MILESTONE_DOC` | Copilot panel audit'i, Sefer Abi boundary ve historical/internal notları ile korunuyor. | `COP-LIVE-ACCEPT-01` | Yes | Keep |
| `docs/KABUL_KRITERLERI_10_10_VARDIS.md` | `HISTORICAL_EVIDENCE` | Dosya adı tarihsel kaldı; görünür başlık SeferPakt'a çekildi. | `DOCS-SSOT-BRAND-ARTIFACT-CLEANUP-01` | No | Keep |
| `docs/FINAL_RELEASE_EVIDENCE_M90.md` | `HISTORICAL_EVIDENCE` | Final release evidence dokümanı; Vardis izleri tarihsel kanıt olarak kalabilir. | `M90` | No | Keep |
| `docs/DOCS_SSOT_BRAND_ARTIFACT_CLEANUP_01.md` | `CURRENT_MILESTONE_DOC` | Bu cleanup audit raporunun kendisi. | `DOCS-SSOT-BRAND-ARTIFACT-CLEANUP-01` | Yes | Keep |

## 3) Brand Registry

| Path | Term | User-facing / internal / historical | Action | Result |
| --- | --- | --- | --- | --- |
| `web/index.html` | `Vardis` | User-facing | Updated | Browser title is `SeferPakt` |
| `web/public/vardis-favicon.svg` | `Vardis` | User-facing | Updated | Favicon aria/title now say `SeferPakt` |
| `web/public/vardis-logo.svg` | `Vardis` | User-facing asset | Updated | SVG title/aria now say `SeferPakt` |
| `README.md` | `Vardis` | User-facing docs | Updated | Visible ref label cleaned; historical target preserved |
| `docs/README.md` | `Vardis` | User-facing docs | Updated | Visible index label cleaned; historical target preserved |
| `docs/AGENTS.md` | `Vardis` | User-facing docs | Updated | Product name is `SeferPakt` |
| `docs/PRIMER_SSOT.md` | `Vardis` | Mixed: user-facing brand + internal historical workflow ref | Updated | Brand line fixed; workflow path marked historical/internal |
| `tools/PRIMER_SNAPSHOT.md` | `Vardis` | User-facing docs snapshot | Updated | Product framing fixed to SeferPakt |
| `web/src/components/copilot/ChatMessageBubble.jsx` | `vardis:` storage keys | Internal technical identifier | Kept | No blind rename; legacy key preserved intentionally |
| `web/src/components/copilot/ChatQualitySummary.jsx` | `vardis:` storage keys | Internal technical identifier | Kept | No blind rename; legacy key preserved intentionally |

## 4) Script Reference Registry

| Docs path | Referenced command / script | Exists? | Canonical replacement | Action |
| --- | --- | --- | --- | --- |
| `README.md` | `docs/KABUL_KRITERLERI_10_10_VARDIS.md` | Yes | Generic visible label `[KABUL_KRITERLERI_10_10.md]` | Keep historical target, clean visible label |
| `docs/README.md` | `./KABUL_KRITERLERI_10_10_VARDIS.md` | Yes | Generic visible label `[KABUL_KRITERLERI_10_10.md]` | Keep historical target, clean visible label |
| `docs/PRIMER_SSOT.md` | `.github/workflows/vardis_verification_visibility.yml` | Yes | Same workflow filename, historical/internal note | Keep and document as historical/internal |
| `tools/README.md` | `.github/workflows/vardis_verification_visibility.yml` | Yes | Same workflow filename, historical/internal note | Keep and document as historical/internal |
| `docs/SCRIPT_HARNESS_CONSOLIDATION_01.md` | `backend/scripts/cop_04b_fix_06_live_drawer_context_bridge_check.js` | No | `backend/scripts/cop_04b_fix_06_free_chat_context_bridge_check.js` | Removed historical alias documented |
| `docs/SCRIPT_HARNESS_CONSOLIDATION_01.md` | `backend/scripts/ux_company_panel_smoke_01_check.js` | No | `backend/scripts/ux_company_ops_panel_tabs_01_check.js` | Removed historical alias documented |
| `docs/SCRIPT_HARNESS_CONSOLIDATION_01.md` | `backend/scripts/ux_live_map_tabs_fix_01_check.js` | No | `backend/scripts/ux_live_map_tabs_simplify_01_check.js` | Removed historical alias documented |

## 5) Overlay / Artifact Registry

| Path | Type | Referenced? | Status | Action | Risk if removed |
| --- | --- | --- | --- | --- | --- |
| `docs/overlays/` | Overlay history | Yes | `HISTORICAL_EVIDENCE` | Keep | High: patch history and release notes lose context |
| `docs/_archive/` | Archive history | Yes | `HISTORICAL_EVIDENCE` | Keep | High: historical docs / redirect notes lose traceability |
| `tools/pack_living.ps1` | Pack / compat wrapper | Yes | `ACTIVE_RELEASE_ONLY` | Keep | High: living pack / compatibility entrypoint breaks |
| `tools/wrappers/pack_living.ps1` | Wrapper / alias | Yes | `LEGACY_COMPAT` | Keep | Medium: wrapper convenience breaks, canonical remains |
| `tools/export_shareable_repo_bundle.ps1` | Export tool | Yes | `MANUAL_RELEASE_TOOL` | Keep | High: release bundle generation path breaks |
| `tools/check_repo_audit_master.ps1` | Audit tool | Yes | `ACTIVE_RELEASE_ONLY` | Keep | High: master repo-audit proof path breaks |
| `tools/repo_contract_state.json` | Contract snapshot | Yes | `ACTIVE_CORE` | Keep | High: verify chain hot/large policy snapshot breaks |
| `tools/milestone_pack_manifest.json` | Pack manifest | Yes | `ACTIVE_RELEASE_ONLY` | Keep | Medium: pack tooling metadata loses source of truth |
| `backend/scripts/clean_snapshot_artifacts.js` | Hygiene script | Yes | `ACTIVE_CORE` | Keep | Medium: verify:final snapshot cleanup path loses guardrail |
| `backend/prisma/migrations/*` | Schema history | Yes | `HISTORICAL_EVIDENCE` | Keep | High: migration provenance and DB evolution lose traceability |

## 6) Removed Items

Bu cleanup turunda yeni dosya silinmedi.  
Geçmiş script-harness consolidation sırasında kaldırılan alias wrapper'lar, canonical replacement ile birlikte aşağıda tarihsel olarak korunur:

| Path | Reason | Replacement | References cleaned | Risk |
| --- | --- | --- | --- | --- |
| `backend/scripts/cop_04b_fix_06_live_drawer_context_bridge_check.js` | Saf alias wrapper | `backend/scripts/cop_04b_fix_06_free_chat_context_bridge_check.js` | package / chain / docs | Düşük, canonical script var |
| `backend/scripts/ux_company_panel_smoke_01_check.js` | Saf alias wrapper | `backend/scripts/ux_company_ops_panel_tabs_01_check.js` | package / chain / docs | Düşük, canonical script var |
| `backend/scripts/ux_live_map_tabs_fix_01_check.js` | Saf alias wrapper | `backend/scripts/ux_live_map_tabs_simplify_01_check.js` | package / chain / docs | Düşük, canonical script var |

## 7) Needs Review

| Path | Reason | Suggested owner milestone | Next action |
| --- | --- | --- | --- |
| `.github/workflows/vardis_verification_visibility.yml` | Workflow filename tarihsel/internal identifier olarak kalıyor; rename yapılmadı. | `DOCS-SSOT-BRAND-ARTIFACT-CLEANUP-02` | Yeni workflow adı gerekirse ayrı çevrimde planla |
| `web/src/components/copilot/ChatMessageBubble.jsx` | `vardis:*` localStorage key legacy internal identifier; blind rename istenmedi. | `COPILOT-TECH-DEBT-01` | Eğer migration planlanırsa migration-safe alias tasarla |
| `web/src/components/copilot/ChatQualitySummary.jsx` | `vardis:*` localStorage key legacy internal identifier; blind rename istenmedi. | `COPILOT-TECH-DEBT-01` | Eğer migration planlanırsa migration-safe alias tasarla |
| `docs/FINAL_RELEASE_EVIDENCE_M90.md` | Release evidence içinde tarihsel Vardis izi kalabilir; user-facing brand değil ama görünür tarihsel kayıt. | `M90` / `DOCS-STATE` | Historical evidence olarak bırak, gerekirse sonraki cleanup'ta ayrı karar ver |

## 8) Final SSOT Recommendation

### Güncel ana docs
- `docs/PRIMER_SSOT.md`
- `docs/README.md`
- `docs/AGENTS.md`
- `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md`
- `docs/SCRIPT_HARNESS_CONSOLIDATION_01.md`
- `docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md`
- `docs/FINAL_UX_SMOKE_01_CHECKLIST.md`
- `docs/COP_LIVE_ACCEPT_01_MATRIX.md`
- `docs/BOARDING_OPS_01A_ROUTE_IMPACT_PREVIEW.md`
- `docs/BOARDING_OPS_01B_ACCEPTED_CHANGE_APPLICATION.md`
- `docs/BOARDING_OPS_01C_DRIVER_ROUTE_REFRESH.md`
- `docs/ROUTE_CHANGE_FINAL_01.md`
- `docs/DOCS_SSOT_BRAND_ARTIFACT_CLEANUP_01.md`

### Historical docs
- `docs/KABUL_KRITERLERI_10_10_VARDIS.md`
- `docs/FINAL_RELEASE_EVIDENCE_M90.md`
- `docs/NEXT_BACKLOG_V1.md`
- `docs/STATUS_20260322_BASELINE_GREEN.md`
- `docs/VERIFY_LEGACY_M0_M41_01.md`
- `docs/PRIMER_SSOT.md` içindeki tarihsel workflow referansı

### Future docs cleanup backlog
- Workflow filename rename kararı gerekiyorsa ayrı milestone
- Copilot localStorage `vardis:*` anahtarları için migration planı gerekiyorsa ayrı milestone
- Tarihsel evidence dosyalarında görünen Vardis izleri için ayrı karar gerekirse ayrı cleanup turu

### BRAND / DOCS state
- Kullanıcıya görünen marka `SeferPakt`
- Asistan adı `Sefer Abi`
- CTA `Sefer Abi’ye Sor`
- Görünür label standardı `Konum`, `İller ve Bölgeler`, `Güven ve Kalite`, `İşlem Kayıtları`, `Log Dışa Aktarımı`
- Tarihsel dosya adları ve internal workflow / storage key isimleri, ayrı owner kararı yoksa korunur

