# OVERLAY M48 — Teklifler gerçekten gönderilince Takip/Market'e geç

## Problem
Plan Builder "Uygula: N market shift oluştur" sonrası otomatik odak (Takip/Market) tetiklenince PlanBuilder bileşeni unmount oluyor ve "Toplu Teklif" modalı kapanabiliyordu.
Sonuç: Shift'ler oluşuyor ama room'lara teklif gönderilmeyebiliyordu; ROOM Offers boş görünüyordu.

## Çözüm
- Apply sonrası **Sadece Toplu Teklif modalını aç** (odak yok).
- Odak (Takip → Market) **teklifler gerçekten gönderildikten sonra** tetiklenir.
- ShiftsPanel: onAfterApply artık Step-2'ye geri atmaz; Plan adımında kalır.

## Dosyalar
- web/src/panels/company/PlanBuilderPanel.jsx
- web/src/panels/company/ShiftsPanel.jsx
