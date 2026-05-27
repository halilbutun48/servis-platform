# COPILOT DEMAND TO AGREEMENT ROADMAP 01

Tarih: 2026-05-27  
Repo: `servis-platform`

## Amaç
- Demand-to-Agreement akışını Sefer Abi'nin hazırlayıp kullanıcıya onaylattığı canonical yol olarak sabitlemek.
- Bu belge runtime davranışı değil, yol haritasını kilitler.

## Canonical akış
```text
Personel / öğrenci listesi
↓
Ad-soyad-adres alanları okunur
↓
Adreslerden koordinat çıkarılır
↓
Eksik / şüpheli adresler kullanıcıyla düzeltilir
↓
Toplanma / varış konumu belirlenir
↓
Yürüme mesafesi belirlenir
↓
Durak adayları oluşturulur
↓
OSRM ile rota / km / süre çıkarılır
↓
Kaynak vardiya / market shift taslağı oluşur
↓
Uygun Room / tedarikçiler shortlist edilir
↓
Teklif talebi hazırlanır
↓
Kullanıcı onaylarsa teklif talebi gönderilir
↓
Gelen teklifler fiyat / kalite / SeferPuanı / rota / kapasite / risk ile analiz edilir
↓
Pazarlık / karşı teklif taslağı hazırlanabilir
↓
En uygun teklif gerekçeleriyle önerilir
↓
Kullanıcı seçerse "Bu teklifi sözleşmeye dönüştürmek ister misiniz?" onayı sorulur
↓
Kullanıcı onaylarsa kaynak vardiya + seçilen teklif + rota / durak + fiyat sözleşme taslağına dönüşür
↓
Agreement oluşur
↓
Source lineage korunur
↓
Agreement aktif olunca 7 günlük rolling vardiyalar üretilir
```

## Onay sınırı
- Teklif göndermeden önce kullanıcı onayı gerekir.
- Sözleşmeye dönüştürme öncesi kullanıcı onayı gerekir.
- Kritik işlemler otomatik uygulanmaz.

## Source lineage kuralı
- Agreement tek başına ana ticari kaynak değildir.
- Source vardiya / market shift / teklif seçimi kanıtı yoksa `EXISTING_IMPORTED` veya `INSUFFICIENT_LINEAGE` fallback'i kullanılır.
- Mevcut / manuel / pilot / legacy kaynak başarı payı doğurmaz.

## Sefer Abi rolü
- Kısayolu hazırlayan kişidir.
- Riskleri açıklar.
- Aksiyon kartını üretir.
- Kullanıcı onayını bekler.
- Uygulamayı tek başına yapmaz.

