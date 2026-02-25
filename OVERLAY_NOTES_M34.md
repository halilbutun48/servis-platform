# Overlay — M34CHECK (Lightweight Gate)

Bu overlay şunları ekler:

- **M34CHECK**: Plan Builder "Step-0 /precheck" contract + Stage-3 apply'in doğrulanabilir kısmı
  - company hub set (non-zero)
  - personel locations normalize (no null / 0,0)
  - market shift create → people attach → stops generate
  - multi-room offers gönderimi (2 room) + inbox doğrulaması
  - OSRM opsiyonel: varsa reorder denenir; yoksa skip (flaky değil)

- `tools/gate.ps1` ve `tools/pack.ps1`: **-To 34** desteği

Dosyalar:
- `backend/scripts/m34check.js`
- `tools/gate.ps1`
- `tools/pack.ps1`
