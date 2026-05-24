# DYNAMIC-SAVINGS-01

## Amaç
`DYNAMIC-SAVINGS-01`, route change / boarding / agreement delta verilerinden readonly dinamik tasarruf önizlemesi üretir.

## Kapsam
- `Company / Sözleşmeler`
- `Company / Ticari Akış`
- `Room / Sözleşmeler`
- `Room / Ticari Akış`
- Sefer Abi / Copilot tasarruf soruları

## Gösterilen metrikler
- Mevcut rota
- Yeni rota
- Fark
- Km tasarrufu
- Süre tasarrufu
- Kapasite etkisi
- Yaklaşık maliyet etkisi

## Güvenli fallback
- Veri yoksa: `Tasarruf hesabı için yeterli veri yok`
- Kesin finansal vaat yok
- Readonly, tahmini ve önizleme dili kullanılır

## Yasaklar
- Route apply yok
- Ödeme yok
- Settlement yok
- SMS yok
- Push notification yok
- Driver refresh yok
- Schema / migration yok

## Copilot sınırı
- Sefer Abi yalnızca readonly tasarruf sinyalini açıklar.
- `Bu işlem uygulanmadı` ve `sadece önizleme` sınırı korunur.
- Ödeme / settlement / route apply başlatma dili kullanılmaz.

