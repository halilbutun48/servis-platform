# M96 — Company Liste: araç/sürücü tıklayınca detay

Bu overlay şunları ekler:
- Company > Vardiyalar > Liste tablosunda **Assigned Vehicle** tıklanınca araç detay modalı
- **Driver** tıklanınca sürücü detay modalı
- Araç modalında: plaka, tip/model, durum, kapasite, km, hız limiti, renk, son km güncelleme, not
- Sürücü modalında: ad soyad, telefon, e-posta (varsa), cihaz, bağlı araç

Notlar:
- Ek Prisma migration gerekmez.
- Company shift list API yanıtına zengin vehicle/driver alanları eklenmiştir.
