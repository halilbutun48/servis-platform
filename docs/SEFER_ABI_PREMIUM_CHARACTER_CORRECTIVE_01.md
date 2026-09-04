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

## Geçici baseline ve Live2D handoff kararı

Gerçek karakter içi blink, gaze, nefes, baş ve yüz mikro-hareketleri için mevcut tek PNG asset yeterli değildir. Bu nedenle bugünkü ürün baseline’ı dürüstçe şu moddur:

`SEFER_ABI_TEMPORARY_BASELINE_VISUAL_MODE = CANONICAL_STATIC_PORTRAIT_WITH_STATE_UI`

Canonical PNG sakin/statik portre olarak kalır; lifecycle anlamı yalnızca mevcut durum halkası, renk, ışık ve durum işareti gibi UI sinyalleriyle gösterilir. Bu geçici görünüm gerçek karakter animasyonu olarak sunulmaz. Detached eye/mouth/face katmanı, whole-PNG bobbing veya CSS ile gerçek Live2D taklidi production’da kullanılmaz.

`SEFER_ABI_REAL_LIVE2D_ANIMATION_STATUS = DEFERRED_BY_ASSET_PRODUCTION`

`SEFER_ABI_REAL_LIVE2D_REQUIRED_BEFORE_FINAL_COMMERCIAL_ACCEPTANCE = YES`

Live2D asset üretimi tamamlandığında aynı `resolveSeferAbiWidgetState` ve ortak Sefer Abi state sahibi; `idle`, `listening`, `thinking`, `responding`, `result-ready`, `attention` ve `approval-required` durumlarında gerçek karakter içi hareketleri beslemelidir. Gelecek paket layered PSD, Cubism model (`.moc3`/`.model3.json`), texture, motion ve expression verilerini içerebilir; bu handoff bunları üretmez ve ikinci bir state machine oluşturmaz.

Bu deferred asset, mevcut roadmap’te PRE-#18 Premium UI Polish, #18, #19 veya #20’yi bloklamaz. Gerçek Live2D kabulü pre-final-commercial/E6 gate’inde zorunludur.

## Harita ve mobil güvenlik

Harita ekranında launcher; gerçek marker, Leaflet kontrolü, ana CTA, uyarı/dialog ve NavDock kutularına karşı boş bir hücre arar. Responsive görünümde 44 px ve üzeri görünür/dokunulabilir kutu korunur, güvenli alan inset’leri kullanılır.

## Draggable / safe-snap baseline kabulü

Launcher’ın ekran kenarı ve dikey konumu kullanıcı sürüklemesiyle değişebilir; kullanıcı müdahalesi yokken durum, bubble, panel ölçümü veya scroll launcher’ı sol ve sağ kenarlar arasında taşımaz. Konum tercihi güvenli kenara yaslanarak saklanır, viewport değişiminde en fazla deterministik bir yeniden hizalama yapılır.

`smoke:seferabicharactersafesnappolish01`

Bu gerçek browser kabulü drag, safe-edge snap, persistence, panelin içe açılması, attention bubble, map güvenliği, reduced-motion ve 15 saniyelik sabit idle konumunu video kanıtıyla kontrol eder. Rapor gerçek karakter animasyonu iddiası taşımaz; Live2D üretimi tamamlanana kadar geçici baseline’ın statik portre + durum UI olduğunu açıkça belirtir.

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
