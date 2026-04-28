# OVERLAY NOTES — M100 ASCII Check Output (2026-03-10)

Amaç:
- Windows PowerShell / code page farkı nedeniyle `?/?/??/??` çıktıların `???????` gibi bozuk görünmesini önlemek.

Yapılan:
- aktif check/pack scriptlerindeki kullanıcıya görünen emoji çıktıları ASCII hale getirildi.
- kullanılan eşleme:
  - `✅` -> `OK`
  - `❌` -> `FAIL`
  - `ℹ️` -> `INFO`
  - `⚠️` -> `WARN`

Kapsam:
- M41 / M42 / Step 0.6 / Step 1 foundation check-pack hattı
- gate / pack yardımcı çıktıları

Not:
- Bu overlay davranış değiştirmez; yalnızca terminal çıktısını daha stabil hale getirir.
