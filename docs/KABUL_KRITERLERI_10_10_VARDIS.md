# VARDIS / PERSONEL SERVIS V1
# 10/10 KABUL KRİTERLERİ

Tarih: 2026-04-04  
Durum: M82 saha öncesi sertleştirme hattı için kalite kapısı tanımı

Bu doküman, projeye "kurumsal kaliteye ulaştı", "10/10 seviyesine yaklaştı" veya "saha öncesi güven veriyor" denebilmesi için gerekli kabul kriterlerini tanımlar.

> Temel ilke: Bu projeye 10/10 demek için yalnızca çalışması yetmez; doğru, temiz, izlenebilir, modüler, sürdürülebilir ve ticari olarak genişlemeye hazır olması gerekir.

---

## 1. Backend doğruluğu

### Amaç
Backend tek kaynak gerçeklik olacak; web ve mobil, sessiz tutarsızlık üretmeyen güvenilir veri okuyacak.

### Sağlanması gerekenler
- Rota değişen her write işleminde route snapshot kesin yenilenmelidir.
- Stop add / update / delete / reorder / template apply / hub-direction-pattern değişimi aynı doğruluk zincirine bağlı olmalıdır.
- Route preview hiçbir durumda bayat veri göstermemelidir.
- Kritik çok adımlı yazma işlemleri transaction içinde olmalıdır.
- Sessiz veri bozulması üreten akış kalmamalıdır.
- Hata kontratı tek formatta çalışmalıdır.

### PASS olursa sonuç
- Route preview ve operasyon yüzeyleri backend gerçeğini güvenle gösterir.
- Kullanıcı bir işlemi yaptıktan sonra eski rota, eski state veya yarım yazılmış veri görmez.
- Web ve mobilde görülen davranış backend kaynaklı rastgelelik içermez.

### FAIL riski
- Bayat preview
- Bozuk stop sırası
- Yarım yazılmış rota verisi
- Farklı endpoint’lerde farklı hata formatı

---

## 2. Web / UI tutarlılığı

### Amaç
Web panelleri backend kontratına tam otursun; aynı veri farklı ekranlarda farklı anlam üretmesin.

### Sağlanması gerekenler
- Cache ve invalidate mantığı net olmalıdır.
- Modal, liste, harita ve detay ekranı aynı gerçeğe bakmalıdır.
- Kritik panellerde state yan etkileri azaltılmış olmalıdır.
- Ortak API hata modeli web’de tek şekilde ele alınmalıdır.
- Büyük panel dosyaları modüler bölünmüş olmalıdır.

### PASS olursa sonuç
- Kullanıcı bir ekranda gördüğünü başka ekranda teyit ederken çelişki yaşamaz.
- UI davranışı daha öngörülebilir olur.
- Bakım ve yeni geliştirme hızı artar.

### FAIL riski
- Aynı veri farklı panellerde farklı görünür.
- Route preview / modal / panel arasında senkron bozulur.
- Küçük değişiklik başka ekranı sessiz kırar.

---

## 3. Mobil saha güveni

### Amaç
Mobil uygulama sürücünün günlük işini gerçekten taşıyabilsin; yalnız omurga değil, kullanım kalitesi oluşsun.

### Sağlanması gerekenler
- Vardiya detayı okunur olmalıdır.
- Durak / rota akışı anlaşılır olmalıdır.
- Haritaya aç / navigasyon akışı güvenilir çalışmalıdır.
- Sürücünün telefon GPS’i durumu görünür olmalıdır.
- Background GPS davranışı öngörülebilir olmalıdır.
- Offline / retry / queue görünürlüğü bulunmalıdır.
- Yanlış env / yanlış build ile saha paketi çıkmamalıdır.
- 0 koordinatını geçersiz sayan truthy kontroller kaldırılmış olmalıdır.

### PASS olursa sonuç
- Sürücü “uygulama var ama ne yapacağım belli değil” hissi yaşamaz.
- Konum göndermeme sorunları daha kolay teşhis edilir.
- Saha testi daha kontrollü yürür.

