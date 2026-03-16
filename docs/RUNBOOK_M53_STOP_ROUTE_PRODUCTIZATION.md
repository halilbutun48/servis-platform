# RUNBOOK — M53 Stop & Route Productization

## 1) Resmi karar
Bu runbook M53.1 için kanonik ürün kararlarını taşır.

### Stop policy default
- Company: **250 m**
- School: **50 m**
- Backend hard limit: **50 .. 2000**

Not:
- School için `1` gibi değerler kabul edilmez
- Varsayılan düşük / güvenli değer School için 50’dir

---

## 2) Kullanıcı tarafında beklenen davranış

### Company / School
Durak üretmeden önce veya üretirken:
- kullanıcı `maxWalkM` değerini görür
- uygun ise değiştirebilir
- generate sonrası summary görür

### Room
- sonucu görür
- operasyonel uygunluğunu değerlendirir
- preview / rota kalitesine göre karar verir

---

## 3) Stop generation summary contract
Generate sonrası minimum şu alanlar görünür olmalıdır:
- **Toplam kişi**
- **Durak sayısı**
- **Tekil kişi sayısı**
- **Kapsanan kişi sayısı** (`maxWalkM` içinde)
- **Review bekleyen kayıt sayısı**
- **Durak başına kişi dağılımı**

Opsiyonel ama faydalı:
- en kalabalık durak
- boş/iptal durak var mı
- cluster sonrası dışarıda kalan kişi sayısı

---

## 4) Route quality summary contract
Preview veya route çıktısında minimum şu alanlar görünür olmalıdır:
- **Toplam durak**
- **Tahmini km**
- **Tahmini süre**
- **Başlangıç noktası**
- **OSRM / fallback** bilgisi
- **Rota sıralaması üretildi mi**

Opsiyonel ama faydalı:
- kişi başına ortalama yürüme
- tahmini rota yoğunluğu
- durak başına ortalama kişi

---

## 5) Preview standardı
Preview / mini harita / rota önizleme tarafında korunacak standart:
- stop sıra numaraları görünür
- stop etiketleri görünür
- stop başına kişi sayısı badge görünür
- başlangıç noktası görünür
- rota çizgisi görünür
- **Tam Rotayı Dış Navigasyonda Aç** capability korunur
- **Sonraki hedef navigasyonu** capability korunur

---

## 6) Tekil kişi / dışarıda kalma açıklaması
Summary veya detail alanında kullanıcıya şu durumlar açık olmalıdır:
- kişi tek başına durak oldu
- `maxWalkM` sınırı nedeniyle gruba giremedi
- review beklediği için durak planına tam alınamadı
- koordinat / adres kalitesi nedeniyle rota dışı kaldı

---

## 7) M53.2 teknik hedefi
Bir sonraki teknik adımda şu işler hedeflenir:
- `maxWalkM` UI standardı
- summary kartı
- route quality kartı
- stop dağılımı görünürlüğü
- tekil kişi / review açıklamaları
