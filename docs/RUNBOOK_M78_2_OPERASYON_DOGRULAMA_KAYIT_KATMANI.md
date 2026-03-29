# RUNBOOK M78.2 OPERASYON DOGRULAMA KAYIT KATMANI

## Amaç
M78.1 ile açılan read-only operasyon doğrulama ekranını ilk yazılabilir katmana taşımak.

## Bu turda açılanlar
- super admin altında aynı ekran üstünden kayıt yazma
- durum seçimi: kabul / red / eksik / tekrar kontrol
- tek kanıt tipi seçimi
- kısa not ve referans metni kaydı
- JSON store üstünden minimum kalıcı kayıt

## Bu turda bilerek açılmayanlar
- dosya upload
- çoklu kanıt seti
- DB tablo migrasyonu
- workflow tetikleme / otomatik karar kapatma

## Güvenlik notu
- okuma SUPER_ADMIN ile sınırlıdır
- yazma `requireStepUpWrite("SUPER_ADMIN")` koruması altındadır
- step-up tamam değilse kayıt denemesi 403 dönebilir; bu beklenen davranıştır

## Başarı ölçütü
- M78.2 repo-contract PASS
- M78.2 node check PASS
- super admin operasyon doğrulama ekranında en az bir satıra durum + not girilip kaydedilebilir
- kayıt sonrası satır `manuel kayıt` olarak görünür
- `tools/STABLE_TO.txt` yine `78` kalır
