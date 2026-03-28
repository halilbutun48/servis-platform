# NEXT BACKLOG V1

Tarih: 2026-03-28
Timezone: Europe/Istanbul

Current direction: **M75 living baseline -> M76A/M76B/M76A-2 normalizasyon -> M77.1 content-foundation -> M77.2 enforcement skeleton -> M77.3 payload daraltma/redaction -> M77.4 response hardening -> M77.5 retention/export-trail -> M78**

## 1) Resmi durum
- `M75` yaşayan teknik taban olarak kabul edilir.
- `M76A-1`, `M76B`, `M76A-2` kanonik normalizasyon/konsolidasyon fazlarıdır.
- `M77` artık salt iskelet değil; `M77.1` içerik omurgası, `M77.2` enforcement skeleton, `M77.3` payload daraltma/redaction, `M77.4` response hardening ve `M77.5` retention/export-trail enforcement katmanına ulaşmıştır.

## 2) Hemen sonraki ana faz
1. `M77` pack'ini çalıştır ve retention/export-trail enforcement çıktısını doğrula
2. DB anonymize gerektiren tabloları ayrı backlog olarak çıkar
3. export / erişim izi için rate, alarm ve gözlem notlarını derinleştir
4. driver/parent dışındaki consent enforcement kararını kontrollü aç
5. sonra `M78` checklist / operasyon doğrulama fazını aç

## 3) Kanonik komutlar
- `tools\pack.ps1 -To 75 -RepoDir D:\servis-platform -NoBuild`
- `tools\pack_living.ps1 -To 76 -RepoRoot D:\servis-platform -NoBuild`
- `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- `tools\verify_living_runtime.ps1 -To 76 -RepoRoot D:\servis-platform -NoBuild`
- `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m77_kvkk_uyum_katmani.ps1 -RepoRoot D:\servis-platform`

## 4) M77.5 odak notu
- `backend/src/kvkk/retention.js` retention ve export audit izini tek helper katmanına bağlar
- `GET /api/kvkk/retention` policy + anonymize hedefleri görünür kılar
- `POST /api/admin/retention/run` audit meta sanitize özet taşır
- `GET /api/logs/export` ve `GET /api/admin/logs/export` audit meta ham email/ip filtrelerini tekrar yazmaz
- bir sonraki doğru iş: gerçek DB anonymize backlog + M78 checklist fazı

## 5) İlk cümle
Repo şu an green tabanda duruyor. Bir sonraki doğru iş, M77 altındaki retention/export-trail enforcement işini DB anonymize backlog ve kontrollü consent kararlarıyla tamamlayıp sonra M78 checklist fazını açmaktır.
