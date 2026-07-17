# COPILOT OPERATION HEALTH ENGINE 01

## Purpose
Operasyonun canlı durumunu güvenli ve Türkçe biçimde özetlemek için kullanılır. Bu yardımcı, hangi alanın sağlıklı göründüğünü, hangi alanın eksik kaldığını ve önce nereye bakılması gerektiğini anlatır.

## Scope
Bu milestone sadece okur. Yazma yok, araç çağrısı yok, veritabanı yazımı yok, rota uygulama yok, sahte başarı yok.

## Supported roles/screens
- Company / Operations
- Company / Shifts
- Room / Operation Health
- Room / Shifts
- Room / Map
- Room / Vehicles
- Driver / Route
- Personel / Live
- Parent / Live
- Super Admin / Operations
- Super Admin / Observability
- Super Admin / Trust Quality
- School / Operations
- Organization / Operations

## Health signals
- eksik atama
- güncel olmayan konum bilgisi
- eksik rota/durak
- gecikme ihtimali
- kapasite belirsizliği
- vardiya saati belirsizliği
- atanmış servis yokluğu
- araç/sürücü eşleşmesi
- canlı takip güvenilirliği
- yetki/veri kapsamı

## Examples
- “Operasyon sağlığı nasıl?” -> önce vardiya, atama ve son konum birlikte kontrol edilir.
- “Bugünkü durum iyi mi?” -> eksik atama ve güncel olmayan konum bilgisi ayrı okunur.
- “Hangi servis sorunlu?” -> önce sorunlu kayıtlar ve önce bakılacak alan söylenir.
- “Canlı takip güvenilir mi?” -> konum sinyali güncel değilse kesin konuşulmaz.

## No write-action boundary
Bu yardımcı asla “yaptım”, “oluşturdum”, “başlattım”, “gönderdim”, “kabul ettim”, “uyguladım”, “atadım”, “sildim”, “güncelledim”, “kaydettim” gibi yazma/işlem fiillerini kullanmaz. İfade her zaman “önce kontrol edilmeli”, “doğrulanmalı” ve “insan onayı gerekir” ekseninde kalır.

## Terminology boundary
Görünür cevaplarda İngilizce ve sistem içi jargon yüzeye çıkmaz. Terimler Türkçe karşılıklarla korunur: konum sinyali, son konum bilgisi, açık sorun, riskli cihaz, sonraki güvenli kontrol, insan onayı, operasyon kanıtı.

## Regression protection
- Workflow reasoning ayrı kalır.
- Plan review ayrı kalır.
- Risk scoring ayrı kalır.
- Root cause ayrı kalır.
- Smart diagnostic ayrı kalır.
- Dynamic question ayrı kalır.
- Clarifying question ayrı kalır.
- Route review ayrı kalır.
- Intent routing ve helper wiring minimum kalır.
- Help composer 6900 satır altı kalır.
- Conversation operation health helper 1000 satır altı kalır.

## Validation results
- `check:copilotoperationhealthengine01`: pending
- `runtimeCases`: pending
- `testedCases`: pending
- `passCount`: pending
- `failCount`: pending
- `no-write-action assertions`: pending
- `terminology assertions`: pending
- `regression separation`: pending
- `health signal assertions`: pending

## Known limitations
- Bu yardımcı gerçek operasyonu uygulamaz.
- Eksik veride kesin sonuç üretmez.
- Yetki dışı kayıtları varsaymaz.
- Konum sinyalini tek başına kesin kanıt saymaz.

## Next milestone recommendation
Plan ve operasyon ayrımı korunduktan sonra plan review acceptance zincirini ve hot-file split guard’ını birlikte yeniden doğrula.

## Bridge files
- `backend/src/ai/chat/helpComposer.js`
- `backend/src/ai/chat/intentRouter.js`
- `backend/src/ai/chat/answerQualityPolicy.js`
- `backend/src/ai/chat/screenStateAnalyzer.js`
- `backend/src/ai/chat/seferAbiReasoningAssistant.js`
- `backend/src/ai/chat/conversationTaskStateResponses.js`

## Canonical check
Canonical check: `check:copilotoperationhealthengine01`

## Static helper
`backend/src/ai/chat/conversationOperationHealthEngine.js`
