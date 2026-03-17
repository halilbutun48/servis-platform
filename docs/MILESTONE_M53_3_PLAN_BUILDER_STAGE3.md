# M53.3 — Plan Builder Stage-3 Reorder + Transfer Completion

Status: **PLANNED**
Route token: **M53.3 PLAN BUILDER STAGE-3**

## Amaç
Plan Builder Stage-3 ekranını teknik deneme alanı olmaktan çıkarıp ürün akışı haline getirmek.

Bu adımda üç şey netleşir:
- durak sıralama / reorder hattı nerede yapılır
- **Talep ekranına aktar** butonu ne taşır, ne taşımaz
- Stage-3 parametreleri kullanıcı için anlaşılır hale gelir

## Mevcut durum
Şu anki repoda:
- **Uygula: N market shift oluştur** gerçek üretim butonudur
- **Talep ekranına aktar** sınırlı bir taslak aktarımıdır
- Plan Builder içinde `maxWalkM` vardır çünkü oluşturulan shift içinde stop üretiminde kullanılır
- OSRM / Matrix / Çöz akışı Stage-3 içinde yer alır

## Resmi karar
### Reorder yeri
Asıl durak sıralama düzenlemesi **Plan Builder Stage-3** içinde kalır.

### Shift Tools rolü
Shift Tools tarafı:
- import
- geo review
- stop generate
- mini preview
- hızlı düzeltme

Ama **asıl reorder / solve / matrix** tarafı Stage-3 içindedir.

## M53.3 içinde yapılacaklar
### 1) Parametre açıklığı
Kullanıcı şunu anlayabilmeli:
- `Sadece geoStatus=OK` ne yapar
- `Araç kapasitesi` neyi etkiler
- `Geohash precision` neyi etkiler
- `Stops generate maxWalkM` OSRM değil, stop üretiminde kullanılır
- `Stops'u OSRM+Solver ile sırala` neyi değiştirir

### 2) Talep ekranına aktar
Bu butonun mevcut davranışı sınırlıdır.
M53.3 içinde iki seçenekten biri seçilmelidir:
- gerçekten daha zengin veri taşır
- veya adı dürüst biçimde **Talep taslağına aktar** olarak güncellenir

### 3) Sonuç dili
Stage-3 kullanıcıya sade dil vermelidir:
- Matris alındı mı
- Çözüm üretildi mi
- Fallback mi kullanıldı
- Talep taslağına hazır mı
- Doğrudan market shift oluşturuldu mu

### 4) Hata / boş durumlar
- aktarılacak veri yok
- OSRM yok
- matrix alınamadı
- solve boş döndü
- review bekleyen veri kaliteyi düşürdü

## Definition of Done
M53.3 tamam sayılması için:
- parametreler açıklayıcı metinle anlaşılır hale gelmeli
- Talep ekranına aktar butonunun gerçek kapsamı kullanıcıya net anlatılmalı
- Stage-3 reorder / solve hattı kullanıcı açısından okunur olmalı
- boş/hata durumları sade Türkçe ile görünmeli
