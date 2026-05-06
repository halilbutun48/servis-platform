# M98-E5 Kod + PIN Saha Kullanım Kanıtı

## 1. Amaç
Bu kontrol, kod + PIN erişim akışının gerçek kullanıcı için anlaşılır ve güvenli olduğunu doğrular.

## 2. Kimler test edilir?
- `COMPANY` → personel kodu üretir.
- `ORGANIZATION` → personel kodu üretir.
- `SCHOOL` → veli kodu + PIN akışı.
- `DRIVER` → mevcut sürücü kodu + PIN akışı.
- `PERSONEL` → mobilde kullanıcı kodu + PIN ile ilk giriş.
- `PARENT/VELI` → veli kodu + PIN dili.
- `SUPER_ADMIN` → yönetici hesapları hâlâ ayrı akışta.

## 3. Gerçek kullanıcı kabul checklist’i
- [ ] Firma personel erişimi sayfasını açabiliyor.
- [ ] Personel seçip “Personel erişimi oluştur” diyebiliyor.
- [ ] Tek seferlik “Kullanıcı kodu” ve “Geçici PIN” kartı görünüyor.
- [ ] Kullanıcı kodu ve geçici PIN’in sadece bir kez gösterildiği anlaşılıyor.
- [ ] Listede raw PIN görünmüyor.
- [ ] Listede kod maskeli görünüyor.
- [ ] Son geçerlilik tarihi görünüyor.
- [ ] İptal et aksiyonu görünüyor.
- [ ] Mobil giriş ekranında “Kullanıcı kodu” alanı var.
- [ ] Mobil giriş ekranında “PIN veya şifre” alanı var.
- [ ] Personel ilk girişten sonra “İlk şifreni değiştir” ekranına yönleniyor.
- [ ] Sürücü kodu + PIN akışı korunuyor.
- [ ] Veli ekranlarında “Veli kodu + PIN” dili anlaşılır.
- [ ] PassengerLiveLink aktivasyon olarak anlatılmıyor.
- [ ] Kod/PIN/token log/debug ekranlarında açık görünmüyor.
- [ ] Hata mesajları sade Türkçe ve kullanıcıyı yönlendirici.
- [ ] Operatör hangi durumda kodu iptal edeceğini anlayabiliyor.

## 4. Kabul sonucu alanı
- Kabul edildi / Eksik / Tekrar kontrol:
- Test eden:
- Tarih:
- Notlar:
- Ekran görüntüsü kanıtı:

## 5. Mini manuel senaryo
1. Company ile giriş yap.
2. Personel Erişimi ekranına git.
3. Personel seç.
4. Kod + PIN üret.
5. Kartı kontrol et.
6. Listeyi kontrol et.
7. Mobilde kullanıcı kodu + PIN ile giriş yap.
8. İlk şifre değiştirme ekranını kontrol et.
9. Gerekirse kodu iptal et.

## 6. Kabul komutları
```bash
npm run check:m98e2e
npm run check:m98e3
npm run smoke:m98e4
npm run check:m98e4b
npm run check:m98e4c
npm run check:m98e5
npm run verify:final
```

## 7. Sık hata / ilk bakılacak yerler
- Docker backend eski kalmışsa rebuild gerekir.
- `routeMounts` crash varsa `m98e4b` / `m98e4c` check çalıştır.
- Runtime smoke sonrası runtime JSON dosyaları değişirse commit’e alma, geri al.
- Login 500 ise önce docker logs kontrol edilir.
- Personel Erişimi sayfasında `Cannot GET` görünürse backend route mount kontrol edilir.
