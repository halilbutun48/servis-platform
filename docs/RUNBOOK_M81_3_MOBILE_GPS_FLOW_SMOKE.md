# M81.3 Mobile GPS Flow Smoke

AmaÃ§: telefon/Expo Ã§alÄ±ÅŸtÄ±rmadan mobil GPS zincirinin statik sÃ¶zleÅŸmesini doÄŸrulamak.

Kontrol edilen zincir:

1. Mobil arka plan GPS izin ve servis state'i
2. `mobileAppState.js` iÃ§indeki background permission/task alanlarÄ±
3. Mobil GPS yayÄ±n yÃ¼zeyi
4. Backend `/gps` ingest yÃ¼zeyi
5. Backend GPS update / WS publish izi
6. Auto-reached queue veya ayrÄ±ÅŸtÄ±rÄ±lmÄ±ÅŸ iÅŸlem izi

Komut:

```powershell
Set-Location "D:\servis-platform"; powershell -ExecutionPolicy Bypass -File .\tools\pack_m81_3_mobile_gps_flow_smoke.ps1 -RepoRoot "D:\servis-platform"
```

Strict mod:

```powershell
Set-Location "D:\servis-platform"; powershell -ExecutionPolicy Bypass -File .\tools\pack_m81_3_mobile_gps_flow_smoke.ps1 -RepoRoot "D:\servis-platform" -Strict
```

Not: Soft modda bazÄ± alanlar WARN olarak kalabilir. Ã–zellikle `socket.io-client` import edilip `mobile/package.json` iÃ§inde dependency olarak yoksa soft mod WARN verir, strict mod FAIL verir.