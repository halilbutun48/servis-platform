# OP-01 OperationProof / ServiceProof merkezi kanıt omurgası

## 1. Amaç
- Servis operasyonunda kanıt kavramını merkezi hale getirmek.
- Servis başladı mı, tamamlandı mı, kim bindi / binmedi, konum kanıtı var mı, zaman kanıtı var mı ve operatör notu var mı gibi soruları tek bir readonly özetle görünür kılmak.
- Bu doküman davranış değiştirmez; kanıt omurgası ve kabul rehberidir.
- M99-KVKK-01 ve M99-UX-01 kararları korunur; sade Türkçe ve görünürlük sınırı korunur.

## 2. Neden gerekli?
- Servis takibinde tek bir doğru kanıt katmanı gerekir.
- Hakediş, kalite ve denetim kararları için servis olaylarının okunur bir özeti önemlidir.
- Operatörün hızlı kontrol yapabilmesi için servis kanıtı ve hizmet kanıtı aynı dilden konuşmalıdır.

## 3. Kanıt ne demek?
- Kanıt; servis akışından gelen ve denetim / kalite / hakediş için kullanılabilecek görünür işaretlerin toplamıdır.
- Kanıt, ham GPS koordinatı değildir.
- Kanıt; zaman, biniş, araç veya sürücü GPS işareti, operatör notu ve görünürlük sinyallerinden oluşur.

## 4. Kanıt kaynakları
- Servis başladı / servis tamamlandı durumu
- Sürücünün telefon GPS’i
- Araç GPS’i
- Biniş kaydı
- Biniş yapılmadı kaydı
- ETA bilgisi
- Operatör notu
- Firma görünürlüğü
- Oda görünürlüğü
- Okul görünürlüğü
- Veli / personel görünürlüğü

## 5. Kanıt durumları
- `NOT_STARTED`
- `IN_PROGRESS`
- `EVIDENCE_PARTIAL`
- `EVIDENCE_READY`
- `NEEDS_REVIEW`
- `COMPLETED`

## 6. Kim neyi görebilir?
- SUPER_ADMIN servis kanıtı özetini görebilir.
- ROOM kendi operasyon kanıtı özetini görebilir.
- COMPANY kendi hizmet kanıtı özetini görebilir.
- SCHOOL kendi hizmet kanıtı özetini görebilir.
- ORGANIZATION kendi hizmet kanıtı özetini görebilir.
- DRIVER, PERSONEL ve PARENT bu admin proof summary endpoint’ini görmez.

## 7. KVKK sınırı
- Ham GPS koordinatları geniş rollere açılmaz.
- Tekil kullanıcıya gereksiz veri gösterilmez.
- KVKK görünürlük sınırı korunur.
- Sözleşme ve operasyon dili sade tutulur.

## 8. Hakediş bağlantısı — şimdilik pasif
- Bu özet hakediş için nihai karar değildir.
- Hakediş bağlantısı sonraki aşamada beslenir.
- Şimdilik sadece readonly özet üretilir.

## 9. Kalite puanı bağlantısı — şimdilik pasif
- Kalite puanı şu an hesaplanmaz.
- Kanıt omurgası kalite puanı için veri zemini hazırlar.
- Hesaplama sonraki aşamada açılır.

## 10. Copilot bağlantısı — sonraki adım
- Copilot operasyon rehberi bu özetin üstüne oturur.
- Kanıt özetleri, operatörün hızlı karar vermesine yardım eder.
- Sonraki adımda operatör notu ve öneri yüzeyi genişletilebilir.

## 11. Kabul checklist’i
- [ ] Servis kanıtı hazırlanıyor metni görünüyor.
- [ ] Kanıt kısmi metni görünüyor.
- [ ] Kanıt denetime hazır metni görünüyor.
- [ ] Operatör notu bekleniyor metni görünüyor.
- [ ] Sürücünün telefon GPS’i görüldü metni görünüyor.
- [ ] Araç GPS’i görüldü metni görünüyor.
- [ ] Biniş kaydı var metni görünüyor.
- [ ] Operatör notu var metni görünüyor.
- [ ] Hakediş için nihai karar değildir metni görünüyor.
- [ ] KVKK görünürlük sınırı korunur metni görünüyor.
- [ ] Sözleşme dili sade ve görünür.
- [ ] Servis kanıtı / hizmet kanıtı dili sade ve görünür.
- [ ] Kabul edildi / Eksik / Tekrar kontrol

## 12. Kabul komutları
- `npm run check:m99kvkk01`
- `npm run check:m99ux01`
- `npm run check:op01`
- `npm run verify:final`

## 13. Sık hata / ilk bakılacak yerler
- Özet boş görünüyorsa ilgili scope’ta servis verisi olmayabilir.
- Sürücünün telefon GPS’i görünmüyorsa görev / shift bağlamı kontrol edilir.
- Araç GPS’i görünmüyorsa araçta canlı veri yoktur veya veri eski olabilir.
- Operatör notu yoksa manuel not alanları kontrol edilir.
- Hakediş ve kalite puanı bu milestone’da aktif değildir.
