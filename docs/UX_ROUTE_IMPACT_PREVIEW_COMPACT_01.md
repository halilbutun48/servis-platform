# UX-ROUTE-IMPACT-PREVIEW-COMPACT-01

## Problem
Room / Operasyon Sağlığı ve Company tarafında `Rota etkisini önizle` sonrası açılan rota etkisi kartı fazla büyük, harita baskın ve ilk bakışta yorucu görünüyor. Kullanıcı önce kısa kararı okumak yerine teknik metrikler arasında kaybolabiliyor.

## Hedef
Önizlemeyi kısa karar kartına dönüştürmek. Varsayılan görünüm kompakt özet olsun; detay analiz, harita ve teknik uyarılar isteğe bağlı açılan bölümde kalsın.

## Varsayılan Görünüm
- Başlık: `Farklı durak değişikliği`, `Bugün binmeyecek`, `Geçici biniş notu` veya ilgili boarding/route change tipi.
- Kısa karar: örnek olarak `Personel One bugün Geçici durak noktasından binecek.`
- Durum rozetleri: `Sadece önizleme`, `Kabul bekliyor`, `Operasyona ulaştı`, `Uygulanmadı`.
- Ana KPI'lar: `Kişi`, `Durak farkı`, `Mesafe etkisi`, `Süre etkisi`.
- İkincil satır: `Kapasite`, `Güvenilirlik`, `Risk`, `Bekleyen taraf`.
- Aksiyonlar: `Detayı aç`, `Haritada göster`, `Seçimi temizle`.

## Detay Görünümü
- `Mini harita önizlemesi`
- `Eski durak` ve `Yeni/alternatif durak`
- `Kişi etkisi`
- `Durak etkisi`
- `Km/süre hesap açıklaması`
- `Uyarılar`
- `Sıradaki önerilen işlem`

## Rol ve Yüzey Kapsamı
- Room / Operasyon Sağlığı
- Company operasyon yüzeyleri
- Aynı shared component kullanılıyorsa School tarafı da aynı kompakt dili görür

## Readonly Sınırı
- Bu preview rota uygulamaz.
- Ödeme, fatura, tahsilat, sözleşme, invite, user creation ve supplier verification açmaz.
- Sadece etki analizi gösterir.

## Out-of-scope
- Rota uygulama yok
- Ödeme çalıştırma yok
- Faturalama çalıştırma yok
- Tahsilat çalıştırma yok
- Sözleşme çalıştırma yok
- Davet gönderme yok
- Kullanıcı oluşturma yok
- Tedarikçi doğrulama otomasyonu yok
- Uzlaşma / settlement çalıştırma yok
