# RUNBOOK — PROJECT_SPEC_V1 / 16 GELECEK GUCLENDIRME YONU KAPSAM HARITASI

Bu runbook, `docs/PROJECT_SPEC_V1.md` icindeki `## 16. Gelecek Guclendirme Yonu` maddelerini repo icindeki gercek karsiliklariyla esler.

## Onemli kural
Bu repo **fonksiyon-bazli** check/runbook modeliyle degil, **milestone / feature-family** modeliyle yasar.

Yani dogru soru:
- "Her fonksiyonun ayri check'i var mi?" degil,
- "Bu urun alaninin resmi milestone/check/runbook izi var mi?" olmalidir.

## Kapsam haritasi

### 1) Gozlemleme ve saha teshis katmani
- Birincil karsilik: `M59`
- Kanit:
  - `docs/MILESTONE_M59_OBSERVABILITY_FIELD_DIAGNOSTICS.md`
  - `docs/RUNBOOK_M59_OBSERVABILITY_FIELD_DIAGNOSTICS.md`
  - `backend/scripts/m59_observability_field_diagnostics_check.js`
  - `backend/src/ops/observabilityManifest.js`
  - `web/src/panels/superadmin/ObservabilityPanel.jsx`
- Durum: **var / iskelet+gercek veri karisimi**

### 2) Saha acceptance merkezi
- Birincil karsilik: `M60`
- Kanit:
  - `docs/MILESTONE_M60_FIELD_ACCEPTANCE_CENTER.md`
  - `docs/RUNBOOK_M60_FIELD_ACCEPTANCE_CENTER.md`
  - `backend/scripts/m60_field_acceptance_center_check.js`
  - `backend/src/routes/fieldAcceptance.js`
  - `web/src/panels/superadmin/FieldAcceptanceCenter.jsx`
- Durum: **var / resmi green degil**

### 3) Milestone / SSOT hizasi
- Birincil karsilik: `M61`
- Kanit:
  - `docs/MILESTONE_M61_SSOT_MILESTONE_ALIGNMENT.md`
  - `docs/RUNBOOK_M61_SSOT_MILESTONE_ALIGNMENT.md`
  - `backend/scripts/m61_ssot_milestone_alignment_check.js`
  - `backend/src/routes/ssotAlignment.js`
  - `web/src/panels/superadmin/SsotAlignmentPanel.jsx`
- Durum: **var**

### 4) Daha dogal ve baglamli copilot
- Birincil karsilik: `M64`
- Kanit:
  - `docs/MILESTONE_M64_NATURAL_COPILOT_LAYER.md`
  - `docs/RUNBOOK_M64_NATURAL_COPILOT_LAYER.md`
  - `backend/scripts/m64_natural_copilot_layer_check.js`
  - `backend/src/ops/naturalCopilotManifest.js`
  - `web/src/panels/superadmin/NaturalCopilotPanel.jsx`
- Durum: **var / kismi**
- Not: `natural_reply` ve `short_memory` aktif; `why_blocked`, `next_step`, `simplify`, `feedback` alanlari hala `PLANNED`.

### 5) Copilot geri bildirim ve dogal dil katmani
- Birincil karsilik: `M64`
- Ikinci kanit: `buildCopilotFeedbackTemplate()`
- Kanit:
  - `backend/src/ops/naturalCopilotManifest.js`
  - `backend/src/routes/naturalCopilot.js`
  - `web/src/panels/superadmin/NaturalCopilotPanel.jsx`
- Durum: **var / kismi**
- Not: geri bildirim secenekleri ve template var; panel-genis geri bildirim huni modeli ayri bir sonraki adimdir.

### 6) Cihaz saglik gorunurlugu
- Birincil karsilik: `M59`
- Kanit:
  - `backend/src/ops/observabilityManifest.js`
  - `backend/src/routes/observability.js`
  - `web/src/panels/superadmin/ObservabilityPanel.jsx`
- Durum: **var / kismi**

### 7) GPS guven skoru
- Birincil karsilik: `M59`
- Kanit:
  - `backend/src/ops/observabilityManifest.js`
  - `web/src/panels/superadmin/ObservabilityPanel.jsx`
- Durum: **var / kismi**

### 8) Vardiya olay zaman cizgisi
- Birincil karsilik: `M59`
- Ikincil karsilik: `M78 operasyon dogrulama` omurgasi
- Kanit:
  - `backend/src/ops/observabilityManifest.js`
  - `docs/MILESTONE_M78_3_OPERASYON_DOGRULAMA_OZET_FILTRE_KATMANI.md`
  - `docs/RUNBOOK_M78_3_OPERASYON_DOGRULAMA_OZET_FILTRE_KATMANI.md`
- Durum: **var / kismi**

