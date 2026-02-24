# OVERLAY — M33.5 UX polish

Changes
- Company/Shifts top tab label: **Yeni Talep** → **Manuel Talep**
- Plan Builder Apply: after creating shifts, show a toast:
  - "Oluşturuldu: #<id>, #<id>..."
  - Clicking an id auto-filters **Bekleyen Talepler → Market Shifts** (sets market search to that id) and scrolls/focuses the search input.

Files
- web/src/panels/company/ShiftsPanel.jsx
