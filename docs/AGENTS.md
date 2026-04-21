# AGENTS.md

## Repo
- Repo adı: `servis-platform`
- Ürün adı: `Vardis`
- Domain: okul/öğrenci/veli ve personel/şirket/organizasyon alanlarını birlikte taşıyan servis/taşıma platformu

## Çalışma tarzı
- Önce plan çıkar, sonra patch uygula.
- Tek görevde tek problem çöz.
- Gereksiz refactor yapma.
- İhtiyaç dışı dosya taşıma yapma.
- Büyük archive / history / overlay hareketleri yapma.
- Hot file / line count agresif temizlik bu aşamada öncelik değildir.
- Ürün davranışını bozabilecek geniş çaplı yeniden düzenleme yapma.
- En küçük güvenli değişiklik setini tercih et.
- Şüpheli durumda önce analiz ver, sonra patch öner.

## Kanonik komutlar
- Günlük resmi giriş: `npm run verify:repo`
- Resmi kapanış: `npm run verify:final`
- CI girişi: `npm run verify:ci`
- Compatibility / geniş prova: `tools\pack_living.ps1`

## Repo doğrulama omurgası
- `M91` ve `M92` repo-native verification spine korunmalıdır.
- Repo check chain ana çatıdır.
- State / manifest / check / runbook / script hizası bozulmamalıdır.
- Değişiklik sonrası mümkünse ilgili check’ler çalıştırılmalıdır.

## Ürün / domain kuralları
- “Sözleşme” terimi kullanılır.
- “Sürücünün telefon GPS'i” ifadesi kullanılır.
- Tek Guided Mode / Stepper mantığı korunur.
- Eski “durakları üret sonra durakları çek” davranışı geri getirilmez.
- Sade Türkçe, düşük bilişsel yük, az jargon korunur.

## Kritik ürün akışı
- Agreement direct create yaklaşımı korunmaz.
- Doğru akış: önce shift/vardiya, sonra “Sözleşmeye Dönüştür”.
- `sourceShiftId` mantığı korunmalıdır.
- Company direct agreement create kapalı kalmalıdır.
- Shift → sözleşme dönüşüm akışı bozulmamalıdır.

## Dokunma sınırları
Bu dosyalara dokunmadan önce ekstra dikkat gerekir:
- `backend/src/routes/agreements.js`
- `backend/src/routes/shifts/room.js`
- `backend/src/routes/shifts/company.js`
- `web/src/panels/company/GuidedPlanModal.jsx`
- `web/src/panels/shared/CopilotPanel.jsx`
- `backend/src/ai/chat/helpComposer.js`
- `backend/prisma/schema.prisma`

## Justified exception / hot file politikası
- `backend/src/ai/chat/helpComposer.js` justified exception dosyasıdır.
- `backend/prisma/schema.prisma` justified exception dosyasıdır.
- Bu dosyalarda line-count reduction hedeflenmez.
- Hot file küçültme işi ancak açıkça istenirse ve güvenli aday dosyalarda yapılır.

## Güvenli aday yaklaşımı
Hot file küçültme gerekirse önce şu tip işler tercih edilir:
- helper extraction
- section extraction
- render/state ayrımı
- local util extraction

Agresif işler yapılmaz:
- büyük çaplı yeniden mimari kurma
- business logic taşıma
- kabul akışını riske atan parçalama

## Öncelik sırası
1. Repo yeşilini koru
2. İhtiyaç-temelli ürün düzeltmeleri
3. Docs / primer / state hizası
4. Kapanış / hijyen / verify tutarlılığı
5. En son hot file küçültme

## Hijyen kuralları
- Shareable export mantığı korunmalı
- Runtime json / env / dist / artifacts yüzeyi konusunda gereksiz genişleme yapılmamalı
- Yeni local çıktı dosyaları repo içine bilinçsiz eklenmemeli
- Export ve closure politikaları zayıflatılmamalı

## Codex’ten beklenen çıktı formatı
Her görevde şu sırayı izle:
1. Kısa plan
2. Kök neden
3. En küçük güvenli değişiklik seti
4. Riskler
5. Patch özeti
6. Çalıştırılacak doğrulama komutları

## Görev istemi standardı
Kullanıcı bir görev verdiğinde:
- önce problemin sınırını netleştir
- bu görevde hangi dosyalara neden dokunacağını belirt
- görev kapsamı dışına çıkma
- “bonus refactor” yapma
- kabul kriterine göre çalış

## Kabul kriteri mantığı
Bir görev tamam sayılmadan önce:
- ilgili davranış korunmalı
- ilgili check’ler geçmeli
- state/docs/manifest hizası bozulmamalı
- gereksiz yan etki oluşmamalı
- diff mümkün olduğunca küçük kalmalı