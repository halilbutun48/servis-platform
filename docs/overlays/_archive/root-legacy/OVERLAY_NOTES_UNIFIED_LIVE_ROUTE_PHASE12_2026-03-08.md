# OVERLAY — Unified Live Route Phase 1/2 (2026-03-08)

Kapsam:
- ROOM / COMPANY / SCHOOL / DRIVER: tüm duraklar rota sırası ile, haritada rota, canlı araç, sıradaki durak highlight.
- ROOM / COMPANY / SCHOOL / DRIVER: sonraki durağa navigasyon aç.
- ROOM / COMPANY / SCHOOL: tam rotayı dış navigasyonda aç.
- DRIVER: adım adım takip, durum pill'leri, tam rota dış navigasyon.
- PERSONEL: kendi/önerilen durak odaklı metin güncellemesi.

Not:
- SCHOOL zaten CompanyMapPanel varyantı üzerinden bu davranışı alır.
- Driver backend `/api/driver/route/active` artık `orderedStops` alanını rota sırası ile döner.
