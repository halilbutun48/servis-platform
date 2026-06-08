# UX-COMPANY-PERSONEL-ACCESS-MOBILE-PARITY-01

Kapsam: `/company/personel-access` ve `/organization/personel-access`.

Sorun:
- Mobil ekranda sağdaki "Erişim listesi" paneli viewport dışında kalıyordu.
- Desktop iki kolon düzeni mobile taşınca form ve liste yan yana sıkışıyordu.
- Authenticated shell logo alanı da mobilde paneli gereğinden fazla aşağı itiyordu.

Hedef çözüm:
- Mobilde tek kolon, okunur kart/list düzeni.
- "Personel erişimi oluştur" kartı üstte.
- "Erişim listesi" formun altında tam genişlikte.
- Desktop iki kolon düzeni korunur.
- Sefer Abi launcher son kart ve aksiyonları kapatmaz.

Uygulanan yüzey:
- `web/src/panels/company/PersonelAccessPanel.jsx`
- `web/src/index.css`

Mobil kabul notları:
- Personel erişimi özeti kompakt kaldı.
- Erişim listesi tablo yerine kart/list halinde gösteriliyor.
- Kullanıcı kodu ve geçici PIN sadece güvenli biçimde gösteriliyor.
- Ham PIN listede gösterilmiyor.
- Yatay scroll veya zoom zorunlu değil.
- Authenticated shell logo mobilde kompakt.
- Desktop bozulmadı.

## Görsel doğrulama

- Desktop ve mobile proof shot'lar aynı route üzerinde alındı.
- Mobilde ilk viewport, erişim listesi alanı ve son kart ayrıca kontrol edildi.

Sınırlar:
- Backend route/service/schema değişmiyor.
- Prisma/schema/migration yok.
- `runtime-data/browser-smoke` commit dışı kalır.
- Auth/session/role logic değişmedi.
- Brand/login milestone'u ile Company Agreements mobile parity ayrı tutulur.

Doğrulama:
- `npm run check:uxcompanypersonelaccessmobileparity01`
- Desktop ve mobile görselleri `backend/artifacts/browser-smoke/UX_COMPANY_PERSONEL_ACCESS_MOBILE_PARITY_01/visual-qa/` altında üretildi.

Not:
- Bu milestone yeni business flow eklemez; yalnızca mobil yerleşim ve okunabilirlik düzeltir.
