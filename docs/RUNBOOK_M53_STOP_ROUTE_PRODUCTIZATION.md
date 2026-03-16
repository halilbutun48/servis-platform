# PERSONEL-SERVIS V1 — RUNBOOK M53 STOP & ROUTE PRODUCTIZATION

## Amaç
Import ve geo review sonrası oluşan personel listesini daha güvenilir durak ve rota üretimine bağlamak.

## Mevcut taban
- M52 ile import + geo review akışı çalışıyor
- `maxWalkM` tabanlı stop generation var
- OSRM / fallback capability var
- route preview var

## Bu runbook'ta netleştirilecekler

### 1) maxWalkM kuralı
- varsayılan değer
- alt/üst sınırlar
- hangi kullanıcı değiştirebilir
- hangi ekranda görünür

### 2) Stop generation sonucu
Kullanıcıya şu özet dönmeli:
- kişi sayısı
- review sayısı
- kapsanan kişi sayısı
- dışarıda kalan kişi sayısı
- üretilen durak sayısı

### 3) Route quality sonucu
Kullanıcıya şu bilgi görünmeli:
- çözüm tipi: OSRM / fallback
- tahmini süre
- tahmini km
- durak sayısı
- kalite notu / uyarı

## Test senaryosu
1. Personel import et
2. Review kayıtlarını düzelt
3. Stop generation çalıştır
4. Üst summary doğru dönüyor mu kontrol et
5. Route preview aç
6. Tahmini km/süre ve çözüm tipi görünüyor mu kontrol et

## Not
Tam rota navigasyonu ve sonraki durak navigasyonu mevcut capability olarak korunur; M53 bunları kaldırmaz, görünürlüğünü ve güvenilirliğini güçlendirir.
