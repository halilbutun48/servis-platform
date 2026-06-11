# PRODUCT-FLOW-BUTTON-AUDIT-01

Bu milestone, kritik product-flow CTA ve button yüzeylerini yalnızca okuma ve güvenli etkileşimle doğrular.

## Amaç

- Public lead modal akışını doğrulamak.
- Super Admin review-only kuyruk butonlarını kontrol etmek.
- Super Admin commercial core içindeki readonly payment sınırını doğrulamak.
- Company ve Room preview / detail / convert / approve / reject butonlarını kontrol etmek.
- Personel ve Parent canlı takip yüzeylerindeki navigasyon butonlarını kontrol etmek.

## Güvenli Sınır

- Public lead modal sadece validation ile test edilir.
- Review-only akışta invite, user create ve ödeme yazma işlemleri çalıştırılmaz.
- Commercial core tarafında payment execute ve settlement execute çalıştırılmaz.
- Agreement ve shift yüzeylerinde write akışları çalıştırılmaz.
- `trial-click` yalnızca tıklanabilirlik kanıtı için kullanılır; gerçek işlem tetiklenmez.
- No write flows, no settlement execute, no invite send, no user create.
- Readonly payment sınırı açık kalır.

## Kapsam

- Public / Landing
- Super Admin / Onboarding Review
- Super Admin / Commercial Core
- Company / Shifts
- Company / Agreements
- Room / Shifts
- Room / Agreements
- Personel / Live
- Parent / Live

## Smoke Çıktısı

- `18 routes`
- `36 screenshots`
- `PASS 8 / PASS- 10 / UX-FIX 0 / BLOCKER 0 / AUTH-BLOCKED 0 / NOT-FOUND 0`
- Desktop ve mobile viewport birlikte test edilir.

## Komutlar

- Check: `node backend\scripts\product_flow_button_audit_01_check.js`
- Smoke: `node backend\scripts\product_flow_button_audit_01.mjs`
- Script alias: `check:productflowbuttonaudit01`
- Smoke alias: `smoke:productflowbuttonaudit01`

## Kanıt Kaydı

Smoke raporu ve ekran görüntüleri `backend/artifacts/browser-smoke/PRODUCT_FLOW_BUTTON_AUDIT_01/` altında tutulur.
Bu artifact'ler commit dışı bırakılır.

## Notlar

- Public landing'de `Demo talep et`, `Canlı destekle görüş`, `Servis ihtiyacımı anlat`, `Tedarikçi olarak başvur` butonları görünür kalır.
- Review-only kuyrukta `İncelemeye al`, `Ek bilgi gerekli`, `Invite için uygun`, `Reddet`, `Notları kaydet` butonları kontrol edilir; `Sadece inceleme` pill'i görünür chrome'da olmayabilir, ama read-only sınırı görünür kalır.
- Commercial core'da `Hakediş` tabı ve `Bu kart readonly kontrol içindir; işlem başlatmaz.` sınırı görünür kalır.
- Company agreements yüzeyinde detay kartı ve safe boundary görünür; preview button current fixture set'te her zaman yüzeye çıkmayabilir.
- Room shifts yüzeyinde pending kuyruk boşsa kabul/reddet aksiyonları gizli kalır; preview modal harita ve Leaflet ipucu ile açılır.
- Room agreements preview butonu görünür kalır; current fixture set'te modal açılması flaky olabilir, ama safe boundary görünür kalır.
- Personel canlı yüzeyinde navigasyon butonları görünür kalır.
- Parent canlı yüzeyinde fallback/no-vehicle modunda request ve refresh görünür kalır; çocuk/navigasyon/no-show butonları gizli kalabilir.
