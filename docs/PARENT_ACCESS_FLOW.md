# SCHOOL → Veli Erişimi / Parent Access Akışı

Bu akış artık hesap daveti değildir.

Yeni ürün gerçeği:

- Okul ekranı: `#/school/parents`
- Public ekran: `#/accept-parent-invite?token=...`
- Üretim çıktısı: `erişim linki + erişim kodu + PIN`
- Mail / telefon / ad soyad toplanmaz
- Link ve Kod+PIN aynı süre boyunca tekrar kullanılabilir
- İptal edildiğinde erişim anında kapanır

## API yüzeyleri

- `GET /api/school/parent-invites`
- `POST /api/school/parent-invites`
- `POST /api/school/parent-invites/:id/revoke`
- `GET /api/auth/parent-invite/info?token=...`
- `POST /api/auth/parent-invite/accept`

## Güvenlik notları

- Ham link verisi DB'ye yazılmaz; hash tutulur.
- PIN ayrı sütunda tutulmuyor; erişim kombinasyonu hash üstünden doğrulanır.
- Public accept yüzeyi auth limiter ile korunur.
- Erişim iptal/süre bazlıdır; ilk girişte tek kullanımlık consume yapılmaz.

## UI beklentisi

- School tarafında yalnızca öğrenci ve süre alanı görünür.
- Public accept tarafında ana yöntem `Kod + PIN`dir.
- Link ile gelen kullanıcı otomatik giriş dener; gerekirse Kod + PIN fallback kullanır.
- Ayrı bir hesap daveti kartı veya mail tabanlı akış yoktur.
