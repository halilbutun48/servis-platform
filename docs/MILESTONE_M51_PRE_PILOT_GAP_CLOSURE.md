# M51 — PRE-PILOT GAP CLOSURE (BACKLOG RESET + GAP REGISTER)

Timezone: Europe/Istanbul  
Status: **Planned / Start Now**  
Depends on: **v1-m50-green + post-M50 SSOT refresh**

## 1) Amaç

M51'in amacı yeni büyük özellik eklemek değildir.

Amaç:
- mevcut repo capability'lerini doğru sınıflandırmak,
- yanlış backlog beklentilerini temizlemek,
- saha testinden önce kapanması gereken eksikleri netleştirmek,
- sonraki milestone'lar için tek bir kanonik gap register üretmektir.

Kısa ifade:
**Önce eksikleri yazılı ve ölçülebilir hale getir, sonra teknik kapanış milestone'larına geç.**

---

## 2) Kapsam

M51 içinde yapılacak işler:

### 2.1 NEXT backlog reset
- `docs/NEXT_BACKLOG_V1.md` repo gerçeğine göre güncellenir
- "zaten var / kısmen var / eksik" ayrımı netleştirilir
- saha testi en sona konur

### 2.2 Navigation / mini map capability register
- Hangi rolde mini harita var
- Hangi rolde tam rota dış navigasyonu var
- Hangi rolde sonraki hedef / durak navigasyonu var
- Mobil sürücüde tam rota capability'nin ayrı doğrulama notu düşülür

### 2.3 Pre-pilot gap register
Aşağıdaki başlıklar için net gap listesi çıkarılır:
- Import / Excel / CSV
- Geocode / review / cache
- Stop generation / `maxWalkM`
- OSRM / fallback / route quality
- ROOM dispatch zinciri
- Reports / export
- No-show / görev reddi cezası
- KVKK matrix
- Mobile hardening

### 2.4 Milestone sırası sabitlenir
M52-M57 için sabit sıra:
- M52 Import & Geo Pipeline
- M53 Stop & Route Productization
- M54 ROOM Dispatch Completion
- M55 Reports + No-show
- M56 KVKK Matrix + ETA/Navigation Quality
- M57 Mobile Hardening

---

## 3) M51 DIŞINDA KALANLAR

Bu milestone içinde yapılmaz:
- gerçek saha testi / pilot
- iOS release lane
- ileri mobil güvenlik sertleştirmesi (pinning, attestation vb.)
- büyük ölçek tenant/enterprise genişleme
- kapsamlı yeni modül açılışı

---

## 4) Çıktılar

M51 sonunda şu çıktılar oluşmuş olmalı:
- güncel `docs/NEXT_BACKLOG_V1.md`
- bu milestone dosyası
- rol bazlı navigasyon / mini harita capability notu
- kanonik gap listesi
- M52-M57 sırasının yazılı onayı

---

## 5) Done Kriteri

M51 tamam sayılması için:
- backlog artık repoda zaten var olan capability'leri yeni iş gibi göstermemeli
- navigasyon / mini harita capability'leri yazılı kayıt altına alınmalı
- teknik eksikler milestone başlıklarına dağıtılmalı
- saha testi bilinçli olarak en sona taşınmış olmalı
- sonraki milestone'a doğrudan başlanabilir netlik oluşmalı

---

## 6) Sonraki Resmi Adım

M51 kapanınca doğrudan başlanacak iş:

**M52 — Import & Geo Pipeline**

İlk odak:
- import davranışı
- geocode orchestration
- review / retry / cache standardı

---

## 7) Kanonik Token

`M51 PRE-PILOT GAP CLOSURE`
