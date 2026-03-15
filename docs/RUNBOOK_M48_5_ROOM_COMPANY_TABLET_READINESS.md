# RUNBOOK — M48.5 ROOM / COMPANY TABLET READINESS

Tarih: 2026-03-15  
Timezone: Europe/Istanbul

## Amaç
`M48.5`, Room / Company için aynı web uygulamasını tablet kullanımında daha rahat hale getiren ilk foundation adımıdır.

Bu adım:
- ayrı native room/company uygulaması açmaz
- mevcut web panelini tablet kullanımında optimize eder
- ana ekran dolaşımı için kısa işlem alanı ekler
- Room / Company tarafında yatay tablet kullanımını hedefler

## Kapsam
Bu foundation ile gelenler:
- AppShell içinde Room / Company için tablet odaklı kabuk sınıfı
- tablet görünümünde kısa işlem barı
- Room için hızlı: Canlı Takip / Teklifler / Vardiyalar / Sürücüler
- Company için hızlı: Harita / Merkez / Vardiyalar / Check-in
- web tarafında 768px–1180px aralığı için tablet breakpoint düzeni

Bu adım henüz şunları tam açmaz:
- ayrı native room/company uygulaması
- ileri split view / çok kolonlu form rafinesi
- iPad / Android tablet özel offline davranışları
- kiosk modu
- M49 sertleştirme işi

## Neden bu yaklaşım seçildi?
Room / Company tarafında ürün hedefi tablet güçlü kullanım olduğu için önce mevcut web akışını tablet için sadeleştirmek daha düşük risklidir.
Böylece aynı backend ve aynı panel mantığı korunur.

## Dosyalar
- `web/src/layout/AppShell.jsx`
- `web/src/components/TabletOpsQuickBar.jsx`
- `web/src/index.css`
- `web/scripts/m48_5_room_company_tablet_readiness_check.js`
- `tools/pack_m48_5_room_company_tablet_readiness.ps1`
- `tools/check_m48_5_room_company_tablet_readiness_repo_contract.ps1`

## Kanıt komutu
```powershell
.\tools\pack_m48_5_room_company_tablet_readiness.ps1 -RepoRoot D:\servis-platform
```

## Ürün notu
Bu adım, Room / Company için aynı web uygulaması tablet kullanımında optimize edilir yaklaşımını uygular.
Same web app tablet scope korunur; ayrı native tablet app henüz açılmaz.
Henüz ayrı native room/company uygulaması açmaz.
Guided Mode / Stepper tek kalır; diğer araçlar gelişmiş alan altında yaşamaya devam eder.
