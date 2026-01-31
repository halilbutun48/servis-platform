Evet, yapılabilir — ama iki kritik parçaya dayanıyor:

Adres → koordinat (lat/lng)

500m kuralına göre “ortak durak” + durak sırası (rota)

Aşağıdaki gibi tasarlarsak V1 içinde de çalışır.

1) Excel import (Company)

Excel sütunları: AdSoyad, Tel, Adres (+ ideal olarak Lat, Lng)

En sağlam yöntem: Excel’e Lat/Lng de koymak (adres yazmak opsiyonel).
Çünkü otomatik “adres çözme (geocoding)” dış servis gerektirir ve V1’de rate-limit / doğruluk / KVKK açısından riskli.

Eğer sadece adres olacaksa:
backend’de geocoding yapılır (Nominatim/Google vs). Bu durumda:

yanlış adres/yanlış mahalle problemleri,

hız limitleri,

KVKK metni + onay,

cache ve log’lama şart olur.

V1 önerim: Excel import + Company panelinde “adres pinle” (haritadan düzelt) opsiyonu.

2) “Ortak durak” otomatik oluşturma (500m kuralı)

Elimizde personel noktaları (lat/lng) var diyelim.

A) Gruplandırma (yakın olanları kümeye alma)

Her vardiya için (sabah/akşam/gece) personelleri filtrele

DBSCAN gibi bir kümeleme ile:

eps = 500m (max yürüyüş mesafesi)

minSamples = 2 (en az 2 kişi ortak durak olsun; tek kalanlar “tekli durak” olur)

Not: Mesafe hesabını “kuş uçuşu” yaparsan hızlı olur ama şehir içinde hatalı olabilir.
Daha doğru için yol mesafesi (OSRM) kullanırsın.

B) Durak noktası seçimi

Her küme için durak koordinatı:

Basit: cluster centroid (ortalama)

Daha iyi: geometric median (herkese daha dengeli)

Sonra kontrol: kümedeki herkesin durağa mesafesi <= 500m mi?

değilse: küme bölünür / durak noktası optimize edilir.

C) Kapasite (tek araç mı, çok araç mı?)

Tek araç ise: stop sayısı artar ama çalışır.

Çok araç varsa: bu iş VRP (Vehicle Routing Problem)’e döner.

V1’de pratik çözüm: kümeleri “kapasiteye göre” parçalayarak birden fazla rota üretmek (greedy/bin-pack).

3) Duraklardan rota oluşturma (durak sırası)

Senin modelde “sürücü konumuna yakın olandan başlayarak” diyorsun; bu çok uygun.

Basit rota sıralama:

Başlangıç: driver current location

Sonra: nearest neighbor ile bir sonraki en yakın durağı seç

Daha iyi: 2-opt gibi küçük iyileştirme

Mesafe/ETA:

En iyi: OSRM/GraphHopper ile yol mesafesi + süre

V1 minimal: Haversine + sabit hız yaklaşımı (ama ETA kalitesi düşer)

Çıktı olarak ne üretiriz?

Her vardiya için:

Shift + Stops[] otomatik oluşur (type: AUTO_SUGGESTED gibi)

Her stop için bağlı personel listesi tutulur (stopId ↔ personelIds)

Room’a “bu plan öneri mi otomatik mi?” onay ekranı koyarsın (V1’de güvenli)

Onaylanınca:

sürücüye duraklar gider

personele “vardiya+araç+durak” bildirimi gider

V1’de gerçekçi minimum (temiz yaklaşım)

Excel import Lat/Lng zorunlu (adres opsiyonel)

Clustering: DBSCAN 500m

Stop noktası: centroid + doğrulama

Route sıralama: driver konumundan greedy

Room “tek tuş onayla” (otomasyon ama insan kontrolü var)

İstersen bunu V1 kapsamına uyarlayıp netleştireyim:

“500m” kuş uçuşu mu yol yürüyüş mesafesi mi olacak?

Excel’e Lat/Lng koymayı kabul ediyorsan V1’de çok hızlı çıkar.
(Koymazsak geocoding + doğrulama ekranı şart olur.)
Evet — Excel’den gelen adresleri otomatik lat/lon’a çevirip, sonra da 500m yürüme sınırına göre ortak durak + rota üretebilirsin. Mantık “geocoding + clustering + routing”.

1) Adresten lat/lon (otomatik)

Bunun adı geocoding. Adresi bir harita sağlayıcısına gönderip koordinat alırsın.

Seçenekler

Nominatim (OpenStreetMap): hızlı PoC için çok iyi. Ama public endpoint production için uygun değil; ciddi kullanımda self-host veya ücretli servis önerilir. Public kullanımda User-Agent/iletişim bilgisi, rate limit vb. kurallar var.

Google / HERE / Mapbox: ücretli ama daha stabil ve yüksek doğruluk/kapasite.

Nominatim ile örnek akış

Endpoint: /search (format=json/jsonv2)

İstek örneği (şablon):

GET https://.../search?format=jsonv2&limit=1&q=<adres>

