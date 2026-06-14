# SEFER ABI REASONING ASSISTANT 01

Tarih: 2026-06-14
Repo: `servis-platform`

## docs/check milestone
- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:seferabireasoningassistant01`
- Komut: `node backend\scripts\sefer_abi_reasoning_assistant_01_check.js`
- Static source of truth: `backend/src/ai/chat/seferAbiReasoningAssistant.js`

## Amaç
- `SEFER-ABI-REASONING-ASSISTANT-01` Sefer Abi’yi sadece semantic intent helper olmaktan çıkarıp role + screen + selected record + conversation state okuyan reasoning assistant katmanına yükseltir.
- Golden pack test/kabul içindir, reply source değildir.
- Role-specific dil, repetition control, clarifying question, safe refusal ve alternative öneri korunur.

## Okunan sinyaller
- Rol
- Ekran yolu ve ekran etiketi
- Seçili kayıt
- Seçili alanlar ve rozetler
- Conversation state
- Analysis / context priority / guided task meta
- Güvenlik sınırı ve insan onayı ihtiyacı

## Role profilleri
- `SUPER_ADMIN`: stratejik özet, risk ve audit
- `COMPANY`: plan, vardiya, sözleşme, veri hazırlığı
- `ROOM`: araç, sürücü, kapasite, kalite, operasyon hazırlığı
- `DRIVER`: kısa, saha dili, aktif rota ve check-in
- `PERSONEL`: sade, servis takibi, kişisel bilgi ve KVKK sınırı
- `PARENT`: sade, çocuk servisi, takip ve KVKK sınırı
- `SCHOOL`: plan, kanıt, servis düzeni, onay sınırı
- `ORGANIZATION`: plan, kanıt, servis düzeni, onay sınırı

## Reasoning modes
- `PASS_THROUGH`
- `CONTEXTUAL_REASONING`
- `CLARIFYING_QUESTION`
- `SAFE_REFUSAL_WITH_ALTERNATIVE`
- `REPETITION_CONTROL`

## Guard boundary
- Runtime AI action açmaz.
- Tool execution açmaz.
- Write-action dispatcher açmaz.
- DB write açmaz.
- OSRM call açmaz.
- Geocode execute açmaz.
- Route apply açmaz.
- Dispatch apply açmaz.
- Fake success açmaz.
- İnsan onayı olmadan silent execution yapmaz.

## Public promise
- Sefer Abi hazırlar, açıklar ve güvenli yön gösterir.
- Gerçek execute, tool call ve write-action vaadi yoktur.
- Belirsizlik varsa kısa netleştirme sorusu sorar.
- Kritik işlerde insan onayı korunur.
- Underpromise / overdeliver çizgisi korunur.

## Golden pack notu
- Golden pack test/kabul içindir, reply source değildir.
- Güvenli validation hattı `qualityScorer.js` üzerinden test edilir.

## Sonraki güvenli hatlar
- `COPILOT-GUIDED-TASK-ENGINE-01`
- `UX-COPILOT-SMART-CHIPS-01`
- `UX-COPILOT-PERSONA-01`
- `UX-COPILOT-TERMINAL-01`
