# FINAL UX Smoke 01 Checklist

Bu kontrol listesi, son UX cleanup dalgalarından sonra rol panellerinde crash, boş tab, yanlış label, taşma ve dekoratif tab risklerini manuel olarak hızlıca gözden geçirmek için hazırlanmıştır.

## Genel Kriterler
- UI crash yok.
- Boş panel yok.
- Boş veya dekoratif tab yok.
- Gereksiz uzun panel yok.
- Yanlış role label yok.
- Raw `Hub` yok.
- `Konum` standardı korunuyor.
- `Sefer Abi` launcher sağ altta duruyor.
- `Sefer Abi Terminali` korunuyor.

## Super Admin
- [ ] Genel Bakış açılıyor.
- [ ] Canlı İzleme açılıyor.
- [ ] Denetim Paneli açılıyor.
- [ ] Saha Kabul Merkezi açılıyor.
- [ ] Sahaya Çıkış Kontrolü açılıyor.
- [ ] Ticari Akış açılıyor.
- [ ] Güven ve Kalite açılıyor.
- [ ] İller ve Bölgeler açılıyor.
- [ ] İşlem Kayıtları açılıyor.
- [ ] Log Dışa Aktarımı açılıyor.
- [ ] Sefer Abi Terminali açılıyor.

## Room / Oda
- [ ] Canlı Takip açılıyor.
- [ ] Operasyon Sağlığı açılıyor.
- [ ] Sözleşmeler açılıyor.
- [ ] Vardiyalar açılıyor.
- [ ] Araçlar açılıyor.
- [ ] Sürücüler açılıyor.
- [ ] Ticari Akışım açılıyor.

## Company / Firma
- [ ] Sözleşmeler açılıyor.
- [ ] Vardiyalar açılıyor.
- [ ] Ticari Akış açılıyor.
- [ ] Operasyon Paneli açılıyor.
- [ ] Hizmet Değerlendirme açılıyor.
- [ ] Harita açılıyor.

## School / Okul
- [ ] Operasyon Paneli açılıyor.
- [ ] Vardiyalar açılıyor.
- [ ] Harita varsa açılıyor.
- [ ] Veli / bildirim bağlantıları açılıyor.

## Organization / Kurum
- [ ] Ana paneller açılıyor.
- [ ] Planlar açılıyor.
- [ ] Merkez / konum panelleri açılıyor.

## Driver
- [ ] Bugün açılıyor.
- [ ] Rota açılıyor.
- [ ] Harita açılıyor.
- [ ] Check-in açılıyor.

## Parent / Veli
- [ ] Canlı Takip açılıyor.

## Personel
- [ ] Canlı Takip açılıyor.

## Public / Passenger
- [ ] Canlı servis linki açılıyor.
- [ ] Personel canlı link yüzeyi açılıyor.

## Hızlı Kontrol
- [ ] Raw `Hub` görünmüyor.
- [ ] `Yer` yerine `Konum` standardı korunuyor.
- [ ] `Güven ve Kalite` label olarak duruyor, `Güven + Kalite` görünmüyor.
- [ ] `Audit Logs` görünmüyor.
- [ ] `SuperAdmin Log Export` görünmüyor.
- [ ] Sefer Abi launcher sağ altta.
- [ ] Sefer Abi Terminali korunuyor.
- [ ] Dekoratif tab yok.
- [ ] Boş panel yok.
- [ ] Gereksiz uzun panel yok.

## Takip Edilecek Riskler
- [ ] NavDock içindeki okul `Veli Erişimi` bağlantısı halen `/school/personel-access` yolunu gösteriyor; App tarafında `/school/parents` var.
- [ ] `/room/live`, `/driver`, `/parent` yüzeyleri compat alias olarak kalıyor.
- [ ] `screenRegistry` içinde `/company/personel-access` ve `/organization/personel-access` yüzeyleri görünmüyor.
- [ ] `/organization/plans` yüzeyi legacy title davranışını koruyor.
- [ ] `/public/personel-live` yüzeyi shared passenger live surface’i yeniden kullanıyor.
