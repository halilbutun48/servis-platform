# NEXT BACKLOG V1

Tarih: 2026-03-28
Timezone: Europe/Istanbul

Current direction: **M75 living baseline -> M76A/M76B/M76A-2 normalizasyon green -> M77 KVKK/uyum green -> M78 checklist/operasyon doğrulama iskeleti green -> M78.1 ürün yüzeyi -> M78.2 kayıt katmanı -> M78.3 özet/filtre -> M79**

## 1) Resmi durum
- `M75` yaşayan teknik taban olarak kabul edilir.
- `M76A-1`, `M76B`, `M76A-2` kanonik normalizasyon/konsolidasyon fazlarıdır.
- `M77` artık salt iskelet değil; `M77.1` içerik omurgası, `M77.2` enforcement skeleton, `M77.3` payload daraltma/redaction, `M77.4` response hardening ve `M77.5` retention/export-trail enforcement katmanına ulaşmıştır.
- `M78` checklist / operasyon doğrulama iskeleti green durumdadır; ilk turda belge + pack/check + manifest + living static bağı açılmıştır.
- `M78.1` minimal operasyon doğrulama yüzeyi açılır; role göre okuma ekranı super admin içine girer ama kalıcı kayıt akışı henüz açılmaz.
- `M78.2` aynı ekranı ilk yazılabilir katmana taşır; durum, kanıt tipi, kısa not ve referans metni JSON store üstünden kaydedilir.
- `M78.3` aynı ekranı daha okunur hale taşır; filtre, son güncelleyen / son güncelleme ve export görünürlüğü açılır.

## 2) Hemen sonraki ana faz
1. `M79` ile M78.3 üstüne kayıtları daha kalıcı omurga ve özet rapora bağla
2. `M80` ile kanıt / proof kayıt ve rapor özetlerini derinleştir
3. `M81` ile karar kuralları ve tekrar kontrol kapatma şartlarını sertleştir
4. DB anonymize gerektiren tabloları ayrı backlog olarak çıkar
5. driver/parent dışındaki consent enforcement kararını kontrollü aç

Tarihsel uyumluluk notu: M65/M66 sonrası `M0-M66 rerun + cleanup + saha testi` dili bazı fallback check scriptlerinde hâlâ kabul edilen marker olarak korunur.

## 3) Kanonik komutlar
- `tools\pack.ps1 -To 78 -RepoDir D:\servis-platform -NoBuild`
- `tools\pack_living.ps1 -To 78 -RepoRoot D:\servis-platform -NoBuild`
- `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- `tools\verify_living_runtime.ps1 -To 78 -RepoRoot D:\servis-platform -NoBuild`
- `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m77_kvkk_uyum_katmani.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m78_checklist_operasyon_dogrulama.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m78_1_operasyon_dogrulama_yuzeyi.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m78_2_operasyon_dogrulama_kayit_katmani.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m78_3_operasyon_dogrulama_ozet_filtre_katmani.ps1 -RepoRoot D:\servis-platform`

## 4) M77.5 odak notu
- `backend/src/kvkk/retention.js` retention ve export audit izini tek helper katmanına bağlar
- `GET /api/kvkk/retention` policy + anonymize hedefleri görünür kılar
- `POST /api/admin/retention/run` audit meta sanitize özet taşır
- `GET /api/logs/export` ve `GET /api/admin/logs/export` audit meta ham email/ip filtrelerini tekrar yazmaz
- M78 sonrası doğru iş: M78.1 yüzeyi -> M78.2 ilk yazılabilir kayıt -> M78.3 özet/filtre katmanı -> M79 daha kalıcı omurga/özet rapor -> M80/M81 derinleştirme + gerçek DB anonymize backlog

## 5) İlk cümle
Repo şu an `M0 -> M78` master green durumundadır. Bir sonraki doğru iş, M78.3 ile yüzeyi daha okunur hale getirdikten sonra M79 yönünde daha kalıcı omurga ve özet rapora bağlamaktır.
