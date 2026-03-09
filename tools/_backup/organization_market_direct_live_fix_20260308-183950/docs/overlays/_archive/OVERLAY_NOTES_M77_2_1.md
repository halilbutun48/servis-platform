# OVERLAY M77.2.1 — Company Canlı Harita = Room Canlı Takip UI parity

Bu overlay Company "Canlı Harita" ekranını Room "Canlı Takip" ile aynı seviyeye getirir:

- Topbar filtreleri: Sadece ACTIVE + GPS olmayanları göster + arama + Yenile
- Sol liste kartı: GPS pill + shift status + sürücü/room + ilerleme + sıradaki + ETA + Son GPS + başlangıç
- Seçili Araç: GPS + Son GPS + Sıradaki + Navigasyon Aç + ETA + Mini timeline
- Harita Önizleme başlığı + Tümünü Göster butonu
- gps:update WS event'i HTTP çağırmadan araç koordinatını patch eder

Not: Company panelinde shift/stops bilgisi için `/api/shifts?status=APPROVED,ACTIVE&take=200` tek çağrısı kullanılır.
