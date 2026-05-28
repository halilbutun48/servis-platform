# SHIFT-DISPATCH-APPROVAL-FIX-01

Tarih: 2026-05-28  
Kapsam: Room / Bekleyen Talepler içindeki çoklu bölme önizleme onay akışı.

## Amaç
- Bekleyen Talepler ekranında, Dispatch bölme önizlemesi gerçek seçime bağlanır.
- Tüm önerilerde araç + şoför seçilmişse `Önizlemeyi Uygula: Böl & Onayla` aktif olur.
- Eksik seçim, aynı araç/şoför çakışması veya kapasite riski varsa buton pasif kalır.

## Kök Neden
- Görünen seçimler ile validation state aynı kaynaktan okunmuyordu.
- Dispatch öneri state'i gerçek `dispatchEditSel` yapısına bağlanmadığı için buton kararsız kalıyordu.
- Uyarı metni de seçim eksikliği ile çakışma / kapasite ayrımını yeterince açık göstermiyordu.

## Düzeltme
- Dispatch öneri durumu gerçek seçim state'i ile hesaplanır.
- Varsayılan öneri vehicle/driver değerleri validation'a dahil edilir.
- Aynı araç / aynı şoför çakışmaları açık uyarı olarak gösterilir.
- Kapasite riski varsa onay butonu kapalı kalır ve sebep görünür olur.
- Görünür durum dili sadeleştirilir:
  - `Hazır`
  - `Araç/şoför seç`
  - `Kontrol`
- Apply payload seçili öneri satırını `splitIndex` ile taşır; her satırın `vehicleId` ve `driverId` bilgisi korunur.

## Kök Neden 2: Acceptance / Status Propagation
- Dispatch onayı sonrası kök kayıt teknik olarak `SPLIT` durumuna geçiyordu; fakat Room / Ticari Akış ve Company görünümü bu durumu kabul edilmiş / uygulandı olarak okumuyordu.
- Room tarafı bazı satırlarda `CANCELLED` teklif durumunu görünür kılarken, kök dispatch sonucunu final ticari kayıt gibi göstermiyordu.
- Company tarafında split root kayıtlar gizleniyor ya da final listeye kabul edilmiş kayıt olarak taşınmıyordu.

## İkinci Düzeltme
- `SPLIT` artık kullanıcı dilinde `Bölünerek Onaylandı` olarak gösterilir.
- `SPLIT`, final / accepted bucket içinde değerlendirilir; iptal veya reddetme bucket'ına düşmez.
- Room / Ticari Akış ekranı dispatch uygulanmış kök kaydı iptal gibi değil, operasyon kaydı olarak gösterir.
- Company görünümü split root kaydı görünür tutar ve kabul edilmiş / uygulanmış listeye dahil eder.
- Ticari ekranlar `shifts` değişiminden sonra kendini yeniler; cache, dispatch onayını geciktirmez.

## Analiz Formatı
Önümüzdeki operatör mesajları mümkün olduğunca şu sırayı izler:
1. Durum
2. Ne anlama geliyor?
3. Etki / risk
4. Sıradaki doğru işlem
5. Güvenli sınır

## Teknik Ayrıntı Standardı
- Teknik seçim state'i gerektiğinde kapalı "Teknik ayrıntılar" alanında tutulur.
- Ana görünümde raw id / payload / debug dili yerine operasyon dili gösterilir.

## Out-of-scope
- Self-service üyelik açma
- Otomatik firma / oda / okul / tedarikçi hesabı açma
- Payment / invoice / collection execute
- Invite gönderimi
- User creation
- Contract execute
- Supplier verification auto
- Prisma schema / migration
- Boarding decision mantığını genişletme
