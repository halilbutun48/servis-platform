# OVERLAY M77.3.1 — Company Map UI Parity Restore (KVKK Gate uyumlu)

Bu overlay, M77.3 ile gelen **KVKK time-window gate** davranışını bozmadan,
Company "Canlı Harita" ekranını tekrar Room "Canlı Takip" ile aynı UI seviyesine getirir.

## Neden bozuldu?
M77.3 overlay'i `web/src/panels/company/MapPanel.jsx` dosyasını eski sürümle ezdi.

## Değişiklik
- `web/src/panels/company/MapPanel.jsx` → parity sürümü (Room benzeri topbar + kart detayları + ETA + mini timeline renkleri)
- Ayrıca shift listesi için `onlyNow=1` eklendi: Company tarafında **sadece şu anki (startAt<=now<=endAt)** vardiyalar seçili araçta görünür.

## Not
KVKK gate'in asıl enforcement'ı backend tarafında (M77.3) devam eder; bu overlay sadece UI'yi geri getirir.
