# Overlay Notes — Passenger Live Link (2026-03-08)

Amaç: PERSONEL login zorunluluğunu azaltmak için COMPANY/SCHOOL panelinden süreli tekil canlı takip linki üretmek.

Kapsam:
- Prisma: PassengerLiveLink modeli
- Backend: /api/company/passenger-links, /api/public/passenger-live
- Web: Company/School PassengerLinksPanel, public PassengerLivePanel, App/Nav route güncellemeleri

Beklenen akış:
1. Company/School -> Canlı Linkler -> vardiya + kişi seç -> link üret
2. Link kopyalanır / WhatsApp ile paylaşılır
3. Kişi login olmadan /#/public/passenger-live?token=... açar
4. Yalnızca kendi durak + ETA + navigasyon + araç yaklaşımı görür
5. Şirket isterse revoke eder; süre dolunca link kapanır