### FAIL riski
- Navigasyon butonu ama anlamsız hedef
- Sessiz GPS düşmeleri
- Yanlış ortam URL’si ile çalışan ama sahada başarısız paket

---

## 4. Konum kaynağı kalitesi

### Amaç
Araç GPS’i ve sürücünün telefon GPS’i birbirine karışmasın; sistem en güvenilir kaynağı kuralla seçsin.

### Sağlanması gerekenler
- Konum kaynağı açıkça ayrılmış olmalıdır.
- Araç GPS’i varsa birinci kaynak olmalıdır.
- Sürücünün telefon GPS’i fallback olarak çalışmalıdır.
- Source arbitration kuralları deterministik olmalıdır.
- Kaynak çakışması varsa görünür hale getirilmelidir.
- “Son yazan kazanır” davranışı bitmiş olmalıdır.

### PASS olursa sonuç
- Canlı harita ve operasyon kararları daha güvenilir hale gelir.
- Telematics yatırımı gerçek değer üretir.
- Sürücü telefonu ile araç cihazı çakıştığında teşhis mümkündür.

### FAIL riski
- Rastgele kaynak seçimi
- Yanlış konumla ETA / canlılık hatası
- Telematics olmasına rağmen telefon verisinin baskın kalması

---

## 5. Ticari omurga

### Amaç
Sistem yalnız operasyon değil; ticari olarak da sürdürülebilir, kurallı ve genişlemeye hazır bir platform olsun.

### Sağlanması gerekenler
- Ödeme mantığı yalnız agreement’e bağlı kalmamalıdır.
- Ticari kaynak modeli bulunmalıdır: örn. AGREEMENT, SHIFT_SERIES.
- Payment mode desteklenmelidir: OFF / OPTIONAL / REQUIRED.
- Komisyon oranı Super Admin’den yönetilebilmelidir.
- Oda bazlı komisyon override desteklenmelidir.
- Ticari snapshot mantığı bulunmalıdır; eski kayıtlar sonradan bozulmamalıdır.
- Settlement omurgası ticari kaynakla uyumlu olmalıdır.

### PASS olursa sonuç
- Kısa iş, vardiya serisi ve sözleşmeli iş aynı ticari omurgada yönetilir.
- Sistem bugün kapalı/opsiyonel, yarın zorunlu ödeme modeline geçebilir.
- Komisyon gelir modeli mimariye yamalı değil, doğal şekilde oturur.

### FAIL riski
- Kısa işlerde komisyon modeli dışarıda kalır.
- Agreement olmayan işlerde ödeme mantığı kopar.
- Oran değişince eski kayıtlar bozulur.

---

## 6. Repo hijyeni

### Amaç
Repo dışarıdan bakan kişiye dağınık görünmesin; kurumsal ürün hissi versin.

### Sağlanması gerekenler
- Dist artıkları temizlenmiş olmalıdır.
- `.bak` ve geçici backup kalıntıları repo akışından çıkarılmış olmalıdır.
- Overlay backup ve benzeri geçici çıktılar temiz politika ile yönetilmelidir.
- Env paketleme politikası net olmalıdır.
- Encoding / mojibake bozulmaları temizlenmiş olmalıdır.
- Docs, tools ve SSOT aynı resmi göstermelidir.

### PASS olursa sonuç
- Repo paylaşılabilir, denetlenebilir ve güven veren hale gelir.
- Bakım yapan kişi neyin canlı, neyin geçici olduğunu daha kolay anlar.

### FAIL riski
- Yanlış dosyalar commit/export içine karışır.
- Eski/yeni durum birbirine karışır.
- Profesyonel görünüm bozulur.

---

## 7. Verification kalitesi

### Amaç
Check hattı yalnız “dosya var mı” diye bakmasın; gerçek kaliteyi ölçsün.

### Sağlanması gerekenler
- Runtime’a yakın smoke doğrulamaları bulunmalıdır.
- Route snapshot correctness check olmalıdır.
- GPS source arbitration check olmalıdır.
- API / UI contract smoke bulunmalıdır.
- Verify hot path güncel repo gerçeğini ölçmelidir.
- STARTPACK / README / tools / repo_contract_state aynı resmi vermelidir.

