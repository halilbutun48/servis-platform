# SEFER ABI TURKISH USER FACING TERMINOLOGY AUDIT 01

Tarih: 2026-07-12
Repo: `servis-platform`

## docs/check milestone
- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:seferabiturkishterminology01`
- Komut: `node backend\scripts\sefer_abi_turkish_user_facing_terminology_01_check.js`
- Static source of truth: `backend/src/ai/chat/helpComposer.js`
- Reasoning surface: `backend/src/ai/chat/seferAbiReasoningAssistant.js`

## Amaç
- Sefer Abi’nin kullanıcıya görünen cevaplarında İngilizce, teknik ve sistem içi terminolojiyi sade Türkçe kullanıcı diliyle değiştirir.
- `ETA`, `GPS`, `offline`, `stale`, `fallback`, `selected record`, `root cause`, `diagnostic`, `risk scoring`, `task-state`, `intent`, `chip`, `workflow`, `screen purpose`, `next best action`, `safe alternative`, `active segment`, `completed segment`, `live decision`, `route binding`, `status`, `warning`, `error` ve `blocker` gibi görünür sızıntıları engeller.
- `ETA` için `tahmini varış süresi`, `Son GPS` için `son konum bilgisi`, `GPS` için `konum sinyali / konum bilgisi`, `safe alternative` için `önce şunu kontrol et` çizgisini korur.
- `Güvenli alternatif` ifadesi kullanıcı cevabında görünmez; güvenli yönlendirme açık Türkçe ile verilir.
- `Mavi aktif parça` / `Yeşil parça` açıklamasıyla rota çizgisinin renk ayrımını Türkçe ve kullanıcıya açık tutar.
- 80-case matrix ile SUPER_ADMIN, COMPANY, ROOM, DRIVER, PERSONEL, PARENT, SCHOOL ve ORGANIZATION yüzeylerinde terminoloji temizliğini doğrular.

## Kapsanan yüzeyler
- `SUPER_ADMIN`
- `COMPANY`
- `ROOM`
- `DRIVER`
- `PERSONEL`
- `PARENT`
- `SCHOOL`
- `ORGANIZATION`
- `driver/today`
- `driver/route`
- `room/map`
- `room/shifts`
- `room/vehicles`
- `personel/live`
- `personel/my`
- `parent/live`

## Guard boundary
- Runtime AI action açmaz.
- Tool execution açmaz.
- Write-action dispatcher açmaz.
- DB write açmaz.
- Route apply açmaz.
- Fake success açmaz.

## Not
- Bu audit, kullanıcıya görünen kopyanın Türkçe kalmasını denetler; kod identifier, enum, API field, route, data-testid, CSS class ve test/script adlarını değiştirmez.
- Büyük dosyalara yeni behavior logic yığmaz; görünür terminoloji normalizasyonu küçük ve hedefli kalır.
