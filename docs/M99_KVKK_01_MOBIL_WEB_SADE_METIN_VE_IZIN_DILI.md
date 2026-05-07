# M99-KVKK-01 Mobil/Web KVKK Sade Metin ve İzin Dili

## 1. Amaç
- Mobil ve web yüzeylerinde KVKK / izin açıklamalarını sade Türkçe ile netleştirmek.
- Kullanıcının “hangi veri neden isteniyor?” sorusuna kısa cevap vermek.
- Bu milestone davranış değiştirmez; metin ve kabul paketi olarak yaşar.

## 2. Temel dil kuralları
- [ ] “Sürücünün telefon GPS’i” kullanılacak.
- [ ] “driver GPS” kullanılmayacak.
- [ ] “Sözleşme” kullanılacak.
- [ ] “agreement” görünür kullanıcı metni olarak kullanılmayacak.
- [ ] “Kullanıcı kodu” kullanılacak.
- [ ] “PIN veya şifre” kullanılacak.
- [ ] “Veli kodu + PIN” kullanılacak.
- [ ] Teknik flag, token, hash, raw payload kullanıcıya gösterilmeyecek.
- [ ] Hata mesajları sade Türkçe olacak.
- [ ] Kullanıcıya suçlayıcı veya teknik dil kullanılmayacak.

## 3. Sürücü konum izni metni
Başlık: “Konum izni neden gerekli?”

Metin:
“Servis göreviniz sırasında aracın konumunu operasyon, firma/okul ve yetkili kullanıcılar görebilsin diye konum bilgisi kullanılır. Görev yokken telefon GPS’i resmi servis konumu gibi gösterilmez.”

### Kabul maddeleri
- [ ] Görev sırasında konumun neden kullanıldığı açıklanıyor.
- [ ] Görev yokken telefon GPS’inin beklemede olduğu anlatılıyor.
- [ ] “Sürücünün telefon GPS’i” ifadesi kullanılıyor.
- [ ] Araç GPS’i ve telefon GPS’i karıştırılmıyor.
- [ ] Gereksiz teknik kelime kullanılmıyor.

## 4. Arka plan konum / ekran kapalı metni
Başlık: “Ekran kapalıyken konum”

Metin:
“Görev devam ederken ekran kapalı olsa bile servis takibi kesilmesin diye konum gönderimi gerekebilir. Telefon ayarları veya pil kısıtlaması bunu durdurabilir.”

### Kabul maddeleri
- [ ] Arka plan davranışı açık anlatılıyor.
- [ ] Pil optimizasyonu riski anlatılıyor.
- [ ] Kullanıcı ayarları değiştirmeye zorlanmıyor; yönlendiriliyor.
- [ ] KVKK sınırı korunuyor.

## 5. Personel canlı takip metni
Başlık: “Servisim nerede?”

Metin:
“Servisinizin size yaklaşma durumunu ve tahmini geliş bilgisini görebilirsiniz. Size gösterilen bilgiler sadece servis takibi için gerekli olan bilgilerle sınırlıdır.”

### Kabul maddeleri
- [ ] Personel neden konum gördüğünü anlıyor.
- [ ] Gereksiz araç / sürücü detayı gösterilmeyeceği anlatılıyor.
- [ ] KVKK görünürlük sınırı korunuyor.
- [ ] “Bugünkü servis” diliyle uyumlu.

## 6. Veli canlı takip metni
Başlık: “Öğrencimin servisi”

Metin:
“Öğrencinizin servis durumunu ve servis yaklaşma bilgisini görebilirsiniz. Size gösterilen bilgiler sadece öğrencinizin servis takibi için gerekli olan bilgilerle sınırlıdır.”

### Kabul maddeleri
- [ ] Veli neden takip gördüğünü anlıyor.
- [ ] Öğrenci / servis durumu sade anlatılıyor.
- [ ] Gereksiz kişisel veri gösterilmeyeceği anlatılıyor.
- [ ] “Öğrencimin servisi” diliyle uyumlu.

