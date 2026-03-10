# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — PRIMER SNAPSHOT (Yapıştır & Devam Et)

Tarih: 2026-03-10  
Timezone: Europe/Istanbul

## 0) Mevcut durum / referans

Repo: `D:\servis-platform`

Current GREEN ref:
- ✅ `M41 PACK PASS`
- ✅ `M42 OPTIONAL PACK PASS`
- ✅ `STEP 0.6 STABIL PACK PASS`

Ana kural:
- `tools/pack.ps1 -To 41` = ana regresyon kanıtı
- `tools/pack_m42_optional.ps1` = M42 optional kanıtı
- `tools/pack_step06_stabil.ps1` = Step 0.6 stabil ekler kanıtı

Durum özeti:
- M41 ana regresyon yeşil
- M42 check-in modülü optional ve yeşil
- Step 0.6’daki stabil ekler artık sadece manuel doğrulanmış değil; mini-check + repo-contract ile resmi olarak doğrulanmış durumda

---

## 1) Step 0.6’da resmi doğrulanan kapsam

Aşağıdaki başlıklar artık çalışan + kontrol edilen state’te:

### 1.1 Capacity / Pool / Auto-split
- room approve ekranında kapasite/pool summary çalışıyor
- gerçek müsait araç kombinasyonuna göre split approve çalışıyor
- root shift `SPLIT` oluyor
- child shift’ler oluşuyor
- split parent cleanup var; root/list akışını kirletmiyor

### 1.2 School / Parent Invite
- SCHOOL menüsünde parent link görünürlüğü var
- parent invite create/list akışı çalışıyor
- public accept-parent-invite akışı çalışıyor
- accepted parent login olabiliyor
- parent `/api/me` doğrulanıyor

### 1.3 Shift Preview / External Navigation
- Shift Harita Önizleme içinde dış navigasyon açma aksiyonu var
- `0,0` koordinatı filtreleniyor
- dış navigasyon yeni sekmede açılıyor
- `noopener,noreferrer` kullanılıyor
- preview açıklama notu mevcut

### 1.4 Company List Click Details
- company vardiya listesinde araç plakası tıklanınca detay açılıyor
- sürücü adı tıklanınca detay açılıyor
- araç/sürücü detail modal başlıkları mevcut

---

## 2) SSOT / doküman durumu

SSOT hattı güncel mantık:
- `tools/CHECKLIST_SSOT.md` = yaşayan checklist referansı
- `docs/CHECKLIST_SSOT.md` SSOT ile hizalanmış olmalı
- `docs/PRIMER_SSOT.md`
- `docs/STARTPACK_V1.md`
- `tools/PRIMER_SNAPSHOT.md`

Overlay/dağınıklık temizliği:
- overlay notları `docs/overlays/` altında toplanmış durumda
- Step 0.6 izleri `docs/overlays/STEP06/` altında

---

## 3) Bu aşamaya gelirken yapılan kritik düzeltmeler

### 3.1 Step 0.6 runtime mini-check
- `backend/scripts/step06_stabil_check.js` eklendi/düzeltildi
- pool/split + school parent invite akışı gerçek runtime check ile doğrulandı

### 3.2 Step 0.6 repo-contract check
- `tools/check_step06_repo_contract.ps1`
- `tools/pack_step06_stabil.ps1`
- external nav, click-details, parent invite route/panel/nav bağları repo contract ile doğrulanıyor

### 3.3 Hotfix notu
- ilk Step 0.6 check fail nedeni script payload contract uyumsuzluğuydu; düzeltildi
- repo-contract `_blank/noopener/noreferrer` kontrolü false-negative veriyordu; düzeltildi

---

## 4) Şu an sistemin kanıtlı çalışma sınırı

### V1 ana referans
- auth / RBAC / revoke / device mismatch
- agreement
- offer
- route/stops
- live/ws/gps
- rate-limit mini stres
- audit/retention
- learning
- hepsi M41 pack içinde yeşil

### Optional
- M42 check-in modülü ayrı optional release olarak yeşil

### Stabil ekler
- Step 0.6 stabil pack ile yeşil

---

## 5) Bundan sonraki net öncelik

## Step 1 — V1.5 Minimum Security
Sıradaki iş artık burası:

- WAF login/gps/export path limitleri
- ROOM + SUPER_ADMIN zorunlu TOTP step-up
- refresh reuse detection
- RBAC deny-by-default test harness

Amaç:
- mevcut yeşil referansı bozmadan güvenlik katmanını resmi milestone haline getirmek

---

## 6) Çalışma kuralları / proje tercihleri

- Tek Guided Mode/Stepper; diğer araçlar Advanced
- Değişiklikler mümkün olduğunca tek seferde overlay (zip) olarak hazırlanacak
- Yanıtlarda en fazla 3 PowerShell komutu
- Ana referans: M41
- M42 optional ayrı doğrulanır
- Step 0.6 artık resmi stabil pack ile doğrulanmıştır

---

## 7) Hızlı doğrulama komutları

```powershell
.\tools\pack.ps1 -To 41
.\tools\pack_m42_optional.ps1
.\tools\pack_step06_stabil.ps1