Dönen ilk kayıttan lat, lon alırsın.

“Yunus Emre mahallesi 6459 sokak no:9/8 pamukkale denizli” gibi bir metni doğrudan bu endpoint’e yollayıp sonuç alırsın. (Pratikte sorguya “Turkey/Türkiye” eklemek, il/ilçe alanlarını ayrı vermek ve sonucu cache’lemek doğruluğu artırır.)

KVKK notu: Adres → koordinat kişisel veriye girer. V1’de bile en azından: “kullanıcı onayı”, “minimum saklama”, “mask/yuvarlama” gibi önlemleri planlamak iyi olur.

2) 500m kuralı ile “ortak durak” üretme

Geocode sonrası elinde personel noktaları var: (lat,lng).

Bunları vardiya bazında (sabah/akşam/gece) ayrı çalıştırırsın.

Ortak durak (clustering)

Hedef: Her personel, kendi durağına en fazla 500m yürüyecek.

Basit ve V1’e uygun yöntem:

DBSCAN mantığı: epsilon = 500m

Ya da greedy:

Atanmamış bir personeli al

Ona yakın (≤500m) kişileri topla

Kümenin “durak noktası”nı merkez/medyan seç

Küme büyüdükçe merkez güncelle, 500m şartını bozanları çıkar

Küme = 1 durak

V1’de mesafeyi “kuş uçuşu (haversine)” ile yaparsın. Sonra istersen OSRM/Valhalla ile “yol mesafesi”ne yükseltirsin.

3) Duraklardan rota üretme

Duraklar oluşunca rota iki seviyeli:

(A) Araç kapasitesine göre durakları araçlara paylaştırma

Her vardiya için toplam kişi sayısı + araç kapasiteleri

“cluster kişi sayısı” = durağa bağlı personel sayısı

Basit bin packing: büyük kümeleri önce koy (capacity dolmayacak şekilde)

(B) Her araç içinde durak sırası (route order)

Başlangıç noktası: aracın mevcut GPS’i / garaj / company noktası

Basit Nearest Neighbor ile sırala

Üstüne küçük iyileştirme (2-opt) eklenebilir

Sonuç: stops[] order

Senin akışına çok uyuyor çünkü sürücü “konumuna yakın duraktan başla” isteğini de bu sıraya göre otomatik çözersin (gerekirse driver “reorder” ile override).

Senin proje durumuna bağlayayım

Gönderdiğin çıktıda M8CHECK PASS + FULLCHECK PASS görünüyor; yani M8 bitti. Şimdi bu Excel→geocode→durak/rota otomasyonu, net şekilde M9/M10/M11 tarafına (stop-state, driver ops, log/observability, UI) bağlanıyor.

İstersen bir sonraki adımda, V1’e uygun şekilde şu 3 parçayı “minimum çalışan” hale getiririz:

Company Excel import (adres + vardiya)

Geocode + cache + başarısızsa “manual pin” fallback

Stop-suggestions (500m cluster) → template/shift’e yazma

Hazırsan “Excel kolonları” için V1 şeması da önereyim (adı, tel opsiyonel, adres, vardiya, not).
Aynen — en doğru ve KVKK açısından da en mantıklı yaklaşım: her personelin adresi için lat/lon’u bir kere üretip saklamak, sonra sadece adres değişince yeniden üretmek.

Bunu V1’de şöyle temiz kurarız:

Önerilen model (tek seferlik geocode + cache)
Personel tarafı

addressText (ham adres metni)

homeLat, homeLng (en son doğrulanmış koordinat)

geocodeStatus (OK | NEEDS_REVIEW | FAILED)

geocodedAt

addressHash (adres metninin hash’i)

Kural:

Excel’den gelen addressText değişmediyse (hash aynıysa) geocode çalışmaz.

Değiştiyse:

homeLat/homeLng boşsa veya “stale” ise geocode tekrar yapılır,

geocodeStatus güncellenir.

Neden addressHash iyi?

“Adres aynı mı?” kontrolü çok kolay.

Gereksiz API çağrısını keser.

Log/debug için net.

“Adres değişti” akışı

Company Excel import → personel satırı bulundu

Yeni adres metni normalize edilir (trim, çoklu boşluk, büyük/küçük vs.)

Hash alınır

Hash farklıysa:

homeLat/homeLng = null

geocodeStatus = NEEDS_REVIEW

background değil, import sırasında sırayla geocode (rate limit’e göre)

Sonuç:

Bulduysa OK + lat/lng + geocodedAt

Bulamadıysa FAILED ve UI’da “haritadan seç” butonu

Ekstra: Global “geocode cache” tablosu (çok faydalı)

Aynı adres farklı personellerde tekrar edebilir (aynı site/mahalle vs.).
Bu yüzden bir tablo daha iyi olur:

GeocodeCache

addressHash

addressTextNormalized

lat, lng

provider (nominatim/google)

quality (confidence)

updatedAt

İşleyiş:

