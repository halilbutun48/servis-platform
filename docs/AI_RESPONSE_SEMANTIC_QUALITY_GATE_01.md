# AI RESPONSE SEMANTIC QUALITY GATE 01

Milestone: `AI-RESPONSE-SEMANTIC-QUALITY-GATE-01`

Tarih: 2026-07-20
Repo: `servis-platform`

> Bu belge docs/check milestone kaydıdır. Stage/commit/tag/push açmaz; gerçek LLM/API çağrısı yapmaz; runtime model execution açmaz.

## 1) docs/check milestone

- Canonical check: `check:airesponsesemanticqualitygate01`
- Komut: `node backend\scripts\ai_response_semantic_quality_gate_01_check.js`
- Bu gate, Sefer Abi cevaplarının semantik kalitesini deterministic olarak denetler.

## 2) Amaç

Bu milestone feature milestone değildir.

Amaç:
- teknik olarak PASS eden ama kullanıcı açısından zayıf kalan cevapları erken yakalamak
- çok genel, tekrarlı, yanlış öncelikli veya bağlamdan kopuk cevapları engellemek
- role, ekran, selected record ve güvenli aksiyon sınırı uyumunu korumak
- Next Best Action, Plan Review, Workflow Reasoning, Operation Health, Risk Scoring, Root Cause, Smart Diagnostic, Dynamic Question ve Clarifying Question ayrımını bozmayacak bir semantic kalite kapısı kurmak
- İngilizce veya system jargon sızıntısını azaltmak

## 3) Problem Statement

Teknik check’ler tek başına yeterli olabilir, ama kullanıcı deneyimi açısından şu drift’ler risklidir:

- çok genel cevap
- aynı cümleyi tekrar eden cevap
- yanlış niyet eşleşmesi
- role sınırı dışına taşan öneri
- ekran bağlamını kaçıran cevap
- selected/current record ile ilişkisiz yorum
- risk sorusuna next-step cevabı verme
- plan review sorusuna operation health cevabı verme
- diagnostic sorusuna root-cause gibi konuşma
- gereksiz netleştirme sorma
- yeterli bağlam varken belirsiz konuşma
- kullanıcıya işlem yapılmış gibi hissettiren ifade
- İngilizce / internal jargon sızıntısı

Bu gate, tam cevap eşleştirme yerine semantik marker, forbidden phrase, intent separation ve role/screen fit üzerinden çalışır.

## 4) Kapsam

Bu gate aşağıdaki direct aileleri ve public composer yollarını kapsar:

- `NEXT_BEST_ACTION`
- `PLAN_REVIEW`
- `NEXT_STEP` / workflow reasoning
- `RISK_LIST`
- `ROOT_CAUSE`
- `STATUS_HELP`
- smart diagnostic
- dynamic question
- clarifying question

Kapsanan yüzeyler:
- `/company`
- `/company/operations`
- `/company/agreements`
- `/organization`
- `/school`
- `/room/map`
- `/room/vehicles`
- `/room/shifts`
- `/room/operation-health`
- `/driver/route`
- `/personel/live`
- `/parent/live`
- `/superadmin/operations`

## 5) Gate Tasarımı

Gate şu kontrolleri yapar:

- Intent Fit: soru niyetine uygun cevap mı
- Role Fit: role sınırı doğru mu
- Screen Fit: ekran bağlamı doğru mu
- Action Safety: write-action veya otomatik işlem dili sızıyor mu
- Repetition Guard: tekrar eden kalıp cümle var mı
- Terminology Guard: internal / English jargon sızıyor mu
- Separation Guard: public reply ile reasoning assistant çıktısı ayrışıyor mu
- Allowed Question Type Guard: public `questionType` beklenen set içinde mi

## 6) Deterministic Test Design

Script, gerçek LLM çağrısı yapmadan şu kaynakları okur:
- `package.json`
- `backend/scripts/run_product_extensions_check_chain.js`
- `backend/scripts/verify_chain_01_product_extensions_check.js`
- `backend/scripts/script_harness_consolidation_01_check.js`
- `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md`
- `docs/PRIMER_SSOT.md`
- `docs/AI_RESPONSE_SEMANTIC_QUALITY_GATE_01.md`

Test yaklaşımı:
- direct builder case’leri
- integration/public composer case’leri
- fixed surface snapshots
- forbidden terminology listesi
- repetition snippet listesi
- anchor/selection preservation

## 7) Explicitly Not Changed

- gerçek LLM/API çağrısı
- runtime model execution
- UI davranışı
- backend route/service/prisma
- smoke threshold / skip / timing / PASS kriteri
- global allowlist
- runtime-data stage alma
- browser-smoke artifact stage alma
- debug.log commit etme
- stage/commit/tag/push

## 8) Validation Results

| Command | Status | Notes |
| --- | --- | --- |
| `node backend\scripts\ai_response_semantic_quality_gate_01_check.js` | PENDING | gate script and doc wiring are in place |
| `node backend\scripts\script_harness_consolidation_01_check.js --write-doc` | PENDING | harness doc refresh pending after gate pass |

## 9) Remaining Risks

- future semantic drift can reintroduce generic language if direct builders regress
- new screens must be added to the surface matrix together with their role fit rules
- broad allowlists would weaken the gate and should not be introduced
- runtime-data files must remain commit dışı
- browser-smoke artifacts must remain commit dışı

## 10) Next Recommended Milestone

`QUALITY-GATE-FINAL-01`

Bu gate, sonraki final doğrulama zincirine semantic kalite katmanı ekler; yeni ürün özelliği açmaz.
