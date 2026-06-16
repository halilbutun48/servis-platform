# SEFER ABI ALL ROLES REASONING ASSISTANT 01

Canonical check: `check:seferabiallrolesreasoningassistant01`

## Amaç
Sefer Abi bu milestone ile sadece açıklama yapan bir helper olmaz.
Role, ekran, seçili kayıt, konuşma durumu ve `interactionIntentFamily` birlikte okunur; cevaplar aynı şablona düşmeden bağlama göre değişir.

Bu katman özellikle şunları kanıtlar:
- `Bu program ne?`, `Bu program ne işe yarıyor?`, `Ben ne yapmam lazım?` gibi başlangıç sorularında doğal ve adım adım yönlendirme
- `girdim`, `yaptım`, `bulamadım`, `devam et` gibi ilerleme mesajlarında aynı bağlamı sürdürme
- `bunu sen yap`, `teklifi kabul et`, `aracı ata`, `sözleşmeyi yürürlüğe al` gibi write-action taleplerinde güvenli ret + alternatif adım
- Rol bazlı ton farkı
- Reasoning context inputs: `role + screen + selected record + conversation state + interactionIntentFamily`
- Final reply, `COPILOT-REASONING-ANSWER-COMPOSER-01` ile robotik kalıplardan temizlenir; aynı soru farklı rollerde farklı ve doğal kalır.

## Rol tonları
- `DRIVER`: kısa, saha dili, rota ve durak odaklı
- `COMPANY`: plan, teklif ve sözleşme dili
- `ROOM`: araç, sürücü, kapasite ve operasyon dili
- `SUPER_ADMIN`: sistem durumu, kalite, audit ve risk dili
- `PERSONEL` / `PARENT`: KVKK ve güvenli takip dili
- `SCHOOL` / `ORGANIZATION`: yetki kapsamı ve operasyon özeti dili

## Beklenen başlangıç yolları
- Company için: vardiya / talep oluştur -> teklif topla -> karşılaştır -> sözleşmeye hazırla
- Room için: teklifleri incele -> araç / sürücü uygunluğunu kontrol et -> kapasite / kanıt durumuna bak
- Driver için: aktif rotanı aç -> sıradaki durağı kontrol et -> güvenli yerde işlem yap
- Personel için: servis durumunu / my ride ekranını aç -> biniş noktası ve saat bilgisini kontrol et
- Parent için: yetkili öğrenci servis görünümünü aç -> canlı takip / servis durumu bilgisini kontrol et
- School için: servis kanıtı / devam / gecikme özetine bak -> yetkili okul kapsamındaki kayıtları incele
- Organization için: organizasyon servis planını ve lokasyon / katılımcı durumunu kontrol et
- Super Admin için: sistem durumu -> ticari akış -> kalite / kanıt -> audit / risk sırasıyla incele

## Guardrails
- Golden pack test/kabul içindir, reply source değildir.
- Runtime AI action açmaz.
- Tool execution açmaz.
- Write-action dispatcher açmaz.
- DB write açmaz.
- Route apply açmaz.
- Fake success açmaz.
- Backend route / service / schema açmaz.
- Prisma / schema / migration açmaz.

## Kanonik yüzeyler
- Helper: `backend/src/ai/chat/seferAbiReasoningAssistant.js`
- Composer: `backend/src/ai/chat/copilotReasoningAnswerComposer.js`
- Help composer: `backend/src/ai/chat/helpComposer.js`
- Check: `backend/scripts/sefer_abi_all_roles_reasoning_assistant_01_check.js`
