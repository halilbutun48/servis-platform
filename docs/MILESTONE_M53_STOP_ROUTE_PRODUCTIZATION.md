# PERSONEL-SERVIS V1 — M53 STOP & ROUTE PRODUCTIZATION

Last updated: **2026-03-16**  
Depends on: **M52 import + geo pipeline**  
Current direction: **M53 stop generation ve route quality ürünleştirme**

## Amaç
M52 sonunda import ve geo review hattı çalışır hale geldi.  
M53'ün amacı, bu veriyi **daha güvenilir durak üretimi** ve **daha anlaşılır rota kalitesi** akışına çevirmektir.

Bu milestone'da sıfırdan route solver yazılmayacak.  
Var olan stop generation + OSRM capability, ürün seviyesinde kurala ve görünürlüğe bağlanacaktır.

## Kapsam

### 1) Stop generation policy
- `maxWalkM` resmi ürün kuralı
- varsayılan değer, alt/üst sınır, UI davranışı
- stop generation çıktısında kalite özeti
- review gerektiren kişiler ve dışarıda kalanlar görünürlüğü

### 2) Route quality visibility
- rota çözümü hangi modda üretildi:
  - OSRM
  - fallback
- tahmini km / süre görünürlüğü
- stop sayısı ve kapsama bilgisi
- route preview ve kalite notu

### 3) Company → ROOM akışı için daha temiz taslak
- stop/route üretildikten sonra bunun gerçekten operasyonel taslak gibi görünmesi
- kullanıcıya “hazır / review gerekir / eksik veri var” netliği

## M53 içinde yapılacaklar

### M53.1 — Stop Policy Contract
- `maxWalkM` ürün standardı
- varsayılan değer
- kabul edilen aralık
- UI açıklaması

### M53.2 — Stop Generation Summary
- kaç kişi kapsandı
- kaç kişi dışarıda kaldı
- review gerektiren kayıt sayısı
- üretilen durak sayısı

### M53.3 — Route Quality Summary
- OSRM / fallback bilgisi
- tahmini km / süre
- stop sayısı
- kalite notu

### M53.4 — Route Preview Hardening
- preview daha açıklayıcı hale gelir
- tam rota / sonraki durak capability kaybolmaz
- route status metni sadeleşir

## M53 dışında
- ileri batch geocode zekâsı
- iOS release lane
- no-show / penalty
- full KVKK matrix
- saha testi

## Done kriteri
M53 tamam sayılmak için:
- stop generation kuralları yazılı ve görünür olmalı
- `maxWalkM` standardı net olmalı
- stop generation sonucu summary dönmeli
- route kalite bilgisi UI'da anlaşılır görünmeli
- kullanıcı stop/route üretimi sonrası ne kadar güvenilir sonuç aldığını anlayabilmeli

## Sonraki adım
Bu milestone sonrası doğal sıra:
- **M54 — ROOM Dispatch Completion**
- veya gerektiğinde küçük bir **M52.3-B batch geocode refinement**
