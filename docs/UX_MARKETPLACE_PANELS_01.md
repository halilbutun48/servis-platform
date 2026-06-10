# UX-MARKETPLACE-PANELS-01 — marketplace readiness / supplier review lock

Tarih: 2026-06-10
Repo: `servis-platform`

Bu doküman, `VERIFIED-SUPPLIER-01` sonrasında marketplace temel panellerini UX olarak kilitler. Yeni backend flow açmaz; supplier matching, offer ranking, payment, contract/agreement execute veya AI runtime action açmaz. Marketplace yalnızca readiness/preview ve status-first görünürlük sağlar.

## Amaç
- Marketplace'i platform-first bir readiness merkezi olarak göstermek.
- Verified supplier ve invite/onboarding bağlamını görünür kılmak.
- İnsan onaylı sınırı ve sonraki milestone ayrımını netleştirmek.
- Mobile ve desktop'ta okunabilir, taşmasız, primary action görünür bir düzen tanımlamak.
- Bu belge docs/check kilididir; runtime flow açmaz.

## Status vocabulary
- Başvuru alındı
- İncelemede
- Davete hazır
- Davet hazırlandı
- Doğrulama bekliyor
- Doğrulama incelemede
- Doğrulandı
- Eksik bilgi
- Reddedildi

## UX ilkeleri
- Platform-first
- Status-first
- Human approval
- Hazırla, İncele, Önizle, Onaya sun dili
- Tedarikçi otomatik seçildi / otomatik sözleşme / otomatik ödeme iddiası yok.
- Marketplace readiness center boş ekran yerine açıklayıcı readiness state gösterir.
- Verified supplier ve invite milestone'ları hazır kabul edilir; supplier matching / offer ranking ayrı milestone'a bırakılır.

## A) Super Admin Marketplace Readiness / Supplier Review
- Verified supplier statüsü
- Invite/onboarding status
- Eksik bilgi checklist
- Human approval boundary
- Sıradaki milestone notu

## B) Company Marketplace Preview
- Talep/tedarikçi eşleşmesi henüz otomatik değil.
- Tedarikçi havuzu ve teklif karşılaştırma hazırlığı açıklanır.
- Public promise ile uyumlu, platform-first copy kullanılır.
- Readonly preview; payment / billing / contract execute yok.

## C) Room / Supplier Readiness
- Oda / tedarikçi uygunluk sinyalleri
- Verified supplier preparation checklist
- Kalite / kanıt / saha uygunluğu notları
- Guarded action preview

## D) Shared Marketplace Status Card
- invite status
- verification status
- next action
- guarded actions

## Mobile / desktop
- Kartlar mobile'da okunabilir olmalı.
- Yatay taşma olmamalı.
- Primary action görünür olmalı.
- Desktop'ta gereksiz dar kolon olmamalı.

## Güvenli sınır
- Marketplace auto-selection yok.
- Offer ranking yok.
- Payment/billing yok.
- Contract/agreement execute yok.
- Email/SMS/push yok.
- AI runtime action yok.
- backend route/service/schema yok.
- Prisma/schema/migration yok.
- Runtime-data/browser-smoke commit dışı.
- Bu milestone docs/check kilididir.

## Kanonik bağlar
- `INVITE-BASED-MEMBERSHIP-01`
- `VERIFIED-SUPPLIER-01`
- `UX-MARKETPLACE-PANELS-01`
- `PRODUCT-FLOW-BUTTON-AUDIT-01`

## Komutlar
- Check: `node backend\scripts\ux_marketplace_panels_01_check.js`
- Script alias: `check:uxmarketplacepanels01`
- Smoke yok; bu milestone yalnız docs/check kilididir.
