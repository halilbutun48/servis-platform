# NEXT BACKLOG V1

Tarih: 2026-03-28
Timezone: Europe/Istanbul

Current direction: **M75 living baseline -> M76A/M76B/M76A-2 normalizasyon green -> M77 response-hardening + retention/export-trail green -> M78**

## 1) Resmi durum
- `M75` yaşayan teknik taban olarak kabul edilir.
- `M76A-1`, `M76B`, `M76A-2` kanonik normalizasyon/konsolidasyon fazlarıdır.
- `M77` artık salt iskelet değil; `M77.1` içerik omurgası, `M77.2` enforcement skeleton, `M77.3` payload daraltma/redaction, `M77.4` response hardening ve `M77.5` retention/export-trail enforcement katmanına ulaşmıştır.

## 2) Hemen sonraki ana faz
1. `M65-M81` shared-doc/check hardening turunu yap
2. `M78` checklist / operasyon doğrulama fazını aç
3. DB anonymize gerektiren tabloları ayrı backlog olarak çıkar
4. export / erişim izi için rate, alarm ve gözlem notlarını derinleştir
5. driver/parent dışındaki consent enforcement kararını kontrollü aç

Tarihsel uyumluluk notu: M65/M66 sonrası `M0-M66 rerun + cleanup + saha testi` dili bazı fallback check scriptlerinde hâlâ kabul edilen marker olarak korunur.

## 3) Kanonik komutlar
- `tools\pack.ps1 -To 77 -RepoDir D:\servis-platform -NoBuild`
- `tools\pack_living.ps1 -To 77 -RepoRoot D:\servis-platform -NoBuild`
- `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- `tools\verify_living_runtime.ps1 -To 77 -RepoRoot D:\servis-platform -NoBuild`
- `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m77_kvkk_uyum_katmani.ps1 -RepoRoot D:\servis-platform`

## 4) M77.5 odak notu
- `backend/src/kvkk/retention.js` retention ve export audit izini tek helper katmanına bağlar
- `GET /api/kvkk/retention` policy + anonymize hedefleri görünür kılar
- `POST /api/admin/retention/run` audit meta sanitize özet taşır
- `GET /api/logs/export` ve `GET /api/admin/logs/export` audit meta ham email/ip filtrelerini tekrar yazmaz
- bir sonraki doğru iş: gerçek DB anonymize backlog + M78 checklist fazı

## 5) İlk cümle
Repo şu an `M0 -> M77` master green durumundadır. Bir sonraki doğru iş, shared-doc/check hardening turunu güvenle tamamlayıp sonra M78 checklist fazını açmaktır.
