# COPILOT GUIDED TASK ENGINE 01

Tarih: 2026-06-14
Repo: `servis-platform`

## docs/check milestone
- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:copilotguidedtaskengine01`
- Komut: `node backend\scripts\copilot_guided_task_engine_01_check.js`
- Static source of truth gerektiğinde `backend/src/ai/chat/copilotGuidedTaskEngine.js` ile taşınır; helper runtime executor değildir.

## Amaç
- `COPILOT-GUIDED-TASK-ENGINE-01` exact phrase matching'e bağlı kalmadan semantic intent family katmanını kilitler.
- Türkçe gündelik dil, kısa komut, typo, eş anlamlı ifade, fiil/isim varyasyonu, devrik cümle ve çoklu niyet birlikte değerlendirilir.
- Role + screen + task family sinyali birlikte okunur; güvenli sınır deterministic kalır.
- Runtime AI action açılmaz.
- Tool execution açılmaz.
- Write-action dispatcher açılmaz.
- DB write açılmaz.
- OSRM/geocode call açılmaz.
- Route apply açılmaz.
- Ana örnek havuzu 8 sample family + progress flow ile 72 test case içerir; ayrıca genel guided-task fallback için 4 doğrudan doğrulama vardır.

## Semantic family coverage
- `ROUTE_PREP_EXCEL`: Excel / rota hazırlığı
- `ROUTE_PREP_ADDRESS`: adres / koordinat hazırlığı
- `ROUTE_PREP_OSRM`: OSRM / rota önizleme
- `ROUTE_REVIEW_APPROVAL`: rota review / insan onayı
- `ROUTE_APPLY_BLOCKED`: rota uygulama engeli
- `IMPORT_WRITE_BLOCKED`: Excel / import write engeli
- `FAKE_SUCCESS_REQUEST_BLOCKED`: sahte başarı engeli
- `OFFER_FLOW_GUIDE`: teklif / operasyon rehberi
- `SHIFT_FLOW_GUIDE`: vardiya oluşturma rehberi
- `GENERAL_GUIDED_TASK_GUIDE`: genel görev rehberi

## Progress flow
- `Girdim` ve `Yaptım` -> `CONTINUE`
- `Devam et` -> `CONTINUE`
- `Bulamadım` -> `CLARIFY`
- `Baştan` -> `RESTART`
- Progress komutları ilgili son guided task flow'unu sürdürür; genel ekran açıklamasına düşmek yerine kısa netleştirme veya guided next-step üretir.

## General guided fallback
- `Ne yapacağımı bilmiyorum`
- `Bu programı kullanmak istiyorum`
- `Bana adım adım yardım et`
- `Nereden başlayacağım`
- Bu ifadeler tek bir exact phrase değil, genel guided-task family olarak sınıflanır ve güvenli next-step üretir.

## Guard boundary
- `runtime AI action`
- `tool execution`
- `write-action dispatcher`
- `DB write`
- `OSRM call`
- `geocode execute`
- `route apply`
- `dispatch apply`
- `fake success`
- `no silent execution`
- `no hidden background action`

## Trust copy
- Underpromise, overdeliver stratejisi korunur.
- Nihai karar kullanıcıdadır.
- Kritik işlerde insan onayı gerekir.
- Public copy testle kanıtlanmamış execution vaadi kurmaz.