### PASS olursa sonuç
- “Pack geçti ama ürün kırık” riski ciddi azalır.
- Yeni değişiklikler daha erken yakalanır.
- Kalite yalnız elle test eden kişinin omzuna kalmaz.

### FAIL riski
- String arama geçti diye sahte güven oluşur.
- Gerçek runtime davranışı check zincirinin dışında kalır.

---

## 8. Modülerlik ve sürdürülebilirlik

### Amaç
Kod büyüdükçe çökmesin; başka geliştirici repo’ya girdiğinde dağılmasın.

### Sağlanması gerekenler
- En büyük dosyalar parçalanmış olmalıdır.
- Backend route / service / helper ayrımı netleşmiş olmalıdır.
- Web’de container / hook / section / modal ayrımı net olmalıdır.
- Tekrarlayan logic ortak helper/hook katmanına taşınmış olmalıdır.
- Yeni geliştirme küçük alanı etkileyebilmeli, tüm paneli kırmamalıdır.

### PASS olursa sonuç
- Bakım maliyeti düşer.
- Yeni özellik ekleme hızı ve güveni artar.
- Kod incelemesi ve test yazımı kolaylaşır.

### FAIL riski
- 2000+ satırlık dosyada küçük düzeltme büyük yan etki üretir.
- Bilgi tek dosyada sıkışır, ekip ölçeği küçülür.

---

## 9. Operasyonel güven

### Amaç
Sistem yalnız geliştirici için değil, işletme ve saha için de güven veren platform olsun.

### Sağlanması gerekenler
- Kritik olaylarda audit izi bulunmalıdır.
- Release / env guard’ları sıkı olmalıdır.
- Hatalar anlaşılır, izlenebilir ve tekrar üretilebilir olmalıdır.
- Saha testi plansız değil checklist ile yapılmalıdır.
- Operatör açısından kritik akışlar runbook ile desteklenmelidir.

### PASS olursa sonuç
- Hata çıktığında paniğe değil sürece dayanılır.
- Saha denemeleri ürün geliştirme girdisine döner.
- Kurumsal müşteri karşısında sistem daha güvenilir görünür.

### FAIL riski
- Kimin neyi değiştirdiği belirsiz kalır.
- Saha testi kişisel hafızaya bağlı yürür.
- Hata analizi zorlaşır.

---

## 10. Kurumsal his

### Amaç
Ürüne dışarıdan bakan kişi teknik ve operasyonel olgunluk hissetsin.

### Sağlanması gerekenler
- Arayüz dağınık görünmemelidir.
- Hata ve durum dili sade ama profesyonel olmalıdır.
- Teknik kararlar ürün davranışına düzgün yansıtılmalıdır.
- Sistem parça parça eklenmiş değil, bütüncül görünmelidir.

### PASS olursa sonuç
Dışarıdan bakan biri şunları diyebilmelidir:
- bu düşünülmüş
- bu toparlanmış
- bu büyür
- bu güven verir
- bu kurumsal

### FAIL riski
- Sistem “çalışıyor ama hobi projesi gibi” algılanır.
- Kurumsal müşteri güveni düşer.

---

# 10/10 Eşiği

Bu proje aşağıdaki durumda 10/10 seviyesine yaklaşmış sayılır:
- M82.1–M82.8 temiz ve tavizsiz kapanmışsa
- M82.9–M82.11 ticari olarak doğru yere yerleşmişse
- M83 saha hazırlığı eksiksiz çıkmışsa
- saha öncesi “şüpheli alan” bırakılmamışsa

---

# Kısa Sonuç

Bu projeye 10/10 demek için yalnız çalışması yetmez. Şunların birlikte sağlanması gerekir:
- doğru backend
- tutarlı web
- güvenilir mobil
- kurallı konum kaynağı
- sürdürülebilir kod yapısı
- temiz repo
- gerçek doğrulama hattı
- ticari olarak genişlemeye hazır mimari

Bu kapılar birlikte kapanırsa sistem yalnız iyi çalışan bir ürün değil, gerçekten kurumsal seviyede güven veren bir platform olur.
