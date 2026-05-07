# SCRIPT KILAVUZU / MILESTONE HARITASI

Tarih: 2026-04-08  
Repo: `servis-platform`  
Kapsam: Bu doküman, M0'dan güncel latest milestone'a kadar milestone ve script ilişkisini **tek resmi rehberde** toplar.

## 1) Bu dosya nasıl okunmalı?
- Önce `tools/repo_contract_state.json` okunur.
- Sonra bu dosya okunur.
- Tarihsel ve canonical bilgi karıştırılmaz.
- Bir milestone için mümkün olan en güçlü kanıt sırası: state/marker -> pack/check -> runbook -> ilgili ekran/route.

## 2) Kanıt seviyesi sözlüğü
- **[CANONICAL]**: Güncel canlı anlatının parçası.
- **[HISTORICAL]**: Tarihsel anchor veya compatibility alanı.
- **[PACK]**: Resmi pack komutu bulunan alan.
- **[CHECK]**: Repo contract veya node check izi bulunan alan.
- **[RUNBOOK]**: Operasyon veya kabul anlatımı olan alan.

## 3) Tek rehber kuralı
- Bu dosya aktif script rehberidir.
- `docs/_archive/legacy-notes/script-guide-redirects/` altındaki tarihsel yönlendirme dosyaları artık aktif rehber değildir.
- Güncel rota için yalnız bu dosya, `PRIMER_SSOT`, `MILESTONE_REGISTRY` ve `CHECKLIST_SSOT` birlikte okunur.

