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

## Follow-up reasoning layer
- `SEFER-ABI-REASONING-ASSISTANT-01` guided task engine üzerine kurulan follow-up reasoning katmanıdır.
- `SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01` guided task engine üzerine kurulan all-roles reasoning katmanıdır; role, ekran, niyet ve ilerleme mesajı birlikte okunur.
- Role + screen + selected record + conversation state ile context-aware reasoning üretir.
- Golden pack test/kabul içindir, reply source değildir.
- Runtime AI action, tool execution, write-action dispatcher, DB write, route apply ve fake success açmaz.

## #18 screen-grounded continuation boundary

- `COPILOT-UI-ELEMENT-ANCHOR-AND-GUIDED-HIGHLIGHT-01` mevcut bu semantic/progress katmanını gerçek yetkili UI yüzeyiyle birleştirir; canonical check `check:copilotuielementanchor01`, browser acceptance `smoke:copilotuielementanchor01` ve owner `backend/src/ai/chat/copilotUiElementAnchor.js` + `web/src/components/copilot/GuidedTargetOverlay.jsx` olarak yaşar.
- Sunucu yalnızca mevcut role/screen yetkisiyle gelen `uiSurface` kanıtındaki hedefi `FOUND`, `NOT_FOUND`, `UNAUTHORIZED` veya `STALE` olarak çözer. Konuşma durumu hedef devamlılığını hatırlar ancak hiçbir zaman yetki kaynağı değildir.
- Tarayıcı hedefi semantik label/type/key ile yeniden çözer; bounded scroll, pointer-events olmayan outline ve erişilebilir status bildirimi kullanır. Hedef kaybolur, rota değişir veya state değişirse highlight temizlenir.
- Bu katman yalnız navigation/guidance'tır: iş yazımı, onay, dispatch, finansal/authorization değişikliği, force-click, tool execution ve fake success açmaz.

## #18 milestone authority boundary

- PRE-#18 kapanış kanıtı ve `v2026.09.25-pre18-immutable-closure` etiketi tarihsel/immutable kayıttır; #18 değişikliği bu kimlikleri yeniden yazmaz.
- Canlı numbered-milestone ownership/current-head kaydı `backend/scripts/lib/milestoneOwnershipAuthority.js` tarafından tek otorite olarak tüketilir. Aktif #18 manifesti yalnız kendi açık path, owner, kabul, identity ve lifecycle kayıtlarını taşır.
- Aynı path için #18 kimliği, yalnız açık `historicalOwner` + `supersedesHistoricalIdentity` kaydıyla canlı current-head kimliğini ileri alabilir. Bu PRE-#18 hash'ini değiştirmez.
- #19 ve sonraki milestone'lar aynı registry'ye yeni aktif kayıt olarak eklenir; wildcard, eski manifest toplu yenilemesi veya checker bypass kullanılmaz.
