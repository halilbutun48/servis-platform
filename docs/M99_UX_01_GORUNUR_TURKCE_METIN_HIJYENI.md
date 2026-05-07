# M99-UX-01 Görünür Türkçe Metin Hijyeni

## 1. Amaç
- Web ve mobilde kullanıcıya görünen metinlerin sade Türkçe kalmasını sağlamak.
- Teknik terimlerin kullanıcı ekranına taşmasını önlemek.
- Bu milestone davranış değiştirmez; metin hijyeni ve kabul check paketidir.

## 2. Ana dil kararları
- [ ] “Sözleşme” kullanılacak.
- [ ] “agreement” görünür kullanıcı metni olarak kullanılmayacak.
- [ ] “Sürücünün telefon GPS’i” kullanılacak.
- [ ] “driver GPS” görünür kullanıcı metni olarak kullanılmayacak.
- [ ] “Kullanıcı kodu” kullanılacak.
- [ ] “PIN veya şifre” kullanılacak.
- [ ] “Veli kodu + PIN” kullanılacak.
- [ ] “Web panelden devam edin” yönetim rolleri için korunacak.
- [ ] Hata mesajları sade Türkçe olacak.
- [ ] Teknik raw alanlar kullanıcıya gösterilmeyecek.

## 3. Kullanıcıya görünmemesi gereken teknik kelimeler
- agreement
- driver GPS
- fallback
- stale
- sourceVisibility
- officialSource
- payload
- raw
- hash
- token
- debug
- RBAC
- middleware
- router
- stack trace
- undefined
- null
- 500 internal server error

Not:
Bu kelimeler kod içinde kalabilir. Yasak sadece kullanıcıya görünen metinler, ekran başlıkları, butonlar, açıklamalar, toast / hata mesajları ve docs kullanıcı rehber metinleri içindir.

## 4. Kullanıcıya uygun karşılıklar
- agreement → sözleşme
- driver GPS → sürücünün telefon GPS’i
- fallback → yedek / devreye alma / beklemede
- stale → güncel değil / eski
- sourceVisibility → konum kaynağı bilgisi
- officialSource → resmi konum kaynağı
- payload → gönderilen bilgi / kayıt detayı
- token → erişim kodu / oturum bilgisi / bağlantı bilgisi, bağlama göre
- debug → teknik kayıt
- 500 internal server error → İşlem tamamlanamadı. Lütfen tekrar deneyin.

## 5. Mobil görünür metin checklist’i
- [ ] Login ekranı “Kullanıcı kodu” kullanıyor.
- [ ] Login ekranı “PIN veya şifre” kullanıyor.
- [ ] Sürücü ekranlarında “Sürücünün telefon GPS’i” kullanılıyor.
- [ ] Personel ekranında “Bugünkü servis” kullanılıyor.
- [ ] Veli ekranında “Öğrencimin servisi” kullanılıyor.
- [ ] Yönetim rollerinde “Web panelden devam edin” dili korunuyor.
- [ ] Hata mesajları teknik stack trace göstermiyor.
- [ ] Token / PIN / şifre görünür hata veya debug alanında yok.

## 6. Web görünür metin checklist’i
- [ ] Company / Room / Organization panellerinde “sözleşme” dili korunuyor.
- [ ] “agreement” kullanıcı yüzeyinde görünmüyor.
- [ ] Harita ve rota ekranlarında “sürücünün telefon GPS’i” dili korunuyor.
- [ ] “driver GPS” kullanıcı yüzeyinde görünmüyor.
- [ ] Operasyon / denetim ekranları teknik flag göstermiyor.
- [ ] Hata / toast metinleri sade Türkçe.
- [ ] “Web panelden devam edin” yönetim rolleriyle uyumlu.

## 7. Kabul checklist’i
- [ ] Görünür metinlerde agreement yok.
- [ ] Görünür metinlerde driver GPS yok.
- [ ] Görünür metinlerde fallback / stale / sourceVisibility / officialSource / payload / debug teknik dili yok.
- [ ] Kullanıcı kodu dili korunuyor.
- [ ] PIN veya şifre dili korunuyor.
- [ ] Veli kodu + PIN dili korunuyor.
- [ ] Sözleşme dili korunuyor.
- [ ] Sürücünün telefon GPS’i dili korunuyor.
- [ ] Hata mesajları sade Türkçe.
- [ ] Kullanıcıya raw token / hash / payload gösterilmiyor.

## 8. Kabul sonucu alanı
- Kabul edildi / Eksik / Tekrar kontrol
- Test eden
- Tarih
- Notlar
- Bulunan metinler
- Düzeltilmesi gereken ekranlar

## 9. Kabul komutları
- `npm run check:m99kvkk01`
- `npm run check:m99ux01`
- `npm run check:web-mobile`
- `npm --prefix mobile run check:m1`
- `npm run verify:final`

## 10. Sık hata / ilk bakılacak yerler
- İngilizce teknik kelime koddan değil, görünür string’den geliyorsa düzeltilir.
- Dokümanlarda teknik terim gerekiyorsa sadece geliştirici dokümanında kalır.
- Kullanıcı rehberinde teknik kelime varsa sadeleştirilir.
- Hata mesajı backend’den ham dönüyorsa UI’da sadeleştirilir.
- Runtime JSON değişirse commit’e alınmaz.

