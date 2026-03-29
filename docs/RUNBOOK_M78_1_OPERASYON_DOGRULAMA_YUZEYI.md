# RUNBOOK — M78.1 OPERASYON DOĞRULAMA YÜZEYİ

Amaç: `M78` ile açılan checklist / proof / karar omurgasını ürün içine minimum bir super admin ekranı olarak taşımak.

## Kapsam
- super admin altında tek bir "Operasyon Doğrulama" ekranı
- rol seçimi: `SUPER_ADMIN / ROOM / COMPANY / DRIVER / PERSONEL / PARENT`
- durum özeti: `KABUL / RED / EKSİK / TEKRAR KONTROL`
- kanıt türleri: ekran görüntüsü, log/export izi, cihaz/build bilgisi, operatör notu
- ilk turda kalıcı DB yazımı yok; yüzey read-only iskelet olarak açılır

## Neden bu kadar küçük?
Bu adım bilinçli olarak dar tutulur.
Önce ürün içinde sade ve anlaşılır bir okuma yüzeyi açılır.
Kalıcı kayıt, raporlama ve karar sertleştirme bir sonraki adıma bırakılır.

## API yüzeyi
- `GET /api/operation-verification/manifest`
- `GET /api/operation-verification/role-surface?role=ROOM`
- `GET /api/operation-verification/status-options`
- `GET /api/operation-verification/proof-options`

Bu yüzey şimdilik `SUPER_ADMIN` ile korunur.

## Web yüzeyi
- route: `/superadmin/operation-verification`
- panel adı: `M78.1 Operasyon Doğrulama Yüzeyi`
- hızlı amaç: seçili rol için kısa kontrol listesi, durum özeti ve kanıt beklentisini aynı yerde göstermek

## Başarı ölçütü
- kullanıcı rol seçebilmeli
- seçili rol için kontroller tek tabloda okunmalı
- kanıt türleri sade etiketlerle görünmeli
- `STABLE_TO` değeri değişmeden `78` kalmalı
- pack/check tek başına koşabilmeli

## Sonraki doğru iş
- `M79` ile bu yüzeyi kalıcı kayıt ve karar akışına bağlamak
- kabul / red / eksik / tekrar kontrol sonucunu saklamak
- kanıt ekleme ve rapor özetini derinleştirmek
