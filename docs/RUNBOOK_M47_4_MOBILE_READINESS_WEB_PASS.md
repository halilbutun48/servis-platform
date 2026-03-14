# RUNBOOK — M47.4 MOBILE READINESS WEB PASS

Tarih: 2026-03-14
Timezone: Europe/Istanbul

## Amaç
Bu adım native mobil uygulama yapmak için değil, mevcut web arayüzünü telefonda daha kullanılabilir hale getirmek içindir.

## Kapsam
- viewport `viewport-fit=cover`
- tema rengi bildirimi
- yatay taşmayı azaltma
- alt güvenli alan (`safe area`) boşluğu
- küçük ekranda tek kolon shell davranışı
- nav öğelerinde yatay kaydırma desteği
- buton / input / select için en az `44px` dokunma hedefi
- web build + kaynak kontrol ile resmi pack/check hattı

## Beklenen etkiler
- iPhone ve benzeri cihazlarda alt sabit alan çakışması azalır
- küçük ekranda nav öğeleri tek satır sıkışmak yerine kaydırılabilir olur
- tablo yoğun ekranlarda sayfa taşması yerine kart içi yatay kaydırma davranışı iyileşir
- mobil tarayıcı otomatik zoom etkisi azalır

## Kanıt
- `tools/pack_m47_4_mobile_readiness_web_pass.ps1 -RepoRoot D:\servis-platform`
- `docker run --rm -v D:\servis-platform:/repo -w /repo/web node:20-alpine sh -lc "npm ci && npm run build && node scripts/m47_4_mobile_readiness_web_pass_check.js"`

## Not
Bu adım web kullanılabilirlik geçişidir. Native sürücü uygulaması ve gerçek mobil akış temeli sonraki faz olan `M48 Driver Mobile Foundation` içindedir.
