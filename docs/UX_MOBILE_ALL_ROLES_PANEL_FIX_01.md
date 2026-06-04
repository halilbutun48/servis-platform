# UX-MOBILE-ALL-ROLES-PANEL-FIX-01

Tarih: 2026-06-04
Repo: `servis-platform`
Branch snapshot: `m90d1_web_lint_inventory`

> Bu belge, `UX-MOBILE-ALL-ROLES-PANEL-FIX-01` milestone'unun panel bazlı mobil kullanılabilirlik düzeltme notudur. Amaç, mobil web shell düzeltmesinden sonra tüm ana rol panellerini first viewport, drawer, launcher ve overflow açısından tek tek sıkılaştırmaktır.

## 1) Amaç

Bu milestone ürün/business flow açmaz. Backend route/write-path, schema/migration, Playwright runner policy ve coverage matrix check sınırlarını değiştirmez.

Amaç, mobil shell sonrası şu sinyalleri panel bazında toparlamaktır:
- first viewport içeriği görünür olsun
- drawer / NavDock içerik üstüne binmesin
- Sefer Abi launcher ana CTA'ları kapatmasın
- ana aksiyonlar tıklanabilir kalsın
- horizontal overflow kontrol altında kalsın
- sticky header / tab yoğunluğu okunabilir kalsın
- empty / loading / error state'ler mobilde okunur kalsın

## 2) Rol kapsamı

Bu fix şu roller için geçerlidir:
- `SUPER_ADMIN`
- `ROOM`
- `COMPANY`
- `DRIVER`
- `PERSONEL`
- `SCHOOL`
- `ORGANIZATION`

## 3) Uygulanan düzeltmeler

- `web/src/index.css` içinde mobil drawer genişliği ve backdrop boşluğu sıkılaştırıldı.
- `web/src/index.css` içinde table overflow ve content clearance iyileştirildi.
- `web/src/panels/superadmin/SuperAdminPanel.jsx` içinde detay sekmeleri hızlı erişimden önce okunur hale çekildi.
- `web/src/panels/superadmin/OperationsPanel.jsx` içinde sekme bandı özet bandından önce görünür hale çekildi.
- `web/src/panels/room/CommercialFlowPanel.jsx` içinde sekmeler summary strip önüne alındı.
- `web/src/panels/company/OperationsPanel.jsx` içinde sekmeler mini stat satırından önce gösterildi.
- `web/src/panels/school/OperationsPanel.jsx` içinde sekmeler mini stat satırından önce gösterildi.
- `web/src/panels/company/CompanyShiftsPanelTrackView.jsx` içinde sekmeler sticky filtre önüne çekildi.
- `web/src/panels/personel/LivePanel.jsx` içinde sekmeler biniş değişikliği kartından önce gösterildi.

## 4) Kabul hedefi

Current audit baseline:
- `PASS 45`
- `PASS- 37`
- `UX-FIX 0`
- `BLOCKER 0`
- `NOT-FOUND 0`

Fix hedefi:
- `UX-FIX 0` korunsun
- `BLOCKER 0` korunsun
- `NOT-FOUND 0` korunsun
- `PASS- 19` panel bazında listelensin
- mümkünse `PASS-` daha da azaltılsın

## 5) Mobil kabul

Panel bazlı kontrol listesi:
- ilk viewport'ta panel içeriği görünüyor mu
- sidebar / NavDock içeriği kapatıyor mu
- Sefer Abi launcher CTA kapatıyor mu
- ana aksiyon butonları tıklanabilir mi
- tablo / kart taşması var mı
- sticky header / tab yoğunluğu içeriği boğuyor mu
- empty / loading / error state mobilde okunabilir mi

## 6) Referanslar

Bu fix, aşağıdaki çalışmalarla birlikte okunur:
- `UX-MOBILE-WEB-SHELL-CLARITY-01`
- `UX-MOBILE-ALL-ROLES-PANEL-AUDIT-01`

## 7) Sınırlar

- Runtime-data commit dışı kalır.
- Browser-smoke commit dışı kalır.
- `backend route/write-path` değişmez.
- `Schema/migration` yok.
- `Playwright runner policy` değişmez.
- `Coverage matrix check` değişmez.
- Bu milestone yeni business flow eklemez.

## 8) Sonraki doğru işlem

Bu düzeltme sonrası tekrar:
1. `npm run smoke:uxmobileallrolespanelaudit01`
2. `npm run check:uxmobileallrolespanelfix01`
3. `npm run verify:final`

Eğer hedefin üstüne inersek, panel bazlı kalan `PASS-` bucket'ları daha da azaltmak için ikinci tur daraltma yapılır.
