# OVERLAY M38 — Hub “Konumumu Al” + Agreements görünürlük/extend UX

## 1) HubPanel (Company + Room)
- Yeni buton: **Konumumu Al** (tarayıcı geolocation)
- Mevcut geocode butonu ayrıldı: **Adresten Bul**
- Akış: Konumumu Al / Adresten Bul → lat/lng dolar → **Kaydet**.

## 2) Agreements
### Company
- Listeye hızlı uzatma eklendi: **Uzat +7g / +30g / +90g** + manuel **Tarih...**
- Açıklama notu: market/shift teklif “anlaşması” Agreement kaydı üretmez.

### Room
- Pending dışında, approve sonrası kaybolan kayıtlar için ikinci liste eklendi:
  - **Liste (APPROVED/ACTIVE/DONE/CANCELLED/REJECTED)**
- Not: extend işlemi Company tarafındadır.

## Dosyalar
- web/src/panels/company/HubPanel.jsx
- web/src/panels/room/HubPanel.jsx
- web/src/panels/company/AgreementsPanel.jsx
- web/src/panels/room/AgreementsPanel.jsx
