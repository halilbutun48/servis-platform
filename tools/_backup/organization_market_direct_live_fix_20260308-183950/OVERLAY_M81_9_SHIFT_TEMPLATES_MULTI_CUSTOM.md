# OVERLAY M81.9 — Shift Templates: 2 Vardiya (Sabah+Akşam) Custom Edit

## Amaç
"Vardiya Şablonları" ekranında **2 vardiyalı paketleri** (örn. *Hafta içi Sabah + Akşam*) tek şablon olarak **net şekilde görüp** kaydedebilmek ve istenirse **özele çevirip** saatleri düzenleyebilmek.

## Değişiklikler
- `web/src/panels/company/ShiftTemplatesPanel.jsx`
  - Paket seçimi **çoklu vardiya** ise (2 item) artık form içinde **vardiya listesi** olarak görünür.
  - Çoklu vardiya paketlerinde **"Özele çevir (düzenle)"** butonu eklendi.
    - Paketi `CUSTOM` editörüne aktarır (Sabah+Akşam dahil) ve saatleri düzenletir.
  - `CUSTOM` modunda **2. vardiya ekleme/kaldırma** desteği eklendi.
  - `CUSTOM` şablon “Düzenle” açıldığında her zaman `CUSTOM` editörüne yüklenir (multi item dahil).

## Notlar
- Şablonlar **slot/saat/direction** içindir; gün/süre seçimi Agreement akışındadır (mevcut kurala uygun).
- Çoklu vardiya şablonlarında listede her vardiya için ayrı **Kullan (Sabah/Akşam)** butonu devam eder.

## Uygulama
Bu overlay bir dosya değiştirir; aynı path’e kopyala.

## Doğrulama
1) Company → Gelişmiş → **Vardiya Şablonları**
2) “Hafta içi Sabah + Akşam” seç → paket içinde 2 vardiya listesi görünmeli.
3) “Özele çevir (düzenle)” → CUSTOM editörde 2 vardiya input’u gelmeli.
4) Kaydet → Şablon listesinde tek satırda 2 vardiya (Sabah|Akşam) görünmeli.
