# PRIMER SNAPSHOT

<!-- TTL_PRESETS_PARENT_PUBLIC_LINKS_V1 -->

- Repo: `servis-platform`
- Branch: `main`
- Marka: `Vardis`
- Ürün: okul/öğrenci/veli ve personel/şirket/organizasyon alanlarını birlikte taşıyan karma servis platformu
- Teknik yaşayan taban: `M75 green baseline`
- Kanonik normalizasyon hattı: `M76A-1 + M76B + M76A-2`
- Operasyonel master doğrulama: `tools\pack.ps1 -To 78 -RepoDir D:\servis-platform -NoBuild`
- `tools/STABLE_TO.txt`: `78`
- Güncel uyum hattı: `M77 KVKK + Uyum Katmanı`
- Güncel operasyon doğrulama hattı: `M78 Checklist + Operasyon Doğrulama`
- M77.1 ile açılan ana belgeler:
  - `docs/KVKK_VERI_GORUNURLUK_MATRISI_V1.md`
  - `docs/KVKK_AYDINLATMA_ENVANTERI_V1.md`
  - `docs/KVKK_RETENTION_ANONIMLESTIRME_V1.md`
  - `docs/KVKK_AUDIT_ERISIM_IZI_V1.md`
- Rol seti: `SUPER_ADMIN / ROOM / COMPANY / DRIVER / PERSONEL / PARENT`
- Domain notu: `SCHOOL` ve `ORGANIZATION` auth role değil, `Company.kind` üstünden taşınan iş alanıdır
- TTL / link presetleri: `1 hafta / 1 ay / 6 ay / 1 yıl`
- M78.1 minimal operasyon doğrulama yüzeyi: `super admin` altında role göre okuma ekranı
- M78.2 ilk yazılabilir kayıt katmanı: aynı ekranda durum + kanıt tipi + kısa not + referans metni kaydı
- M78.3 özet + filtre katmanı: aynı ekranda filtreler, son güncelleyen / son güncelleme ve export görünürlüğü
- Sonraki odak: M79 ile M78.3 üstüne daha kalıcı omurga ve özet rapora bağlamak, sonra M80/M81

- Tarihsel M58 kabul notu: `pack_m58_final_pilot_readiness.ps1` komutu ve resmi green / manuel pilot kabul mantigi kanonik tarihseldir.

- M77.3 / M77.5 ile açılan ek belgeler: `KVKK_ENFORCEMENT_YUZEYI_V1.md`, `KVKK_REDACTION_ENFORCEMENT_V1.md`, `KVKK_RETENTION_ENFORCEMENT_V1.md`, `KVKK_EXPORT_ERISIM_IZI_V1.md`
- M78 ile açılan belgeler: `SAHA_KABUL_CHECKLISTLERI_V1.md`, `ROL_BAZLI_OPERASYON_DOGRULAMA_V1.md`, `KANIT_PROOF_KONTROL_OMURGASI_V1.md`, `KABUL_RED_EKSIK_TEKRAR_KONTROL_AKISI_V1.md`