## 7. Firma / okul / oda görünürlük metni
Başlık: “Kim neyi görebilir?”

Metin:
“Her kullanıcı yalnızca görevi ve yetkisi için gerekli bilgileri görür. Firma, okul, oda ve operasyon ekranlarında bilgiler rol yetkisine göre sınırlandırılır.”

### Kabul maddeleri
- [ ] Rol bazlı görünürlük sade anlatılıyor.
- [ ] Herkesin her şeyi görmediği açık.
- [ ] Teknik RBAC terimi görünür metinde kullanılmıyor.
- [ ] Yetki sınırı güven veren dille anlatılıyor.

## 8. Veri saklama sade metni
Başlık: “Veriler ne kadar saklanır?”

Metin:
“Operasyon, güvenlik ve yasal gereklilikler için bazı kayıtlar belirli süre saklanır. Süresi dolan kayıtlar sistem politikasına göre temizlenir veya arşivlenir.”

### Kabul maddeleri
- [ ] Retention teknik detayı kullanıcıya boğmadan anlatılıyor.
- [ ] “Belirli süre” ifadesi sade kullanılıyor.
- [ ] Detaylı politika dokümanlarına bağlanabilir.
- [ ] Saklama amacı açık.

## 9. Hata ve izin reddi metinleri
- “Konum izni kapalı. Servis takibi için konum iznini açmanız gerekir.”
- “Bildirim izni kapalı. Yaklaşma ve servis durumu bildirimlerini alamayabilirsiniz.”
- “Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.”
- “Oturum süreniz doldu. Lütfen tekrar giriş yapın.”
- “Bu işlem için yetkiniz yok.”

## 10. Kullanılmayacak ifadeler
- driver GPS
- agreement
- raw token
- hash
- payload
- RBAC
- sourceVisibility
- officialSource
- debug
- fallback
- stale

Not: Kod içinde teknik kelimeler kalabilir; görünür kullanıcı metninde kullanılmayacak.

## 11. Kabul checklist’i
- [ ] Mobil login dili sade.
- [ ] Sürücü konum izni metni sade.
- [ ] Sürücünün telefon GPS’i dili doğru.
- [ ] Görev yokken GPS beklemede dili doğru.
- [ ] Personel canlı takip metni sade.
- [ ] Veli canlı takip metni sade.
- [ ] Firma / okul / oda görünürlük metni sade.
- [ ] Web panelden devam edin dili yönetim rolleri için korunuyor.
- [ ] Kullanıcıya teknik flag gösterilmiyor.
- [ ] PIN / şifre / token / debug görünmüyor.
- [ ] KVKK görünürlük sınırı anlatılıyor.
- [ ] Veri saklama açıklaması sade.
- [ ] Hata mesajları sade Türkçe.

## 12. Kabul sonucu alanı
- Kabul edildi / Eksik / Tekrar kontrol
- Test eden
- Tarih
- Notlar
- Ekran görüntüsü kanıtı
- Düzeltilmesi gereken metinler

## 13. Kabul komutları
- `node backend/scripts/m77_kvkk_uyum_katmani_check.js`
- `npm run check:m99kvkk01`
- `npm run check:m95e25`
- `npm run check:m95e26`
- `npm run check:m95e27`
- `npm run verify:final`

## 14. Sık hata / ilk bakılacak yerler
- Görünür metinde “driver GPS” kaldıysa düzeltilir.
- Görünür metinde “agreement” kaldıysa “Sözleşme” yapılır.
- Teknik flag kullanıcıya görünüyorsa gizlenir.
- İzin reddi metni teknikse sadeleştirilir.
- KVKK metni çok uzunsa kısa açıklama + detay bağlantısı yaklaşımı kullanılır.
- Runtime JSON değişirse commit’e alınmaz.