## 4) Master orchestration
### Ana komutlar
- `npm run verify:repo`
- `tools\check-repo.ps1 -Phase all`
- `node backend\scripts\run_repo_check_chain.js --phase all`
- `tools\pack.ps1 -To 89 -RepoDir D:\servis-platform -NoBuild`
- `tools\pack_living.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- `tools\verify_living_runtime.ps1 -To 89 -RepoRoot D:\servis-platform -NoBuild`
- `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`
- `node backend\scripts\run_m0_latest.js --static-only --to latest --continue`
- `npm run verify:milestones`
- `node backend\scripts\m94d_admin_payment_security_export_check.js`
- `node backend\scripts\m94e_queue_chaos_alarm_check.js`
- `node backend\scripts\m94e_queue_chaos_alarm_probe.js`
- `node backend\scripts\m95_e25_mobile_field_acceptance_check.js`
- `node backend\scripts\m95_e26_android_emulator_smoke_plan_check.js`
- `node backend\scripts\m95_e27_real_android_device_field_proof_prep_check.js`
- `node backend\scripts\m97_panel_operations_check.js`
- `node mobile\scripts\m98_bcd_activation_kvkk_check.js`
- `node backend\scripts\m98_e2e_code_pin_access_acceptance_check.js`
- `node backend\scripts\m98_e3_code_pin_field_ux_check.js`
- `node backend\scripts\m98_e5_code_pin_manual_acceptance_check.js`
- `node backend\scripts\m99_kvkk_01_mobile_web_plain_text_check.js`
- `node backend\scripts\m99_ux_01_visible_text_hygiene_check.js`
- `node backend\scripts\op_01_operation_proof_service_proof_check.js`
- `node backend\scripts\op_02_manual_operator_proof_note_check.js`
- `node backend\scripts\op_03_web_operation_proof_card_check.js`
- `node backend\scripts\qlt_01_quality_provider_readiness_check.js`
- `node backend\scripts\qlt_02_quality_draft_score_check.js`
- `node backend\scripts\qlt_03_quality_review_decision_check.js`
- `node backend\scripts\qlt_04_quality_review_history_check.js`

### Orchestration mantığı
- `npm run verify:repo` guncel tek resmi repo kontrol girisidir.
- `backend/scripts/run_repo_check_chain.js` lint -> docs -> hot -> web-contract -> closure -> milestones sirasini uygular.
- Eski tekil scriptler ve packler kanit olarak kalir; gunluk siralama bu runner uzerinden okunur.
- `pack.ps1` ana üst kapıdır.
- `pack_living.ps1`, master pack'i living girişinden çağırır.
- `verify_living_static.ps1`, statik repo ve alt bant kontrollerini koşturur.
- `verify_living_runtime.ps1`, living runtime doğrulamasını master pack üzerinden yürütür.
- `tools/_packs/pack_m82.ps1`, upper-route bandını M82.1'den M89'a kadar sırayla bağlar.

## 5) Faz haritası
### Faz A — M0→M41 çekirdek temel hat [HISTORICAL]
Bu bant tek tek ayrı pack rehberinden çok `run_m0_latest.js` ve legacy milestone check zinciri ile yaşar. Eski `run_m0_m66.js` yalniz tarihsel wrapper olarak dusunulmelidir; guncel komut `npm run verify:milestones`.
Ana kapsama örnekleri:
- iskelet / auth / role / seed
- temel REST/WS omurgası
- okul, öğrenci, veli ve personel çekirdek veri akışları
- GPS live/history temel ayrımı
- ilk panel ve kayıt omurgası

### Faz B — M42→M58 hazırlık ve mobil ön bant [HISTORICAL + PACK]
Bu bantta milestone bazlı pack komutları görünür hale gelir.

### Faz C — M59→M79 operasyon / SSOT / hot-path / acceptance [HISTORICAL + CANONICAL ANCHOR]
Bu bant tarihsel anchor ve repo karakterini belirleyen orta omurgadır.

### Faz D — M80→M89 upper route [CANONICAL]
Bu bant güncel doğrulanmış üst hattır.

## 6) Milestone haritası — M0→M41
### M0→M5 [HISTORICAL]
- Amaç: repo iskeleti, auth, role ve seed tabanı.
- Ana yürütücü: `backend/scripts/m0check.js` ve ilgili legacy zincir.
- Durum: çekirdek tarihi omurga; ayrı tekil pack değil, faz runner mantığıyla ele alınır.

### M6→M11 [HISTORICAL]
- Amaç: okul/öğrenci/veli çekirdek CRUD ve ilk ekran bağları.
- Ana yürütücü: legacy `mXcheck.js` zinciri.
- Durum: tarihsel temel ürün hattı.

### M12→M17 [HISTORICAL]
- Amaç: GPS, attendance, canlı publish ve temel WS room yapısı.
- Not: bu bant proje hafızasında canlı operasyonun ilk büyük eşiğidir.

### M18→M23 [HISTORICAL]
- Amaç: parent/public erişim, görünürlük ve ürün yüzeyi derinleşmesi.
- Not: güncel Parent Access akışı legacy invite değildir; bu fark daha yeni docs'ta açıklanır.

### M24→M29 [HISTORICAL]
- Amaç: teklif, atama, rota ve organizasyonel akışların genişlemesi.
- Durum: legacy çekirdek.

### M30→M35 [HISTORICAL]
- Amaç: harita, operasyon, görünürlük ve panel birikimi.
- Durum: tek tek değil faz runner ile okunur.

### M36→M41 [HISTORICAL]
- Amaç: M42 öncesi çekirdek kapanış ve pack'li döneme hazırlık.
- Ana komut: `tools/packs/living/pack_phase_m0_m41.ps1`

## 7) Milestone haritası — M42→M58
### M42 — Optional gate [PACK]
- Pack: `tools/pack_m42_optional.ps1`
- Anlam: M42 sonrası paketli doğrulama bandının başlangıcı.

### M43 — Google Auth Invite Gate [PACK]
- Pack: `tools/pack_m43_google_auth_invite_gate.ps1`
- Not: güncel üründe legacy invite davranışı tarihsel bilgi olarak kalır.

### M44 — Telematics [PACK]
- Pack: `tools/pack_m44_telematics.ps1`
- Amaç: araç GPS/telematics temel omurgası.

### M45 — Retention + Backup [PACK]
- Pack: `tools/pack_m45_retention_backup.ps1`
- Amaç: retention/backup altyapısı.

### M46 — AI Copilot Foundation [PACK]
- Ana pack: `tools/pack_m46_ai_copilot.ps1`
- Alt packler: `m46.1`...`m46.9`, `m46.6_*`, `m46.7`, `m46.8`, `m46.9`
- Amaç: AI copilot, screen help, job guide, context chat ve role mode bandı.

### M47 — KVKK Notice / Consent Framework [PACK]
- Pack: `tools/pack_m47_kvkk_notice_consent_framework.ps1`
- Amaç: KVKK notice/consent temeli.

### M47.2 — Capacity & Load Baseline [PACK]
- Pack: `tools/pack_m47_2_capacity_load_baseline.ps1`

### M47.3 — Production Resilience + Edge Security [PACK]
- Pack: `tools/pack_m47_3_production_resilience_edge_security.ps1`

### M47.4 — Mobile Readiness Web Pass [PACK]
- Pack: `tools/pack_m47_4_mobile_readiness_web_pass.ps1`

### M48 — Driver Mobile App Foundation [PACK]
- Pack: `tools/pack_m48_driver_mobile_foundation.ps1`

### M48.5 — Room / Company Tablet Readiness [PACK]
- Pack: `tools/pack_m48_5_room_company_tablet_readiness.ps1`

### M49 — Mobile Beta Hardening [PACK]
- Pack: `tools/pack_m49_mobile_beta_hardening.ps1`

### M49.1 — Driver Voice Guidance + Stop ETA [PACK]
- Pack: `tools/pack_m49_1_driver_voice_guidance_stop_eta.ps1`

### M50 — Mobile Release Readiness [PACK]
- Pack: `tools/pack_m50_mobile_release_readiness.ps1`

### M51→M53 — Backfill Verification [PACK]
- Pack: `tools/pack_m51_53_backfill_verification.ps1`
- Amaç: veri/rota/backfill doğrulaması.

### M54.3 — Dispatch Approve + Repack [PACK]
- Pack: `tools/pack_m54_3_dispatch_approve_repack.ps1`

### M54.4 — Driver Route Delivery [PACK]
- Pack: `tools/pack_m54_4_driver_route_delivery.ps1`

### M55 — Reports + No-show [PACK]
- Pack: `tools/pack_m55_reports_no_show.ps1`

### M56 — KVKK Matrix + ETA / Navigation Quality [PACK]
- Pack: `tools/pack_m56_kvkk_eta_quality.ps1`

### M57 — Mobile Hardening [PACK]
- Pack: `tools/pack_m57_mobile_hardening.ps1`

### M58 — Final Pilot Readiness [PACK / HISTORICAL OPEN GATE]
- Pack: `tools/pack_m58_final_pilot_readiness.ps1`
- Durum: tarihsel pilot kapısı; checklistte açık marker olarak yaşar.

## 8) Milestone haritası — M59→M79
### M59 — Gözlemleme + Saha Teşhis [PACK / HISTORICAL OPEN GATE]
- Pack: `tools/pack_m59_observability_field_diagnostics.ps1`
- Rolü: saha öncesi gözlemleme, teşhis ve karar desteği.

### M60 — Saha Acceptance Merkezi [PACK]
- Pack: `tools/pack_m60_field_acceptance_center.ps1`

### M61 — SSOT + Milestone Hizası [PACK]
- Pack: `tools/pack_m61_ssot_milestone_alignment.ps1`
- Rolü: docs ve milestone anlamlarını bir çizgiye oturtmak.

### M62 — Ticari Omurga Güçlendirme [PACK]
- Pack: `tools/pack_m62_commercial_core_strengthening.ps1`

### M63 — Güven + Kalite + Hizmet Değerlendirme [PACK]
- Pack: `tools/pack_m63_trust_quality_service_evaluation.ps1`

### M64 — Doğal Copilot Katmanı [PACK]
- Pack: `tools/pack_m64_natural_copilot_layer.ps1`

### M65 — Pilot Launch Gate [PACK]
- Pack: `tools/pack_m65_pilot_launch_gate.ps1`
- Not: saha açılımı için tarihsel güven kapısıdır.

### M66 — Operasyonel Reassignment [PACK / HISTORICAL COMPAT]
- Pack: `tools/pack_m66_operation_reassignment.ps1`
- Durum: compatibility marker.

### M67 — Kurumsal Ölçek Hazırlık [PACK]
- Pack: `tools/pack_m67_kurumsal_olcek_hazirlik.ps1`

### M68 — Fetch Hardening [PACK]
- Pack: `tools/pack_m68_fetch_hardening.ps1`

### M69 — Fetch Hardening Phase 2 [PACK]
- Pack: `tools/pack_m69_fetch_hardening_phase2.ps1`

### M70 — Checker Sync + Hot Path [PACK]
- Pack: `tools/pack_m70_checker_sync_hot_path.ps1`

### M71 — Summary Hot Path [PACK]
- Pack: `tools/pack_m71_summary_hotpath.ps1`
- Ek hotfix packleri: `pack_m71_room_title_hotfix.ps1`, `pack_m71_ui_contract_hotfix.ps1`, `pack_m71_workflow_loadsummary_hotfix.ps1`

### M72 — Hot Endpoint Reduction [PACK]
- Pack: `tools/pack_m72_hot_endpoint_reduction.ps1`
- Ek hotfix: `tools/pack_m72_georeview_token_hotfix.ps1`

### M73 — Hot Path Phase 2 [PACK]
- Pack: `tools/pack_m73_hot_path_phase2.ps1`

### M74 — Hot Path Phase 3 [PACK]
- Pack: `tools/pack_m74_hot_path_phase3.ps1`

### M75 — Hot Path Phase 4 [PACK]
- Pack: `tools/pack_m75_hot_path_phase4.ps1`
- Ek hotfix: `tools/pack_m75_repo_contract_hotfix.ps1`

### M76A-1 — Minimum Normalization [PACK]
- Pack: `tools/pack_m76a_1_minimum_normalization.ps1`

### M76B — Living Matrix + Tools Consolidation [PACK]
- Pack: `tools/pack_m76b_living_matrix_tools_consolidation.ps1`

### M76A-2 — Final Normalization + Archiving [PACK]
- Pack: `tools/pack_m76a_2_final_normalization_archiving.ps1`

### M77 — KVKK + Uyum Katmanı [PACK]
- Pack: `tools/pack_m77_kvkk_uyum_katmani.ps1`

### M78 — Checklist + Operasyon Doğrulama [PACK]
- Ana pack: `tools/pack_m78_checklist_operasyon_dogrulama.ps1`
- Alt packler: `M78.1`, `M78.2`, `M78.3`
- İlgili rehberler:
  - `docs/SAHA_KABUL_CHECKLISTLERI_V1.md`
  - `docs/ROL_BAZLI_OPERASYON_DOGRULAMA_V1.md`
  - `docs/KANIT_PROOF_KONTROL_OMURGASI_V1.md`
  - `docs/KABUL_RED_EKSIK_TEKRAR_KONTROL_AKISI_V1.md`

### M79 — Copilot Acceptance [PACK]
- Pack: `tools/pack_m79_copilot_acceptance.ps1`
- Rolü: tarihsel tam master anchor öncesi kabul kapısı.

## 9) Milestone haritası — M80→M89 upper route
### M80 — Final sert kabul ve yük güveni [CANONICAL / PACK]
- Pack: `tools/pack_m80_final_sert_kabul_yuk_guveni.ps1`
- Amaç: sıcak paneller, yük davranışı ve sert kabul kapısı.

### M80.1 — Hot panel daraltma [PACK]
- Pack: `tools/pack_m80_1_hot_panel_daraltma.ps1`
- Amaç: sıcak panellerde yük azaltma ve sadeleştirme.

### M80.2 — Agreements + Shifts giriş yükü [PACK]
- Pack: `tools/pack_m80_2_agreements_shifts_giris_yuku.ps1`
- Amaç: ilk giriş yükünü düşürmek.

### M80.3 — GeoReview + Shifts son giriş yükü [PACK]
- Pack: `tools/pack_m80_3_georeview_shifts_son_giris_yuku.ps1`
- Amaç: son kalan giriş yükü sıcak noktalarını kapatmak.

### M81 — Mobil saha sertleştirme [PACK]
- Pack: `tools/pack_m81_mobile_saha_sertlestirme.ps1`
- Amaç: mobil omurgayı resmi tools/docs hattına bağlamak.

### M82 — Saha öncesi çekirdek sertleştirme programı [CANONICAL UMBRELLA]
- Alt görünür kapılar: `M82.1`, `M82.8`, `M82.9`, `M82.10`, `M82.11`
- Alt çalışma notları: `M82.2`, `M82.3`, `M82.4`, `M82.5`, `M82.6`, `M82.7`

### M82.1 — Backend correctness kilidi [PACK]
- Pack: `tools/pack_m82_1_backend_correctness.ps1`
- Ana konu: route snapshot, preview cache, error contract ve correctness guard.

### M82.8 — Verification 2.0 [PACK]
- Pack: `tools/pack_m82_8_verification_2_0.ps1`
- Ana konu: mobil acceptance zinciri + company shifts runtime guard.

### M82.9 — Dormant payment backbone [PACK]
- Pack: `tools/pack_m82_9_dormant_payment_backbone.ps1`
- Ana konu: `AGREEMENT | SHIFT_SERIES` ticari kaynak, dormant payment omurgası.

### M82.10 — Super Admin ticari ayarlar [PACK]
- Pack: `tools/pack_m82_10_super_admin_commercial_settings.ps1`
- Ana konu: payment mode / commission / override yönetimi.

### M82.11 — Payment readonly ticari yüzey [PACK]
- Pack: `tools/pack_m82_11_payment_readonly_surface.ps1`
- Ana konu: agreement ve shift series tarafında readonly ticari özet görünürlüğü.

### M83 — Saha hazırlık paketi [PACK]
- Pack: `tools/pack_m83_field_prep_packet.ps1`
- Runbook: `docs/RUNBOOK_M83_FIELD_PREP_PACKET.md`
- Ana konu: operatör sırası, senaryo listesi, role/device checklist.

### M84 — Saha geri bildirim döngüsü [PACK]
- Pack: `tools/pack_m84_field_feedback_loop.ps1`
- Runbook: `docs/RUNBOOK_M84_FIELD_FEEDBACK_LOOP.md`
- Ana konu: saha günü kayıtları, kapanış takibi, Super Admin geri bildirim yüzeyi.

### M85 — Opsiyonel ödeme pilotu [PACK]
- Pack: `tools/pack_m85_optional_payment_pilot.ps1`
- Runbook: `docs/RUNBOOK_M85_OPTIONAL_PAYMENT_PILOT.md`
- Ana konu: OPTIONAL mod READY/DORMANT pilot listesi.

### M86 — Zorunlu ödeme rollout [PACK]
- Pack: `tools/pack_m86_required_payment_rollout.ps1`
- Runbook: `docs/RUNBOOK_M86_REQUIRED_PAYMENT_ROLLOUT.md`
- Ana konu: REQUIRED mod ACTIVE/DISABLED rollout akışı.

### M87 — Ödeme hesabı hazırlığı [PACK]
- Pack: `tools/pack_m87_payment_account_readiness.ps1`
- Runbook: `docs/RUNBOOK_M87_PAYMENT_ACCOUNT_READINESS.md`
- Ana konu: payment account metadata/readiness görünürlüğü.

### M88 — Settlement operasyon masası [PACK]
- Pack: `tools/pack_m88_settlement_operations_console.ps1`
- Runbook: `docs/RUNBOOK_M88_SETTLEMENT_OPERATIONS_CONSOLE.md`
- Ana konu: READY/PLANNED/EXECUTED settlement entry satırlarının operasyon görünürlüğü.

### M89 — Settlement mutabakat masası [PACK]
- Pack: `tools/pack_m89_settlement_reconciliation_desk.ps1`
- Runbook: `docs/RUNBOOK_M89_SETTLEMENT_RECONCILIATION_DESK.md`
- Ana konu: eşleşti / inceleme gerekli / uyuşmazlık / kapandı akışı.

## 10) M90 yönü
### M90 — Canonical Closure / 10-10 kapanış paketi [PLAN]
- Amaç: yeni ürün modülü açmak değil.
- Hedefler:
  - kanonik markdown hizası
  - state/pack/verify convergence
  - proof reformu
  - repo hijyen kapanışı
  - tek rehber kuralı

### M90B.1 — executable closure gate [PACK]
- Pack: `tools/pack_m90_b1_canonical_closure_gate.ps1`
- Runbook: `docs/RUNBOOK_M90B_1_EXECUTABLE_CLOSURE_GATE.md`
- Ana konu: `M0->M89 green` bazı üstünde docs/state/pack/verify convergence hattını çalışan resmi kapıya bağlamak.

### M90C.6 — hot-file queue policy [PACK]
- Pack: `tools/pack_m90_c6_hot_file_queue_policy.ps1`
- Runbook: `docs/RUNBOOK_M90C_6_HOT_FILE_QUEUE_POLICY.md`
- Ana konu: large/hot file listesini resmi sınıflı queue'ya çevirmek; justified exception, safe candidate review ve acceptance-sensitive / later sınıflarını repo-audit ile doğrulamak.

### M90C.7 — export / package hygiene closure [PACK]
- Pack: `tools/pack_m90_c7_export_package_hygiene.ps1`
- Runbook: `docs/RUNBOOK_M90C_7_EXPORT_PACKAGE_HYGIENE_CLOSURE.md`
- Shareable export: `tools/export_shareable_repo_bundle.ps1`
- Physical snapshot soft gate: `npm run verify:snapshot`
- Ana konu: env/build/runtime-json/overlay kalıntısı taşımayan temiz shareable repo zip üretmek; fiziksel snapshot yüzeyi export-clean ile karıştırılmaz.

### M90C.8 — CI / verification visibility [PACK]
- Pack: `tools/pack_m90_c8_ci_verification_visibility.ps1`
- Runbook: `docs/RUNBOOK_M90C_8_CI_VERIFICATION_VISIBILITY.md`
- Root verify: `npm run verify:ci`
- Web lint kanıtı: `artifacts/lint/web_lint_latest.txt`
- Workflow: `.github/workflows/vardis_verification_visibility.yml`
- Ana konu: kanonik doğrulama zincirini repo-native görünür hale getirmek ve repo audit + web lint + sanitized export artifact'larını CI içinde görünür kılmak.

### M90C.9 — güvenli kapanış / final hygiene checklist [PACK]
- Pack: `tools/pack_m90_c9_safe_closure_final_hygiene.ps1`
- Runbook: `docs/RUNBOOK_M90C_9_SAFE_CLOSURE_FINAL_HYGIENE_CHECKLIST.md`
- Final verify: `npm run verify:final`
- Final verify sonrası web lint kanıtı: `artifacts/lint/web_lint_latest.txt`
- Export/hijyen shell tercihi: `pwsh`
- Ana konu: release/shareable/export/verify sırasını tek resmi checklist altında sabitlemek ve PS5 uyum dersini kalıcı kurala çevirmek.

### M91 — shift / agreement route preview [STATIC CHECK BAND]
- Runbook: `docs/RUNBOOK_M91_SHIFT_AGREEMENT_ROUTE_PREVIEW.md`
- Pack: `tools/pack_m91_shift_agreement_route_preview.ps1`
- Backend alias: `npm --prefix backend run m91check`
- Family runner: `node backend/scripts/run_m91_route_preview_checks.js`
- Compatibility milestone alias: `npm --prefix backend run m91:milestones`
- Latest runner: `npm run verify:milestones`
- Ana konu: vardiyadan sozlesmeye gecen akista kaynak vardiya, rota onizleme, operasyon koprusu ve linked-shift guard'larini ayni kontratta tutmak. Benzer M91 marker scriptleri `backend/scripts/_m91_route_preview_checks.js` altinda tek catiya alinmistir; eski `m91*_check.js` dosyalari compatibility wrapper olarak kalir.

### M92 — repo verification spine [CANONICAL CHECK CHAIN]
- Milestone: `docs/MILESTONE_M92_REPO_VERIFICATION_SPINE.md`
- Runbook: `docs/RUNBOOK_M92_REPO_VERIFICATION_SPINE.md`
- Pack: `tools/pack_m92_repo_verification_spine.ps1`
- Backend alias: `npm --prefix backend run m92check`
- Root alias: `npm run verify:repo`
- Ana konu: tum repo kontrollerini tek catiya toplamak; package scriptleri, tools wrapper, manifest, state, runbook ve M0->latest runner baglantisini ayni guard altinda tutmak.


### M93 — queue durability proof [PACK]
- Milestone: `docs/MILESTONE_M93_QUEUE_DURABILITY_PROOF.md`
- Runbook: `docs/RUNBOOK_M93_QUEUE_DURABILITY_PROOF.md`
- Pack: `tools/pack_m93_queue_durability_proof.ps1`
- Runtime probe: `backend/scripts/m93_queue_durability_runtime_probe.js`
- Ana konu: autoReachedQueue için Redis down/up, worker restart reclaim, dead-letter görünürlüğü ve threshold kanıtını resmi hatta bağlamak.

### M94-D2 / M94-D3 — admin audit + payment export polish + settlement ledger CSV cleanup [CHECK]
- Komut: `node backend\scripts\m94d_admin_payment_security_export_check.js`
- Ana konu: admin write step-up, payment ledger export audit standardı, ledger CSV temizliği ve ticari panel görünürlüğünü küçük bir kapanış check'iyle sabitlemek.

### M94-E — queue chaos / alarm proof [CHECK + PROBE]
- Runbook: `docs/RUNBOOK_M94E_QUEUE_CHAOS_ALARM_PROOF.md`
- Komut: `node backend\scripts\m94e_queue_chaos_alarm_check.js`
- Probe: `node backend\scripts\m94e_queue_chaos_alarm_probe.js`
- Ana konu: autoReachedQueue için Redis unavailable, stale claim reclaim, dead-letter görünürlüğü, dedupe'li alarm ve incident-sync akışını güvenli probe ile görünür kılmak.

### M95-E0 — android apk/aab build readiness [CHECK]
- Runbook: `docs/RUNBOOK_M95E0_ANDROID_BUILD.md`
- Komut: `node mobile\scripts\m95_e0_android_build_readiness_check.js`
- Ana konu: Android APK/AAB build hazırlığını resmi runbook/check altında görünür kılmak; saha kanıtından ayrı tutmak.

### M95-E25 — mobil saha kabul checklist’i [CHECK]
- Komut: `node backend\scripts\m95_e25_mobile_field_acceptance_check.js`
- Ana konu: mobil uygulamanın saha öncesi temel kullanıcı akışlarını sade Türkçe checklist ile doğrulamak.

### M95-E26 — Android emulator smoke planı [CHECK]
- Komut: `node backend\scripts\m95_e26_android_emulator_smoke_plan_check.js`
- Ana konu: local emulator üzerinde APK profili, API base ve temel rol/smoke kanıtını tek plan altında toplamak.

### M95-E27 — Gerçek Android cihaz saha proof hazırlığı [CHECK]
- Komut: `node backend\scripts\m95_e27_real_android_device_field_proof_prep_check.js`
- Ana konu: gerçek cihaz testinden önce izin, ekran, GPS, ağ ve kanıt planını sade Türkçe hazırlık dokümanında kilitlemek.

### M96-A — driver availability local state [CHECK]
- Komut: `node mobile\scripts\m96_a_driver_availability_check.js`
- Ana konu: sürücü mola / müsaitlik / yeni iş durumunu mobil yerel state olarak görünür kılmak.

### M96-B — mobile notifications foundation [CHECK]
- Komut: `node mobile\scripts\m96_b_notifications_check.js`
- Ana konu: driver, personel, veli ve operasyon bildirim yüzeylerini mobilde tek foundation altında görünür kılmak.

### M96-C — boarding change local model [CHECK]
- Komut: `node mobile\scripts\m96_c_boarding_change_check.js`
- Ana konu: biniş değişikliği taleplerini mobil yerel istek modeli olarak görünür kılmak; backend/panel bind sonraki halkada yaşar.
- Not: operasyon readiness için ayrıca `M96-C2` check'i kullanılır.

### M96-C2 — boarding change operations readiness [CHECK]
- Komut: `node backend\scripts\m96_c2_boarding_change_ops_check.js`
- Ana konu: backend/panel/audit/notification/auto-accept görünürlüğünü doğrulamak.

### M96-D — driver change awareness [CHECK]
- Komut: `node mobile\scripts\m96_d_driver_change_awareness_check.js`
- Ana konu: sürücü değişiklik farkındalığı ve sesli uyarı katmanını mobilde görünür kılmak.

### M97 — check-in panel integrations [CHECK]
- Komut: `node backend\scripts\m97_panel_integration_check.js`
- Ana konu: room/company/school/organization/driver check-in görünürlük ve kısayollarını panel/nav katmanında güvenli biçimde restore etmek.

### M97-A — room operation board [CHECK]
- Komut: `node backend\scripts\m97_a_room_operation_panel_check.js`
- Ana konu: oda operasyon panelinde bugünkü görevler, aktif servisler, sürücü / araç durumu ve biniş değişikliği özetini tek yerde göstermek.

### M98-A — personel activation model [CHECK]
- Komut: `node mobile\scripts\m98_a_personel_activation_model_check.js`
- Ana konu: personel hesabı için kurum daveti, ilk giriş PIN/şifre değişimi ve cihaz eşleşmesi modelini görünür kılmak.

### M98-B — parent activation and link access [CHECK]
- Komut: `node mobile\scripts\m98_bcd_activation_kvkk_check.js`
- Ana konu: veli daveti, bağlantı süresi ve takip yetkisini görünür kılmak.

### M98-C — link lifetime and tracking authority [CHECK]
- Komut: `node mobile\scripts\m98_bcd_activation_kvkk_check.js`
- Ana konu: bağlantı süresi, aktif servis ve görünürlük kuralını görünür kılmak.

### M98-D — kvkk visibility matrix [CHECK]
- Komut: `node mobile\scripts\m98_bcd_activation_kvkk_check.js`
- Ana konu: rol bazlı takip görünürlüğü ve KVKK kapı kurallarını görünür kılmak.

### M98-E5 — kod + PIN gerçek kullanıcı kabul checklist’i [CHECK]
- Komut: `node backend\scripts\m98_e5_code_pin_manual_acceptance_check.js`
- Ana konu: saha/operatör gözüyle kod + PIN erişim paketinin gerçek kullanıcı kabulünü tek checklist altında doğrulamak.

### M99-KVKK-01 — mobil/web KVKK sade metin ve izin dili [CHECK]
- Komut: `node backend\scripts\m99_kvkk_01_mobile_web_plain_text_check.js`
- Ana konu: mobil ve web yüzeylerinde KVKK / izin açıklamalarının sade Türkçe dilini ve görünürlük sınırlarını kabul paketi olarak doğrulamak.

### M99-UX-01 — görünür Türkçe metin hijyeni / teknik terim taraması [CHECK]
- Komut: `node backend\scripts\m99_ux_01_visible_text_hygiene_check.js`
- Ana konu: kullanıcıya görünen metinlerde teknik / İngilizce terim taşmasını sınırlı marker setiyle doğrulamak.

### M99-A — mobile regression pack [CHECK]
- Komut: `node mobile\scripts\m99_a_mobile_regression_pack_check.js`
- Ana konu: login, role routing, token/session, bildirim, biniş değişikliği ve müsaitlik regression pack'ini tek check'te yaşatmak.

### M99-B — real scenario tests [CHECK]
- Komut: `node mobile\scripts\m99_b_real_scenario_tests_check.js`
- Ana konu: sürücü, personel, veli ve operasyon yüzeylerini gerçek senaryo pack'iyle tek check'te yaşatmak.

### M99-C — field launch readiness [CHECK]
- Komut: `node mobile\scripts\m99_c_field_launch_readiness_check.js`
- Ana konu: gerçek cihaz, zayıf ağ ve saha kanıtı hazırlığını tek check'te görünür kılmak.

### OP-01 — operation proof / service proof readonly kanıt omurgası [CHECK]
- Komut: `node backend\scripts\op_01_operation_proof_service_proof_check.js`
- Ana konu: servis kanıtı ve hizmet kanıtı için readonly özet omurgasını doğrulamak.

### OP-02 — manuel operatör kanıt notu [CHECK]
- Komut: `node backend\scripts\op_02_manual_operator_proof_note_check.js`
- Ana konu: servis/hizmet kanıtı özetine manuel not bağlayan küçük yazma katmanını doğrulamak.

### OP-03 — web servis kanıtı / manuel not küçük kartı [CHECK]
- Komut: `node backend\scripts\op_03_web_operation_proof_card_check.js`
- Ana konu: operasyon yüzeylerinde küçük servis kanıtı kartını ve manuel not formunu doğrulamak.

### OP-04 — ticari/kalite readonly köprü [CHECK]
- Komut: `node backend\scripts\op_04_proof_commercial_quality_readonly_bridge_check.js`
- Ana konu: servis kanıtı durumunu ticari ve kalite yüzeylerine readonly köprü olarak doğrulamak.

### QLT-01 — kalite puanı + sağlayıcı karşılaştırması hazırlık omurgası [CHECK]
- Komut: `node backend\scripts\qlt_01_quality_provider_readiness_check.js`
- Ana konu: OP-01 readonly omurga, OP-02 manuel not, OP-03 küçük kart ve OP-04 ticari/kalite readonly köprü üstüne kesin puan üretmeyen kalite hazırlık katmanı kurmak.

### QLT-02 — kontrollü kalite skoru taslak modeli [CHECK]
- Komut: `node backend\scripts\qlt_02_quality_draft_score_check.js`
- Ana konu: OP-01/02/03/04 kanıt hattı ve QLT-01 hazırlığı üstüne kesin puan, ranking ve settlement açmadan taslak kalite skoru üretmek.
- Not: QLT-01 hazırlık, QLT-02 taslak skor, QLT-03 kontrollü kalite inceleme kararı, QLT-04 kalite karar geçmişi / denetim izi olarak ilerler.

### QLT-03 — kontrollü kalite inceleme kararı [CHECK]
- Komut: `node backend\scripts\qlt_03_quality_review_decision_check.js`
- Ana konu: QLT-02 taslak skor üstünde yetkili karar ve tekrar kontrol akışı kurmak; kesin kalite puanı, ranking, settlement ve komisyonu açmamak.

### QLT-04 — kalite karar geçmişi / denetim izi [CHECK]
- Komut: `node backend\scripts\qlt_04_quality_review_history_check.js`
- Ana konu: QLT-03 kararlarının readonly geçmişini görünür yapmak; kesin kalite puanı, ranking, settlement ve komisyon açmamak.

### OP-04 — ticari/kalite readonly köprü [CHECK]
- Komut: `node backend\scripts\op_04_proof_commercial_quality_readonly_bridge_check.js`
- Ana konu: servis kanıtı durumunu ticari ve kalite yüzeylerine readonly köprü olarak doğrulamak.

### M0->latest static verification [RUNNER]
- Runbook: `docs/RUNBOOK_M0_LATEST_STATIC_VERIFICATION.md`
- Komut: `node backend/scripts/run_m0_latest.js --static-only --to latest --continue`
- Root alias: `npm run verify:milestones`
- Ana konu: legacy M0-Mxx check hattini repo kokunden, `.js/.cjs/.mjs` kapsamiyla ve latest milestone'a kadar tek zincirde calistirmak.

## 11) Hızlı okuma özeti
- `M0→M41`: çekirdek temel hat
- `M42→M58`: mobil / KVKK / hazırlık ön bant
- `M59→M79`: operasyon / SSOT / hot-path / acceptance anchor
- `M80→M89`: güncel canonical upper route
- `M90`: 10/10 kapanış ve canonical convergence
- `M91`: shift/agreement route preview local acceptance bandi
- `M92`: repo verification spine ve tek cati kontrol zinciri
- `M93`: queue durability proof ve autoReachedQueue görünürlük kanıtı
- `M94-E`: queue chaos/alarm proof ve güvenli runtime probe
- `M95-E0`: android apk/aab build readiness check'i
- `M95-E25`: mobil saha kabul checklist'i
- `M95-E26`: Android emulator smoke planı check'i
- `M95-E27`: gerçek Android cihaz saha proof hazırlığı check'i
- `M96-A`: driver availability local state check'i
- `M96-B`: mobile notifications foundation check'i
- `M96-C`: boarding change local model check'i
- `M96-C2`: boarding change operations readiness check'i
- `M96-D`: driver change awareness check'i
- `M97`: check-in panel integrations ve nav restore check'i
- `M98-A`: personel activation model check'i
- `M98-B`: parent activation and link access check'i
- `M98-C`: link lifetime and tracking authority check'i
- `M98-D`: kvkk visibility matrix check'i
- `M98-E5`: kod + PIN gerçek kullanıcı kabul checklist'i
- `M99-KVKK-01`: mobil/web KVKK sade metin ve izin dili check'i
- `M99-UX-01`: görünür Türkçe metin hijyeni check'i
- `QLT-01`: kalite puanı + sağlayıcı karşılaştırması hazırlık omurgası check'i
- `QLT-02`: kontrollü kalite skoru taslak modeli check'i
- `QLT-03`: kontrollü kalite inceleme kararı check'i
- `QLT-04`: kalite karar geçmişi / denetim izi check'i
- `M99-A`: mobile regression pack check'i
- `M99-B`: real scenario tests check'i
- `M99-C`: field launch readiness check'i
- `OP-01`: operation proof / service proof readonly kanıt omurgası check'i
- `OP-02`: manuel operatör kanıt notu katmanı check'i
- `OP-03`: web servis kanıtı / manuel not küçük kartı check'i
- `OP-04`: servis kanıtı durumunu ticari/kalite yüzeylerine readonly köprü check'i
- `OP-04`: servis kanıtı durumunu ticari/kalite yüzeylerine readonly köprü check'i
