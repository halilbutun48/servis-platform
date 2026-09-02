# Sefer Abi premium character corrective-01

Bu bounded corrective, #15 ve #17 kapandıktan sonra Sefer Abi’nin görsel kimliğini kalıcı ürün yüzü seviyesine taşır. #15 terminoloji kapsamını, #17 tek giriş mimarisini, ortak bağlam sahibini, harita bilgi mimarisini ve gelecek milestone sınırlarını yeniden açmaz.

## Karar

- Tek ürün sahibi görsel kimlik `web/src/components/copilot/SeferAbiAvatar.jsx` içindeki ölçeklenebilir inline SVG’dir.
- Karakter; olgun, sakin, güven veren ve operasyon tecrübesi olan insan tarzı bir Sefer Abi olarak çizilir. Lacivert ürün zemini, sıcak altın vurgu, koyu/kır saç ve ölçülü yüz ifadesi korunur.
- Harici raster, stok görsel, emoji, yeni Lottie/Rive runtime veya lisanslı üçüncü taraf karakter eklenmez.
- Aynı bileşen kapalı launcher’da, hızlı panel başlığında ve tam çalışma alanı başlığında kullanılır. Tam çalışma alanındaki kullanım dekoratiftir; ikinci giriş değildir.

## Kontrollü görsel durumlar

`idle`, `hover`, `listening`, `thinking`, `responding`, `attention`, `success` ve `approval-required` durumları aynı yüz, saç, kıyafet ve renk kimliğini korur. Mevcut etkileşimler ve mevcut kullanıcı onayı bağlamı dışında yeni iş sinyali üretilmez. Durum adları kullanıcıya ham teknik metin olarak yazdırılmaz.

Idle, düşünme ve yanıt hareketleri düşük genlikli CSS dönüşümleridir. Sürekli zıplama, yanıp sönme, dans etme veya proaktif davranış yoktur. `prefers-reduced-motion` altında hareket kapanır; durum rengi ve karakter kimliği korunur.

## Harita ve mobil güvenlik

Harita ekranında launcher; gerçek marker, Leaflet kontrolü, ana CTA, uyarı/dialog ve NavDock kutularına karşı boş bir hücre arar. Responsive görünümde 44 px ve üzeri görünür/dokunulabilir kutu korunur, güvenli alan inset’leri kullanılır.

## Gerçek kabul

Statik guard:

`npm run check:seferabipremiumcharactercorrective01`

Gerçek Playwright kabulü:

`npm run smoke:seferabipremiumcharactercorrective01`

Evidence, commit dışı olarak şu dizinde oluşur:

`backend/artifacts/browser-smoke/sefer-abi-premium-character-corrective-01/`

Rapor; 16 gerçek rendered screenshot, desktop/mobile home-map-panel akışlarını, hover/focus, düşünme/yanıtlama, quick→full continuity, map-safe placement, erişilebilir ad ve reduced-motion durumunu içerir. Evidence türü `REAL_PLAYWRIGHT_RENDERED_BROWSER` olarak yazılır.

Teknik kabulden sonra da insan görsel incelemesi zorunludur:

`SEFER_ABI_HUMAN_VISUAL_REVIEW_REQUIRED = YES`

`SEFER_ABI_FINAL_VISUAL_ACCEPTANCE = PENDING_HUMAN_REVIEW`

Bu belge yeni tipografi corrective’i, #18 guided anchor’ı veya #30+ proaktif davranışı başlatmaz.
