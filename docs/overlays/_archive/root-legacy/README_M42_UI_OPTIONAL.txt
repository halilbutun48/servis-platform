M42 UI Optional Panel Overlay

Apply:
  .\tools\apply_overlay_m42_ui_optional.ps1

After apply:
  .\tools\pack.ps1 -To 41
  .\tools\pack_m42_optional.ps1

What it adds:
- me.features.checkin runtime flag for UI
- COMPANY/SCHOOL check-in panel
- ROOM check-in monitor panel
- DRIVER scan panel
- Nav entries only when feature is enabled
- WS invalidate topic for check-in events
- Deep-link disabled notice when FEATURE_CHECKIN=0
