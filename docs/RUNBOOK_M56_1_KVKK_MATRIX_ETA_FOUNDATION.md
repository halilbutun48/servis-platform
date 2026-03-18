# RUNBOOK — M56.1 KVKK MATRIX + ETA FOUNDATION

Bu tur M56 kapsamını tek seferde bitirmez; foundation turudur.

Eklenenler:
- `GET /api/kvkk/matrix`
- ETA payload içinde `etaMode`, `remainingStopsCount`, `remainingRouteKm`, `remainingRouteEtaMin`, `nextStop`, `navigation`
- Personel ekranlarında kalan durak / rota ETA görünürlüğü

Amaç:
- KVKK rol/panel/veri kararını yazılı ve API görünür hale getirmek
- Mevcut haversine ETA yaklaşımını bozmadan rota zinciri toplam km/süre görünürlüğü eklemek
- Sonraki M56 turunda durak kaçırma / reroute davranışına zemin hazırlamak
