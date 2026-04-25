# MOBILE_SCOPE_BOUNDARY_V1

## Amaç
Mobil yüzeyin kapsamını netleştirmek, driver-first çizgiyi korumak ve web panel evrenini mobile taşıyarak bakım yükü üretmemek.

## Kısa karar
Mobil uygulama bu repo içinde **driver-first** kalmalıdır.

Web tarafındaki tüm panel ailelerini mobile taşımak bu aşamada uygun değildir.
Mobilin ana işi:
- sürücünün telefon GPS'i
- vardiya / rota akışı
- KVKK blok ve izin akışı
- sesli yönlendirme
- temel bağlantı / recovery

## Neden bu karar alındı
Mevcut mobil altyapı zaten driver yaşam döngüsüne göre şekillenmiş durumdadır:
- `Login`
- `Today`
- `Route`
- `Live`
- `PinChange`

Bu yapı:
- GPS publish
- background runtime
- session recovery
- route progress
- voice guidance
- KVKK kontrolü

üzerine kuruludur.

Web’deki panel yüzeyleri ise:
- room
- company
- school
- organization
- super-admin
- parent
- personel

gibi çok daha geniş ve ayrı rol / yetki / yoğun bilgi yüzeyleri içerir.

Bu panellerin tamamını mobile taşımak:
- ekran karmaşası üretir
- bakım maliyetini artırır
- driver akışını ağırlaştırır
- web ile mobil arasında gereksiz duplicate yüzey oluşturur

## Kapsam
Bu karar notu aşağıdaki sınırları tanımlar:

- mobil uygulama driver shell olarak kalır
- web panelleri mobile kopyalanmaz
- mobilde yalnızca doğrudan sürücü operasyonuna hizmet eden yüzeyler yaşar
- gerekli görülen ek mobil yüzeyler varsa bunlar companion ve dar kapsamlı olur

## Kapsam dışı
Bu not doğrudan şunları hedeflemez:

- tüm web panellerinin mobile taşınması
- super-admin / room / company / school panel parity
- mobilde tam yönetim konsolu
- çok rol destekli genel panel shell

## Mobilde kalması gereken ana yüzeyler

### Driver core
- login
- today
- route
- live
- PIN change

### Driver runtime
- GPS publish
- background location runtime
- KVKK gating
- network recovery
- voice guidance
- next stop / ETA

### Driver quick actions
- shift start / pause / resume / complete
- stop reached / skip / reopen / undo

## Web’de kalması gereken ana yüzeyler
- room panel ailesi
- company panel ailesi
- school panel ailesi
- organization panel ailesi
- parent panel ailesi
- super-admin panel ailesi

## İstisna yaklaşımı
Mobilde yeni bir yüzey gerekirse şu sorulara cevap verilmeden eklenmemelidir:
1. Bu yüzey sürücünün günlük iş akışını gerçekten hızlandırıyor mu?
2. Web paneline göre mobile özgü bir kazanç var mı?
3. Yetki / ekran / veri yoğunluğu driver shell’i bozuyor mu?

Eğer cevaplar net değilse, yüzey web’de kalmalıdır.

## Başarı ölçütü
Bu karar doğru uygulanmış sayılırsa:
- mobil uygulama sade kalır
- driver kullanımında bilişsel yük artmaz
- GPS ve rota akışı merkezde kalır
- web panelleri mobile taşınmadığı için bakım yükü artmaz
- her rol için doğru yüzey doğru platformda kalır

## Net sonuç
**Mobil = driver-first.**

**Web = tam panel yüzeyi.**

Tüm panelleri mobile taşımak yerine, yalnızca driver akışını güçlendiren küçük ve gerekçeli companion yüzeyler düşünülmelidir.