### 9) Operasyon kalite paneli
- Birincil karsilik: `M78.1 / M78.2 / M78.3 operasyon dogrulama hatti`
- Ikincil karsilik: `M63 trust / quality`
- Kanit:
  - `docs/MILESTONE_M78_1_OPERASYON_DOGRULAMA_YUZEYI.md`
  - `docs/MILESTONE_M78_2_OPERASYON_DOGRULAMA_KAYIT_KATMANI.md`
  - `docs/MILESTONE_M78_3_OPERASYON_DOGRULAMA_OZET_FILTRE_KATMANI.md`
  - `web/src/panels/superadmin/OperationVerificationPanel.jsx`
  - `backend/src/ops/operationVerificationManifest.js`
- Durum: **var**

### 10) Hizmet alan kurum degerlendirme sistemi
- Birincil karsilik: `M63`
- Kanit:
  - `docs/MILESTONE_M63_TRUST_QUALITY_SERVICE_EVALUATION.md`
  - `docs/RUNBOOK_M63_TRUST_QUALITY_SERVICE_EVALUATION.md`
  - `backend/scripts/m63_trust_quality_service_evaluation_check.js`
  - `backend/src/ops/trustQualityManifest.js`
- Durum: **var / kismi**

### 11) Saglayici kalite / guven puani
- Birincil karsilik: `M63`
- Kanit:
  - `backend/src/ops/trustQualityManifest.js`
  - `backend/src/ops/serviceEvaluationStore.js`
  - `web/src/panels/superadmin/TrustQualityPanel.jsx`
- Durum: **var / kismi**

### 12) Ticari omurga gorunurlugu
- Birincil karsilik: `M62`
- Kanit:
  - `docs/MILESTONE_M62_COMMERCIAL_CORE_STRENGTHENING.md`
  - `docs/RUNBOOK_M62_COMMERCIAL_CORE_STRENGTHENING.md`
  - `backend/scripts/m62_commercial_core_strengthening_check.js`
  - `backend/src/routes/commercialCore.js`
  - `web/src/panels/superadmin/CommercialCorePanel.jsx`
- Durum: **var**

## Gercek bosluk ozeti
Bu taramaya gore Section 16 icin en kritik gercek bosluklar:

1. **Tek nokta coverage check'i yoktu**
   - Section 16 maddelerini milestone/check/runbook/panel karsiliklariyla bir arada dogrulayan resmi check yoktu.

2. **M84 icin milestone dokumani eksikti**
   - `m84check` ve runbook vardi; ama `docs/MILESTONE_M84_FIELD_FEEDBACK_LOOP.md` yoktu.

3. **Panelden Super Admin'e ortak geri bildirim huni modeli tam acilmamis**
   - mevcut altyapi:
     - `backend/src/ops/fieldFeedbackLoop.js`
     - `backend/src/routes/pilotLaunchGate.js`
     - `web/src/panels/superadmin/PilotLaunchGatePanel.jsx`
   - mevcut roller:
     - `SUPER_ADMIN`, `ROOM`, `COMPANY`, `DRIVER`
   - eksik alan:
     - tum panel ailelerinden tek bir `gorus / oneri / sikayet` giris hunisi
     - `PERSONEL` ve `PARENT` tarafinda gorunur giris noktasi

## Panelden Super Admin'e geri bildirim yonu
Bu repo icin en guvenli sonraki urun yonu, sifirdan yeni bir sikayet sistemi yazmak degil; mevcut `M84 saha geri bildirim dongusu` altyapisini genisletmektir.

Onerilen minimum yon:
- her ana panel ailesine tek bir mini giris:
  - `Gorus bildir`
  - `Oneri gonder`
  - `Sikayet / sorun bildir`
- payload alanlari:
  - `title`
  - `detail`
  - `reportedByRole`
  - `surface`
  - `relatedPath`
  - `severity`
  - `category`
- Super Admin tarafi:
  - ilk asamada mevcut `PilotLaunchGatePanel` uzerinden izlenebilir
  - ikinci asamada ayri `SuperAdmin Feedback Inbox` paneline ayrilabilir

Bu yon, yeni bir veri modeli acmadan mevcut M84 kayit omurgasini yeniden kullanir.

## Karar
- Section 16 maddelerinin buyuk bolumu repo icinde **karsiliksiz degil**.
- Ama bunlarin tamami ayni olgunluk seviyesinde degildir.
- En dogru okuma:
  - **var ve resmi**: M61, M62, M78 operasyon kalite, M65 launch gate
  - **var ama kismi / scaffold**: M59, M60, M63, M64
  - **yeni resmi yon olarak acilabilir**: panel-geneli Super Admin geri bildirim hunisi

## Kanonik komut
- `npm --prefix backend run spec16check`
