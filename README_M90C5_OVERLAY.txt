M90C.5 — schema.prisma decision gate overlay

Bu overlay yalnız docs/policy kararını işler.
Kod veya schema dosyasını değiştirmez.

Karar:
- backend/prisma/schema.prisma M90 hattında justified exception olarak korunur.
- Dosya sırf line-count için bölünmez.
- Migration-safe lokal schema değişiklikleri serbesttir.
- Sonraki resmi iş: M90C.6 hot-file queue policy.
