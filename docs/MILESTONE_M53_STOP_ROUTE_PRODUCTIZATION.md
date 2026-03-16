# M53 — Stop & Route Productization

Status: **STARTED**  
Route token: **M53 STOP ROUTE PRODUCTIZATION**

## Amaç
M53 içinde yeni büyük rota algoritması yazmıyoruz. Önce mevcut **durak üretimi** ve **rota önizleme** davranışını ürün kuralı haline getiriyoruz.

Bu milestone ile:
- `maxWalkM` varsayılanları resmileşir
- durak üretimi sonrası gösterilecek özet netleşir
- rota kalite özetinde hangi sinyallerin görüneceği yazılı hale gelir
- preview / harita tarafında korunacak standartlar tanımlanır

---

## M53.1 — Stop Policy Contract

### Resmi varsayılanlar
- **Company default `maxWalkM` = 250**
- **School default `maxWalkM` = 50**
- **Backend hard limit = 50 .. 2000**

### Rol ve yetki
- **Company** kendi vardiyası için `maxWalkM` değerini değiştirebilir
- **School** kendi vardiyası için `maxWalkM` değerini değiştirebilir
- **Room** sonucu görür, değerlendirir ve operasyonel olarak kullanır
- Backend limit dışında değer kabul edilmez

### Stop generation sonrası minimum summary
- toplam kişi
- üretilen durak sayısı
- tekil kalan kişi sayısı
- `maxWalkM` içinde kapsanan kişi sayısı
- review gerektiren kişi sayısı
- durak başına kişi dağılımı

### Route quality summary
- toplam durak
- tahmini km
- tahmini süre
- başlangıç noktası
- **OSRM mi / fallback mi** kullanıldığı
- rota sıralaması üretildi mi

### Preview standardı
Harita önizlemede korunacak minimum standartlar:
- stop sırası
- stop etiketleri
- kişi sayısı badge
- başlangıç noktası
- rota çizgisi
- **Tam Rotayı Dış Navigasyonda Aç** davranışı korunur
- **Sonraki hedef / durak navigasyonu** mantığı bozulmaz

### Tekil kişi / dışarıda kalan mantığı
Aşağıdaki durumlar summary veya quality alanında görünür olmalıdır:
- tek kişi için ayrı durak açıldı mı
- `maxWalkM` sınırı nedeniyle gruplanamayan kişi var mı
- review bekleyen kayıt yüzünden dışarıda kalan kişi var mı

---

## Definition of Done
M53.1 tamam sayılması için:
- yukarıdaki varsayılanlar ve limitler dokümana işlenmiş olmalı
- Company 250 / School 50 kararı resmi yazılmış olmalı
- stop summary için minimum alanlar yazılı olmalı
- route quality summary için minimum alanlar yazılı olmalı
- preview standardı yazılı olmalı
- M53.2 UI/backend iyileştirmesine temiz geçiş zemini oluşmalı

---

## M53.2 için hazırlanan işler
- stop generation summary’yi UI’da görünür kılma
- `maxWalkM` preset / input standardı
- route quality summary’yi preview yanında gösterme
- stop başına kişi dağılımını daha okunur yapma
- tekil kişi / review kaynaklı dışarıda kalma nedenlerini kullanıcıya anlatma
