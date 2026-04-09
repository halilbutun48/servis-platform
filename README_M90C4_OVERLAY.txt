M90C.4 — Encoding hygiene pass overlay

Amac:
- Gorunur Turkce bozulmalarini (mojibake) temizlemek.

Degisen dosyalar:
- backend/src/server.js
- web/src/panels/company/ShiftsPanel.jsx

Not:
- Bu overlay davranis/refactor degisikligi yapmaz.
- Sadece bozuk karakterleri duzeltir.
- helpComposer / web-contract / docs policy degisikliklerini tekrar etmez.

Sonrasi onerilen dogrulama:
1) npm run verify:docs
2) npm run verify:hot
3) npm run verify:web-contract
