# PRIMER SNAPSHOT

<!-- TTL_PRESETS_PARENT_PUBLIC_LINKS_V1 -->

- Repo: `servis-platform`
- Branch: `main`
- Marka: `Vardis`
- Ürün: okul/öğrenci/veli ve personel/şirket/organizasyon alanlarını birlikte taşıyan karma servis platformu
- Teknik yaşayan taban: `M75 green baseline`
- Kanonik normalizasyon hattı: `M76A-1 + M76B + M76A-2`
- Operasyonel master doğrulama: `tools\pack.ps1 -To 77 -RepoDir D:\servis-platform -NoBuild`
- `tools/STABLE_TO.txt`: `77`
- Güncel uyum hattı: `M77 response-hardening + retention/export-trail-enforcement`
- M77.1 ile açılan ana belgeler:
  - `docs/KVKK_VERI_GORUNURLUK_MATRISI_V1.md`
  - `docs/KVKK_AYDINLATMA_ENVANTERI_V1.md`
  - `docs/KVKK_RETENTION_ANONIMLESTIRME_V1.md`
  - `docs/KVKK_AUDIT_ERISIM_IZI_V1.md`
- Rol seti: `SUPER_ADMIN / ROOM / COMPANY / DRIVER / PERSONEL / PARENT`
- Domain notu: `SCHOOL` ve `ORGANIZATION` auth role değil, `Company.kind` üstünden taşınan iş alanıdır
- TTL / link presetleri: `1 hafta / 1 ay / 6 ay / 1 yıl`
- Sonraki odak: DB anonymize backlog + kontrollü consent kararları, sonra M78

- Tarihsel M58 kabul notu: `pack_m58_final_pilot_readiness.ps1` komutu ve resmi green / manuel pilot kabul mantigi kanonik tarihseldir.

- M77.3 / M77.5 ile açılan ek belgeler: `KVKK_ENFORCEMENT_YUZEYI_V1.md`, `KVKK_REDACTION_ENFORCEMENT_V1.md`, `KVKK_RETENTION_ENFORCEMENT_V1.md`, `KVKK_EXPORT_ERISIM_IZI_V1.md`
