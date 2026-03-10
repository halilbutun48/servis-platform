# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — PRIMER SNAPSHOT (Yapıştır & Devam Et)

Tarih: 2026-03-10  
Timezone: Europe/Istanbul

## 0) Mevcut durum / referans

Repo: `D:\servis-platform`

Current GREEN / hygiene ref:
- ✅ `M41 PACK PASS`
- ✅ `M42 OPTIONAL PACK PASS`
- ✅ `STEP 0.6 STABIL PACK PASS`
- ✅ `STEP 1 SECURITY FOUNDATION PACK PASS`
- ✅ `STEP 1 TOTP STEP-UP PACK PASS`
- ✅ `M104 REPO CLEANUP CHECK PASS`
- ✅ `M105 TOOLS HYGIENE CHECK PASS`
- ✅ `M106 REPO HYGIENE + LINK TTL CHECK PASS` *(M106.1 ile parent preset UI senkronu kapatıldı)*

Ana komut hattı:
- `./tools/pack.ps1 -To 41`
- `./tools/pack_m42_optional.ps1`
- `./tools/pack_step06_stabil.ps1`
- `./tools/pack_step1_security_foundation.ps1`
- `./tools/pack_step1_totp_stepup.ps1`
- `./tools/check_repo_cleanup_m104.ps1 -RepoRoot D:\servis-platform`
- `./tools/check_tools_hygiene_m105.ps1 -RepoRoot D:\servis-platform`
- `./tools/check_repo_hygiene_m106.ps1 -RepoRoot D:\servis-platform`

---

## 1) Resmi yeşil kapsam

### 1.1 V1 ana regresyon
- auth / refresh / revoke / device mismatch
- RBAC / route guard
- agreement
- offer / counter / accept
- route/stops
- live/ws/gps
- rate-limit mini stres
- audit / retention
- learning
- hepsi `M41 PACK PASS` altında yeşil

### 1.2 M42 Optional Release
- check-in modülü optional release olarak hazır
- `FEATURE_CHECKIN=0` iken dormant
- `FEATURE_CHECKIN=1` iken ayrı optional pack ile doğrulanmış
- `M42 OPTIONAL PACK PASS`

### 1.3 Step 0.6 Stabil
- capacity / pool / auto-split
- split parent cleanup
- school parent invite + public accept
- shift preview external nav
- company list click details

### 1.4 Step 1 Security Foundation
- refresh reuse detection
- export limiter
- login/gps/export limit hattı
- RBAC deny-by-default sanity matrix

### 1.5 Step 1 TOTP Step-up
- `ROOM` + `SUPER_ADMIN` için TOTP setup/enable/verify
- login response içinde `stepUpRequired`
- setup olmadan kritik write/admin endpointler blok
- verify sonrası geçici `stepUpUntil` ile erişim açılıyor
- `COMPANY` ve `DRIVER` bu guard’dan etkilenmiyor

---

## 2) Repo hygiene durumu

### 2.1 M104 Repo Cleanup
- stale duplicate route/panel/bak dosyaları arşive alındı
- `README / STARTPACK / CHECKLIST / SSOT` hizalandı
- aktif ağaçtan stray `src/`, `scripts/`, `rlays/` temizlendi

### 2.2 M105 Tools Hygiene
- `tools/` kökte sadece kanonik pack/gate/check hattı bırakıldı
- legacy overlay/apply/readme dosyaları `tools/_archive/*` altına taşındı
- `tools/README.md` kanonik kullanım kılavuzu olarak güncellendi

### 2.3 M106 Repo Hygiene + Link TTL
- stale `tools/_overlay_payload/primer_refresh` arşive alındı
- stale `infra/infra/solver/Dockerfile` arşive alındı
- link süre politikası parent + personel tarafında uzun presetlere çekildi

Aktif ağaçta kritik çakışan/stale dosya görünmüyor. Kalan yoğunluk büyük ölçüde bilinçli `docs/_archive`, `tools/_archive`, `tools/_backup` altında.

---

## 3) Parent / personel link süre politikası

### 3.1 School parent invite
- presetler: **1 hafta / 1 ay / 6 ay / 1 yıl**
- backend üst limit: **365 gün**
- public accept akışı korunur

### 3.2 Personel / öğrenci public canlı link
- presetler: **1 hafta / 1 ay / 6 ay / 1 yıl**
- backend üst limit: **365 gün**
- default: **7 gün**
- shift `endAt` ile zorunlu clamp yok
- ham token yalnız ilk üretimde gösterilir

### 3.3 Ürün kararı
- `PERSONEL` için zorunlu login **şart değil**
- login opsiyonel kalabilir
- varsayılan düşük sürtünmeli erişim modeli: **süreli kişisel link**
- `COMPANY / ROOM / SUPER_ADMIN / DRIVER` login’li kalır

---

## 4) SSOT / doküman / araç hattı

Kanonik SSOT hattı:
- `tools/PRIMER_SNAPSHOT.md`
- `tools/CHECKLIST_SSOT.md`
- `tools/README.md`
- `docs/PRIMER_SSOT.md`
- `docs/CHECKLIST_SSOT.md`
- `docs/STARTPACK_V1.md`
- `docs/API_SPEC_V1.md`
- `docs/DB_SCHEMA_V1.md`
- `docs/UI_SPEC_V1.md`
- `docs/PROJECT_SPEC_V1.md`

Overlay / geçmiş izler:
- `docs/overlays/`
- `docs/_archive/`
- `tools/_archive/`
- `tools/_backup/`

Çalışma tercihi:
- değişiklikler mümkün olduğunca **tek seferde overlay zip**
- tek **Guided Mode/Stepper**, diğerleri **Advanced**
- yanıtlarda en fazla **3 PowerShell komutu**

---

## 5) Bir sonraki resmi adım

## Step 2 — M43 Google Auth + Invite Gate

Sıradaki resmi iş:
- Google Auth (GIS)
- invite tablosu / accept akışı
- role/scope bağlama
- invite yoksa reject
- runtime check + repo-contract + tek pack

Not:
- mevcut school parent invite/public accept pattern’i var
- personel public live link pattern’i de var
- M43 için en doğru yaklaşım: sıfırdan auth değil, **Identity + Invite Gate** çizgisine oturtmak

Ardından:
- Step 2.5 / M44 Telematics
- Step 2.6 / M45 Retention + Backup
- sonra V2 başlıkları

---

## 6) Yeni sohbet açınca ilk cümle önerisi

“Repo şu an M41 PACK PASS + M42 OPTIONAL PACK PASS + STEP 0.6 STABIL PACK PASS + STEP 1 SECURITY FOUNDATION PACK PASS + STEP 1 TOTP STEP-UP PACK PASS + M104 REPO CLEANUP CHECK PASS + M105 TOOLS HYGIENE CHECK PASS durumunda. Parent invite ve personel public link süre presetleri 1 hafta / 1 ay / 6 ay / 1 yıl. PERSONEL için login zorunlu değil; süreli kişisel link modeli aktif tasarım kararı. Sıradaki iş M43 Google Auth + Invite Gate; mevcut repoya göre tek overlay zip olarak ilerleyelim.”
