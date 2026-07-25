# SUPPLIER-OFFER-COLLECT-01 — insan onaylı teklif toplama hazırlığı

Tarih: 2026-07-25
Repo: `servis-platform`

## docs/check milestone
- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:supplieroffercollect01`
- Komut: `node backend\scripts\supplier_offer_collect_01_check.js`
- Static source of truth gerektiğinde `backend/src/ai/chat/supplierOfferCollect.js` ile taşınır; helper runtime executor değildir.

## 1) Amaç
- `SUPPLIER-MATCHING-01` sonrasında teklif toplama hazırlığı ve offer intake planını kilitler.
- Supplier matching çıktısını offer collection inputuna dönüştürür.
- Tedarikçiden istenecek teklif alanlarını, eksik alanları ve insan onayı gereken sınırları görünür kılar.
- Bu milestone yalnızca docs/check/helper seviyesindedir.
- DB persistence, audit event write ve backend write route açmaz.
- Gerçek teklif toplama, RFQ send, supplier contact veya offer accept/reject açmaz.
- Human approval, guard ve audit log zorunludur.

## 2) Kanonik akış
- `COPILOT-RFQ-PREP-01`
- `SUPPLIER-MATCHING-01`
- `SUPPLIER-OFFER-COLLECT-01`
- `COPILOT-OFFER-ANALYSIS-01`
- `COPILOT-OFFER-RECOMMENDATION-01`
- `COPILOT-SHIFT-TO-AGREEMENT-PREP-01`
- `COPILOT-DISPATCH-ACTION-PREP-01`

## 3) Offer collection input summary
- RFQ türü
- Kısa liste / aday tedarikçiler
- Hizmet kapsamı
- Bölge / il / ilçe
- Başlangıç tarihi
- Gün / periyot / saat / vardiya bilgisi
- Yolcu / personel / öğrenci sayısı
- Araç kapasitesi ihtiyacı
- SLA / kalite beklentisi
- Belge / ruhsat / güvenlik gereksinimi

## 4) Offer request field model
- Tedarikçi opaque ref
- Tedarikçi label
- Teklif fiyatı
- Fiyat kapsamı
- Dahil kalemler
- Hariç kalemler
- Araç kapasitesi
- Araç tipi
- Başlangıç uygunluğu
- Vardiya / saat uygunluğu
- Belge / ruhsat uygunluğu
- Sigorta / güvenlik şartları
- SLA / kalite taahhüdü
- Geçerlilik süresi
- Ek notlar
- Eksik / belirsiz alanlar

## 5) Offer collection status draft
- supplierRef
- supplierLabelMasked
- collectionState=pending / missing_fields / received_draft / ready_for_analysis / blocked
- missingOfferFields
- riskNotes
- nextQuestionsForSupplier
- readinessScore
- humanReviewRequired=true
- draftOnly=true
- notRequested=true
- notContacted=true
- notSent=true
- notAccepted=true
- notRejected=true
- approvalRequired=true

## 6) Offer intake table draft
- Aday tedarikçi
- Teklif durumu
- Eksik alanlar
- Fiyat / kapsam bilgisi, sadece fixture / maskeli veri ise
- Riskler
- Sorulacak ek sorular
- Değerlendirme için hazır mı?
- İnsan onayı notu
- Teklif intake taslağıdır; insan onayı olmadan iletişim, kabul veya ret yapılmaz.

## 7) Safety / boundary
- `draftOnly=true`
- `notRequested=true`
- `notContacted=true`
- `notSent=true`
- `notAccepted=true`
- `notRejected=true`
- `approvalRequired=true`
- `executionState=offer_collect_draft_only / not_requested / not_contacted / not_executed`
- `nextSafeStep=teklif toplama planını kontrol edip insan onayına sunmak`
- Henüz teklif istenmedi / hiçbir tedarikçiye mesaj gönderilmedi / teklif kabul edilmedi / sadece ön hazırlık.
- Supplier/provider contact açılmaz.
- RFQ send açılmaz.
- Offer collect execute açılmaz.
- Offer accept/reject açılmaz.
- Messaging/email/SMS/push açılmaz.
- Provider credential management açılmaz.
- Agreement/dispatch/route/payment write-action açılmaz.
- Audit event yazılmaz.
- Backend route/service/schema genişlemesi yok.
- Prisma/schema/migration yok.
- No production DB.
- No destructive query.
- No route/service/prisma diff.

## 8) Türkçe visible answer
- Teklif toplama planını hazırladım; henüz hiçbir tedarikçiden teklif istenmedi.
- Tedarikçilerle iletişim kurulmadı ve mesaj gönderilmedi.
- Teklif istemek veya kabul/ret yapmak için insan onayı gerekir.
- Eksik teklif alanları: fiyat kapsamı, başlangıç uygunluğu, araç kapasitesi.
- Sıradaki güvenli adım: teklif toplama planını kontrol edip onaya sunmak.

## 9) Static helper
- `backend/src/ai/chat/supplierOfferCollect.js`
- Runtime execution yoktur.
- Tool execution yoktur.
- Write-action dispatcher yoktur.
- Prisma/schema/migration yoktur.
- Pure deterministic helper export'ları:
  - `detectSupplierOfferCollectIntent(input)`
  - `buildSupplierOfferCollectInput(matchingDraft, context)`
  - `buildSupplierOfferRequestFieldModel(offerDraft)`
  - `scoreSupplierOfferReadiness(offerDraft, context)`
  - `buildSupplierOfferCollectionStatusDraft(offerDraft, context, index)`
  - `buildSupplierOfferIntakeTableDraft(statusMatrix)`
  - `getSupplierOfferMissingFields(offerDraft, context)`
  - `buildSupplierOfferQuestionSet(statusMatrix)`
  - `composeSupplierOfferCollectAnswer(context)`
  - `maskSupplierOfferSensitiveValue(value)`
  - `normalizeSupplierOfferCollectField(field, value)`
- Helper yalnız static / fixture veri ile çalışır.
- Helper raw token, credential, cookie, password, GPS trace veya raw PII üretmez.
- Helper insan onayı olmadan dış dünya aksiyonu üretmez.

## 10) What is not changed
- Backend route/service/prisma genişlemesi yok.
- Production DB yok.
- Real supplier/provider data yok.
- Real offer/price verisi yok.
- Messaging/email/SMS/push yok.
- Offer collect / offer accept-reject yok.
- Agreement/dispatch/route/payment execute yok.
- User/admin write yok.

## 11) Validation results
- `offerCollectionInputSummary`
- `offerRequestFieldModelSummary`
- `collectionStateSummary`
- `intakeTableSummary`
- `safetyBoundarySummary`
- `turkishVisibleSummary`
- `chainWiringSummary`
- `smokeThresholdSummary`
- `commitExternalSummary`
- `prismaSummary`
- `offerCollectionInputSummary=2 aday; RFQ türü, hizmet kapsamı, bölge, başlangıç, vardiya, kapasite, SLA ve belge gereksinimi görünür`
- `offerRequestFieldModelSummary=16 alan; fiyat, kapsam, dahil/hariç, kapasite, araç, başlangıç, vardiya, belge, sigorta, SLA ve geçerlilik görünür`
- `collectionStateSummary=pending / missing_fields / received_draft / ready_for_analysis / blocked`
- `intakeTableSummary=3 aday; teklif durumu, eksik alanlar, riskler, sorular ve insan onayı görünür`
- `safetyBoundarySummary=draftOnly=true / notRequested=true / notContacted=true / notSent=true / notAccepted=true / notRejected=true / approvalRequired=true`
- `turkishVisibleSummary=Teklif toplama planını hazırladım; henüz hiçbir tedarikçiden teklif istenmedi. | Tedarikçilerle iletişim kurulmadı ve mesaj gönderilmedi. | Teklif istemek veya kabul/ret yapmak için insan onayı gerekir. | Eksik teklif alanları: fiyat kapsamı, başlangıç uygunluğu, araç kapasitesi. | Sıradaki güvenli adım: teklif toplama planını kontrol edip onaya sunmak.`
- `chainWiringSummary=package.json + runner + verify chain + harness check/doc + guide + primer + roadmap`
- `smokeThresholdSummary=product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none`
- `commitExternalSummary=runtime-data, browser-smoke ve debug.log commit dışı kalır; stage stays empty`
- `prismaSummary=No route/service/prisma diff; no production DB; no schema/migration; read-only only`
- `PASS SUPPLIER-OFFER-COLLECT-01`

## 12) Remaining risks
- Static fixture coverage sınırlıdır.
- Human approval olmadan teklif isteme veya teklif gönderme açılmamalıdır.
- Supplier/provider contact ve RFQ send sınırı kapalı kalmalıdır.

## 13) Next recommended milestone
- `COPILOT-OFFER-ANALYSIS-01`
- `COPILOT-OFFER-RECOMMENDATION-01`
- `COPILOT-SHIFT-TO-AGREEMENT-PREP-01`

## Not
- Bu belge sadece docs/check/helper kilididir.
