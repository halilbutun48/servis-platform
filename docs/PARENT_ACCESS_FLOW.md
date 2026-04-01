# SCHOOL → Veli Erişimi / Parent Access Akışı

Bu akış artık hesap daveti değildir.
Legacy auth invite mantığı ürün yüzeyinden kaldırılmıştır.

## Güncel ürün gerçeği
- Okul ekranı: `#/school/parents`
- Public giriş ekranı: `#/accept-parent-invite?token=...`
- Hedef ekran: `#/parent/live`
- Üretim çıktısı: `erişim linki + erişim kodu + PIN`
- Mail / telefon / ad soyad toplanmaz
- Link ve `Kod + PIN` aynı süre boyunca tekrar kullanılabilir
- İptal edildiğinde erişim anında kapanır
- Hash / süre / deneme limiti mantığı korunur

## API yüzeyleri
- `GET /api/school/parent-invites`
- `POST /api/school/parent-invites`
- `POST /api/school/parent-invites/:id/revoke`
- `GET /api/auth/parent-invite/info?token=...`
- `POST /api/auth/parent-invite/accept`

## Güvenlik notları
- Ham link verisi DB’ye açık metin olarak yazılmaz; hash tutulur.
- PIN ayrı açık sütun olarak dönmez; erişim kombinasyonu hash mantığıyla doğrulanır.
- Public accept yüzeyi auth limiter ile korunur.
- Erişim iptal/süre bazlıdır; ilk girişte tek kullanımlık consume modeli yoktur.

## UI beklentisi
- School tarafında yalnızca öğrenci ve süre alanı görünür.
- Veli için ana fallback yöntem `Kod + PIN`dir.
- Link ile gelen kullanıcı otomatik giriş dener; gerekirse `Kod + PIN` ile devam eder.
- Ayrı hesap daveti, mail daveti veya legacy auth invite kartı yoktur.

## TTL presetleri
- `1 gün`
- `1 hafta`
- `1 ay`
- `6 ay`
- `1 yıl`
