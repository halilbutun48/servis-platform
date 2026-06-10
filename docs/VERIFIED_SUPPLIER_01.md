# VERIFIED-SUPPLIER-01 — insan onaylı tedarikçi doğrulama hazırlığı

Tarih: 2026-06-09
Repo: `servis-platform`

Bu doküman, `INVITE-BASED-MEMBERSHIP-01` sonrasında tedarikçi doğrulama hazırlığını insan onaylı, guard'lı ve audit log'lu sınırda kilitler. Amaç, public lead veya supplier application verisini otomatik verified supplier'a çevirmemek; yalnızca kanıt-temelli bir review hazırlığını kanonik hale getirmektir.

## Amaç
- Public lead veya supplier application otomatik verified supplier olmaz.
- Tedarikçi doğrulama sadece kanıt-temelli hazırlık olarak planlanır.
- İnsan onayı, guard ve audit log zorunludur.
- Public/self-service doğrulama akışı açılmaz.
- Bu milestone yalnızca docs/check seviyesindedir.

## Kanonik akış
- `ONBOARDING-REVIEW-01 FINAL AUDIT`
- `INVITE-BASED-MEMBERSHIP-01`
- `VERIFIED-SUPPLIER-01`
- `UX-MARKETPLACE-PANELS-01`
- `PRODUCT-FLOW-BUTTON-AUDIT-01`

## Doğrulama checklisti
- Ticari unvan / işletme bilgisi
- Yetkili kişi / iletişim bilgisi
- Araç kapasitesi / araç tipi uygunluğu
- Sürücü uygunluğu / belge sinyali
- Hizmet bölgesi
- KVKK / sözleşme / operasyon taahhüt bilgisi
- Geçmiş kalite / kanıt / saha performansı, varsa
- Eksik bilgi notu
- Review note
- Operation note
- Human approval log

## Durum modeli
- `VERIFICATION_NOT_STARTED`
- `VERIFICATION_IN_REVIEW`
- `VERIFICATION_NEEDS_INFO`
- `VERIFICATION_APPROVED`
- `VERIFICATION_REJECTED`
- `VERIFICATION_REVOKED`
- Bu durumlar yalnızca review vocabulary olarak tanımlanır; bu milestone yeni runtime enum/status/schema açmaz.

## Güvenli sınır
- Public/self-service tedarikçi doğrulaması yok.
- Invite acceptance verified supplier'a otomatik geçmez.
- Tedarikçi seçimi, ödeme ve sözleşme kesinleştirme otomatik değildir.
- Offer ranking, marketplace auto-selection, payment, billing, contract execute, email/SMS/push açılmaz.
- Human approval, guard ve audit log zorunludur.
- `UX-MARKETPLACE-PANELS-01` ayrı bir docs/check kilididir; marketplace readiness center dışına taşmaz.
- schema değişikliği yok.
- Backend route/service/schema genişlemesi yok.
- no runtime feature
- no UI feature
- no payment/billing
- no contract execute
- no offer ranking
- no marketplace auto-selection
- no email/SMS/push

## Out-of-scope
- runtime capability
- public marketing page change
- auto supplier verification
- payment/contract execute
- supplier auto-selection
- automatic deployment/email/SMS/push

## Not
- Bu belge sadece docs/check kilididir.
