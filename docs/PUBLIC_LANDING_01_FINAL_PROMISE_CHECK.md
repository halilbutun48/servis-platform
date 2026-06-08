# PUBLIC-LANDING-01 FINAL PROMISE CHECK

Tarih: 2026-06-08
Repo: `servis-platform`

Bu doküman public landing için güven stratejisini kilitler. Amaç, public pazarlamada yalnızca testle kanıtlanmış ve milestone/check/smoke/acceptance ile doğrulanmış kabiliyetleri vaat etmek; Sefer Abi'yi ana ürünün yerine geçen bir AI olarak değil, premium ve ikincil operasyon copilot'u olarak anlatmak; "underpromise, overdeliver" ilkesini public copy standardı haline getirmektir.

## Public konumlama
- SeferPakt ana ürün olarak platform-first anlatılır.
- Sefer Abi premium ve ikincil operasyon copilot'u olarak anlatılır; ana ürünün yerine geçmez.
- Public landing, kontrollü lead akışına kapı açar; üyelik, ödeme veya otomatik operasyon açmaz.
- Public vaatler yalnızca kanıtlanmış kabiliyetlerden oluşur.
- Ürün, vaat ettiğinden fazlasını güvenli şekilde yaparak kullanıcı güvenini artırmayı hedefler.

## AI Promise Strategy / Güven Stratejisi
- "Underpromise, overdeliver" ilkesi uygulanır.
- SeferPakt AI kabiliyetlerini pazarlarken abartılı ve kanıtlanmamış otomasyon iddiaları kurmaz.
- Kullanıcıya vaat edilen şey, ürünün kesin olarak yaptığı, testle kanıtlanmış ve milestone, check, smoke, acceptance ile kanıtlanmış kabiliyetlerden oluşur.
- Sefer Abi'nin iç ürün hedefi maksimum güçlü operasyon AI'ıdır.
- Public vaatler yalnızca milestone, check, smoke, acceptance ve human approval guard ile kanıtlanmış kabiliyetlerden oluşur.
- Eğer ürün vaat ettiğinden daha azını yaparsa güven zedelenir.
- Eğer ürün vaat ettiğinden fazlasını güvenli şekilde yaparsa güven artar.
- Sefer Abi içeride daha fazlasını yaparsa bu güveni artırır.

## Public marketing için doğru yaklaşım
Kullanılabilir:
- "Sefer Abi operasyon risklerini erken görünür kılar."
- "Sefer Abi teklif, rota, vardiya ve saha sinyallerini analiz ederek en doğru seçenekleri hazırlar."
- "Kritik aksiyonlar insan onayıyla güvenli şekilde ilerler."
- "Sefer Abi kullanıcıya karar desteği sunar ve onaylanan adımları guard'lı şekilde hazırlar."

Kullanılmayacak:
- "Her şeyi yapay zekâ yapar."
- "İnsan gerekmeden tüm servis operasyonu tamamlanır."
- "AI otomatik tedarikçi seçer."
- "AI otomatik ödeme/sözleşme kesinleştirir."
- "Excel'i yükleyin, tüm operasyon kendiliğinden biter."

## İç ürün hedefi
- Her paneli ve her rolü anlayacak.
- Verileri analiz edecek.
- En doğru seçenekleri sunacak.
- Kullanıcıya sadece onay/ret kararını bırakacak seviyeye yaklaşacak.
- Sesli komut, sesli uyarı, Excel analizi, OSRM rota taslağı, tedarikçi/teklif analizi, risk tahmini ve aksiyon hazırlığı kabiliyetleri milestone'larla sırayla açılacak.
- Tüm kritik işlemler human approval, guard ve audit log ile ilerleyecek.

## Public güven sınırı
- AI runtime capability ekleme.
- UI feature ekleme.
- backend route/service/schema değiştirme.
- Prisma/migration değiştirme.
- marketing sayfasını değiştirme.
- Runtime-data değişikliği.

## Kanonik bağlar
- `docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md`
- `docs/PUBLIC_LANDING_01.md`
- `docs/PUBLIC_LANDING_PLATFORM_FIRST_01.md`
- `docs/PROJECT_SPEC_V1.md`
- `docs/PRIMER_SSOT.md`

## Kısa not
Bu doküman docs/check milestone'udur; public marketing claim guard'ı kilitler ve runtime davranışı açmaz.
