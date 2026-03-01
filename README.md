# OVERLAY M74.6 — ROOM: tek harita (MapPanel) + LiveProgress birleşimi + Navigasyon Aç fix

## Ne değişti?
- ROOM'da `/room/map` artık **Canlı Takip** tek panel:
  - Canlı Liste (uzun + scroll)
  - Seçili Araç kartı (Mini Timeline + Navigasyon Aç)
  - Harita (duraklar + araç)
- `/room/live` eski linki bozulmasın diye aynı paneli gösterir.
- LiveProgressPanel.jsx deprecated: MapPanel'i export eder.
- ROOM nav: "Harita" kaldırıldı, yerine "Canlı Takip" `/room/map` oldu.
- Company Map: seçili araç bazen boş kalıyorsa selection hard-guard eklendi.

## Uygulama (max 2 PowerShell)
```powershell
cd D:\servis-platform
Expand-Archive -Path .\OVERLAY_M74_6_ROOM_UNIFY_ONE_MAP.zip -DestinationPath . -Force
```
Sonra web açıksa Ctrl+F5; değilse `cd .\web; npm run dev`
