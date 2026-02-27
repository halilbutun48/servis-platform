OVERLAY_BUNDLE_M51_ALL

Bu paket, tek zip ile M51 serisi değişiklikleri ve M51 extend modülünü birlikte uygular.
İçerik:
- Company ShiftsPanel default pending + accept gating + manuel talep kaldırma
- Shift Tools Hub kartı (geocode + hub durak ekleme)
- Shift Extend (süre uzatma) backend+db+UI altyapısı (migrations dahil)
- PRIMER dosyaları güncellendi (tools/PRIMER_SNAPSHOT.md + docs/PRIMER_SSOT.md)

Uygulama:
- Zip’i repo köküne overlay şeklinde aç.
- Eğer migration uygulanmadıysa: backend içinde prisma migrate dev.

Not:
- Gate/Pack stage üst sınırı tools/pack.ps1 içinde M35. Overlay serisi numaraları ayrı takip edilebilir.
