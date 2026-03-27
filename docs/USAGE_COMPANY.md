# COMPANY — Günlük Kullanım Kılavuzu (V1)

## Amaç
Company, personel servis ihtiyacını planlar ve market üzerinden birden fazla **ROOM**’dan teklif toplayıp en uygunu ile devam eder.

## Günlük Akış (en az adım)
1) **Personel Konum Seçici**
   - Company panelinde **Personel Konum Seçici** sekmesine gir.
   - `NEEDS_REVIEW` olan kayıtları düzelt, büyük haritada konumu seç ve `OK` yap.
   - Adres/telefon sadece geçici girdiyse işi bitince temizle; kalıcı esas veri lat/lon'dur.

2) **Agreement Wizard ile Plan Oluştur**
   - **Agreements** ekranında Wizard/preset ile hızlı plan seç.
   - (Sabah/Akşam gibi presetleri seçip tarih aralığı + günleri ayarla.)

3) **Market: Room’lara teklif topla**
   - Wizard bittiğinde veya Company Home’dan **Market** akışını aç.
   - Birden fazla room seç → tek seferde teklif gönder.

4) **Teklifleri değerlendir ve Kabul et**
   - **Açık Teklifler** kartına tıkla (modal açılır).
   - Bir teklifi **Kabul Et** → diğer teklifler otomatik **CANCELLED** olur.

5) **Takip**
   - Shifts ekranından durumları izle.
   - Onay/başlatma operasyonu Room tarafındadır.

## İpuçları
- “Az işlem” hedefi: önce Konum Seçici → sonra Agreement/Wizard → sonra Market.
- Kabul sonrası room tarafına shift düşer; Room “Onayla (+Başlat)” ile operasyonu başlatır.
