# Sefer Abi premium character corrective-01

Bu bounded corrective, #15 ve #17 kapandıktan sonra Sefer Abi’nin görsel kimliğini kalıcı ürün yüzü seviyesine taşır. #15 terminoloji kapsamını, #17 tek giriş mimarisini, ortak bağlam sahibini, harita bilgi mimarisini ve gelecek milestone sınırlarını yeniden açmaz.

## Karar

- Tek ürün sahibi görsel kimlik, `web/src/assets/sefer-abi-premium-avatar.png` içindeki transparan RGBA karakter asset’i ile `web/src/components/copilot/SeferAbiAvatar.jsx` sarmalayıcısının birleşimidir.
- Karakter; gönderilen ürün sahibi referansının art-direction’ını izleyen, olgun, sakin, güven veren ve operasyon tecrübesi olan insan tarzı bir Sefer Abi’dir: koyu/kır saç, bakımlı sakal-bıyık, lacivert premium yelek ve ölçülü sıcak ifade korunur.
- Asset, konsept panosundan kırpılmamış; ürün içine alınmış, alpha kanallı, ürün sahibi yeni bir görsel çıktıdır. Stok görsel, emoji, yeni Lottie/Rive runtime veya lisanslı üçüncü taraf karakter eklenmez.
- Aynı bileşen kapalı launcher’da, hızlı panel başlığında ve tam çalışma alanı başlığında kullanılır. Tam çalışma alanındaki kullanım dekoratiftir; ikinci giriş değildir.

## Canlı widget durum modeli

`idle`, `hover-focus`, `listening`, `thinking`, `responding`, `result-ready`, `attention` ve `approval-required` aynı yüz, saç, kıyafet ve renk kimliğini korur. Bu sekiz durum, `SeferAbiAvatar.jsx` içindeki saf `resolveSeferAbiWidgetState` çözümlemesiyle gösterilir; ikinci bir konuşma, iş veya istek state sahibi oluşturulmaz.

| Görsel durum | Mevcut ürün sinyali | Kullanıcıya görünen anlam |
| --- | --- | --- |
| `idle` | Etkin istek veya etkileşim yok | Hazır |
| `hover-focus` | İşaretçi veya klavye odağı | Buradayım |
| `listening` | Hızlı panel metin alanı odakta | Seni dinliyorum |
| `thinking` | Mevcut asistan isteği çalışıyor | İnceliyorum... |
| `responding` | İstek yanıtı yeni sunuluyor | Yanıtı hazırlıyorum... |
| `result-ready` | İstenen yanıtın sunumu tamamlandı | Hazır |
| `attention` | Mevcut istek hatası | Bir sorun var |
| `approval-required` | Mevcut seçili kayıtta kullanıcı onayı gerekiyor | Onayınız gerekli |

`responsePhase`, yalnızca mevcut isteğin `responding` → `result-ready` sunum geçişini kısa süreli göstermek için kullanılan ephemeral bir UI projection’dır. Kalıcı konuşma, ekran, kayıt ve görev bağlamı hâlâ mevcut `copilotSharedState` sahibindedir. Proaktif olay, sahte bildirim veya üretim debug kontrolü eklenmez.

Idle, dinleme, düşünme, yanıt ve sonuç-hazır hareketleri aynı raster yüz üzerinde düşük genlikli CSS dönüşümleridir; dikkat/onay durumları yalnızca ölçülü çerçeve vurgusu kullanır. Sürekli zıplama, yanıp sönme, dans etme veya proaktif davranış yoktur. `prefers-reduced-motion` altında hareket kapanır; durum işareti ve karakter kimliği korunur.

## Harita ve mobil güvenlik

Harita ekranında launcher; gerçek marker, Leaflet kontrolü, ana CTA, uyarı/dialog ve NavDock kutularına karşı boş bir hücre arar. Responsive görünümde 44 px ve üzeri görünür/dokunulabilir kutu korunur, güvenli alan inset’leri kullanılır.

## Gerçek kabul

Statik guard:

`npm run check:seferabipremiumcharactercorrective01`

Gerçek Playwright kabulü:

`npm run smoke:seferabipremiumcharactercorrective01`

Evidence, commit dışı olarak şu dizinde oluşur:

`backend/artifacts/browser-smoke/sefer-abi-premium-character-corrective-01/`

Rapor; en az 18 gerçek rendered screenshot, desktop/mobile home-map-panel akışlarını, hover/focus, dinleme, düşünme, yanıtlama, sonuç-hazır, onay, quick→full continuity, map-safe placement, klavye aktivasyonu, erişilebilir ad ve reduced-motion durumunu içerir. Evidence türü `REAL_PLAYWRIGHT_RENDERED_BROWSER` olarak yazılır.

Teknik kabulden sonra da insan görsel incelemesi zorunludur:

`SEFER_ABI_HUMAN_VISUAL_REVIEW_REQUIRED = YES`

`SEFER_ABI_FINAL_VISUAL_ACCEPTANCE = PENDING_HUMAN_REVIEW`

Bu belge yeni tipografi corrective’i, #18 guided anchor’ı veya #30+ proaktif davranışı başlatmaz.