Önce cache’e bak → varsa direkt kullan.

Yoksa provider’a git → sonucu cache’e yaz.

KVKK için küçük ama kritik öneri

Ev adresi hassas. V1’de bile şunlardan birini düşün:

Lat/lon’u 5-6 hane değil, biraz yuvarlayıp (örn. ~10-30m) saklamak

Ya da “homeLat/homeLng” yerine “stopLat/stopLng” (durağa göre) saklamak
(rota için çoğu zaman evin nokta nokta bilinmesi gerekmiyor)

İstersen ben bunu senin mevcut V1 rollerine göre en basit DB alanları + endpoint akışı olarak yazayım:

Excel import endpointi → geocodeStatus yönetimi

UI: Company “Personel listesi” tablosunda OK/FAILED rozet + “konum seç” aksiyonu

Sonra vardiya için clustering/stop-suggestions.

(İstersen “adres değiştiğinde eski lat/lon’u saklayalım mı yoksa silinsin mi?” diye karar da koyarız; KVKK’da genelde silmek daha güvenli.)
Aynen mantık doğru: ev noktasının “tam” olması şart değil, yeter ki tutarlı olsun. O zaman sistemi şöyle kurarız:

1) Koordinatı bilerek “yuvarla” (privacy + stabilite)

Geocode’dan gelen lat/lon’u saklamadan önce 50m grid’e snap ederiz.

Böylece:

KVKK tarafı daha rahat

Aynı adres/aynı bina farklı yazılsa bile yakın noktaya düşer

“durak 400m” kuralı ile rahat toparlar

Kural güncelleme:

Personel–Durak max mesafe = 400m (senin dediğin gibi)

“ev noktası 50m oynasa bile” bu toleransla sorun çıkmaz.

2) “Yakın adresleri grupla” nasıl yapılır?

Vardiya (sabah/akşam/gece) için:

Excel import → herkesin homeLat/homeLng var (snap’li)

Aynı vardiyadaki personelleri al

Cluster (yakınlık kümelemesi):

parametre: clusterRadius = 400m

çıktı: 1..N adet grup

Her grup için “durak noktası” üret:

en basit: grubun ortalaması (centroid)

sonra o da 50m grid’e snap

Durakları sıraya diz (rota):

V1’de en pratik: “depodan başlayarak nearest-neighbor”

ya da driver current gps’e göre “en yakın duraktan başla” (senin istediğin)

Bu şekilde:

Durak = “ortak nokta”

Her personel için kontrol: stopDistance(personel, stop) <= 400m
değilse o personel ya komşu cluster’a kaydırılır ya da yeni durak açılır.

3) “50m sapma” ile neden çalışır?

Çünkü sistemin kritik eşiği “durak mesafesi”.
Sen:

koordinat hassasiyetini düşürüyorsun (50m grid)

durak toleransını yükseltiyorsun (400m)
Bu kombinasyon çok sağlam.

4) V1 için net karar seti

Lat/lon saklanacak ama snap(50m) uygulanacak

MAX_STOP_DIST_M = 400

Adres değişmediyse geocode tekrar yok

Adres değiştiyse geocode + snap

Geocode fail olursa: Company panelde “Haritadan seç” ile manuel konum

İstersen bir sonraki adımda sana şu 3 şeyi “V1 uyumlu” netleştiririm:

Prisma’da eklenecek alanlar (Personel + GeocodeCache)

Excel import endpoint sözleşmesi (başarılı/başarısız satır raporu)

clusterStopsForShift(people, maxDistM) pseudo + uygulanabilir algoritma (DBSCAN benzeri ama basit)

(İstersen ayrıca “driver en yakından başlasın” kuralını da rotaya direkt gömeriz.)
nen öyle yapacağız: adres her gün sorulmayacak. V1 mantığı şu:

1) Personelin adresi “profil verisi” (tek seferlik)

Company/personel profiline adresText + (lat,lng) kaydedilir.

Bu kayıt “kalıcıdır”.

Her vardiya/rota üretiminde aynı lat/lng kullanılır, yeniden adres sormayız.

2) Adres güncelleme “tekil işlem”

Personel adres değiştirdiyse:

Company panelde o personeli açar → Adres Güncelle der.

Yeni adresText girilir.

Sistem 1 kere yeniden geocode eder → lat/lng güncellenir.

İstersen “adres değişti” geldiğinde eski adresi history’de tutarız (KVKK süresine göre).

3) Adres cache + tekrar kullanma (performans + maliyet)

Aynı adres (ya da çok benzeri) birden fazla personelde varsa:

“AddressCache” tablosundan otomatik çekeriz.

Geocoding’i tekrar tekrar çağırmayız.

4) Vardiya listesi Excel’den gelse bile günlük tekrar yok

Excel’i her gün yükleme zorunluluğu yok:

Bir kere import → personeller DB’de durur.

Sonra sadece “ekle / çıkar / güncelle” yapılır.

İstersen Excel “bulk update” de olur ama yine adres değişmeyen kişide lat/lng değişmez.