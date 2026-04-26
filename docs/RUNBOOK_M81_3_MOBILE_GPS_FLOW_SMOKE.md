# M81.3 Mobile GPS Flow Smoke

Ama?: telefon/Expo ?al??t?rmadan mobil GPS zincirinin statik s?zle?mesini do?rulamak.

Kontrol edilen zincir:

1. Mobil arka plan GPS izin ve servis state'i
2. `mobileAppState.js` içindeki background permission/task alanları
3. Mobil GPS yayın yüzeyi
4. Backend `/gps` ingest yüzeyi
5. Backend GPS update / WS publish izi
6. Auto-reached queue veya ayr??t?r?lm?? i?lem izi

Komut:

```powershell
Set-Location "D:\servis-platform"; powershell -ExecutionPolicy Bypass -File .\tools\pack_m81_3_mobile_gps_flow_smoke.ps1 -RepoRoot "D:\servis-platform"
```

Strict mod:

```powershell
Set-Location "D:\servis-platform"; powershell -ExecutionPolicy Bypass -File .\tools\pack_m81_3_mobile_gps_flow_smoke.ps1 -RepoRoot "D:\servis-platform" -Strict
```

Not: Soft modda baz? alanlar WARN olarak kalabilir. ?zellikle `socket.io-client` import edilip `mobile/package.json` i?inde dependency olarak yoksa soft mod WARN verir, strict mod FAIL verir.