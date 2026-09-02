# UX-PARENT-PERSONEL-LIVE-ERROR-CLARITY-01

Parent / Veli ve Personel canlı takip yüzeylerinde hata ve fallback metinlerini sade, güven veren ve kullanıcıyı doğru sonraki adıma yönlendiren hale getiren görünürlük düzeltmesi.

## Amaç

- Parent / Veli canlı takipte `servis neden görünmüyor?` sorusuna net cevap ver.
- Personel / Servisim / Canlı takip ekranında aktif vardiya, servis saati ve konum durumunu açık göster.
- `403 / yetki / erişim` gibi teknik ayrıntıları kullanıcı-facing metinde göstermeden güvenli fallback sun.
- ETA ve GPS kesin değilse kesinmiş gibi davranma.
- Kullanıcıya bir sonraki doğru kontrol adımını açık söyle.

## Yüzeyler

- Parent / Veli canlı takip
- Personel / Servisim / Canlı takip
- Shared live fallback card / service context
- Live route / map özet kartları

## Kullanıcıya Görünen Güvenli Mesajlar

- Bugün için aktif servis görünmüyor.
- Bugün için aktif vardiya görünmüyor.
- Servis saati, araç ataması veya konum izni kontrol edilmeli.
- Servis saati veya vardiya ataması kontrol edilmeli.
- Konum sinyali güncel değilse tahmini varış kesin gösterilmez.
- ETA henüz alınamadı.
- Bu cihaz konum paylaşımını desteklemiyor. Konum destekleyen bir cihazda tekrar deneyin.
- Bu ekran bilgilendirme amaçlıdır; yeni servis veya rota oluşturmaz.

## Kullanıcıyı Yönlendiren Sonraki Adımlar

- Aktif servis saati kontrolü
- Araç ataması kontrolü
- Konum izni ve canlı konum güncelliği kontrolü
- Şirket / operasyon ile iletişim

## Sınırlar

- Backend auth/business logic değişmedi.
- Backend auth/business route değişmedi.
- Backend route/write-path yok.
- Schema/migration yok.
- Runtime-data commit dışı kaldı.
- Browser-smoke artifact commit dışı kaldı.
- Playwright runner policy değişmedi.
- Coverage matrix check değişmedi.
- SMS/push/notification yok.
- AI/Copilot capability eklenmedi.
- GPS / ETA hesaplama algoritması değişmedi.
- Yeni business flow eklenmedi.
- Bu ekran bilgilendirme amaçlıdır; yeni servis veya rota oluşturmaz.

## Teknisyen Dili Görünmez

- Teknik/debug/raw/null/undefined görünmez.
- 403 / yetki / erişim gibi teknik ayrıntılar yalnızca code / registry düzeyinde kalır.
