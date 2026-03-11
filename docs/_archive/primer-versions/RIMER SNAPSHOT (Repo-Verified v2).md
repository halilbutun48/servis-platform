SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — PRIMER SNAPSHOT (Repo-Verified, Post-M45)

Tarih: 2026-03-11
Timezone: Europe/Istanbul

0) Mevcut durum / referans

Repo: D:\servis-platform

Ana resmi green durum:

✅ M41 PACK PASS

✅ M42 OPTIONAL PACK PASS

✅ STEP 0.6 STABIL PACK PASS

✅ STEP 1 SECURITY FOUNDATION PACK PASS

✅ STEP 1 TOTP STEP-UP PACK PASS

✅ M104 REPO CLEANUP CHECK PASS

✅ M105 TOOLS HYGIENE CHECK PASS

✅ M106 REPO HYGIENE + LINK TTL CHECK PASS

✅ M43 GOOGLE AUTH + INVITE GATE PACK PASS OK

✅ M44 TELEMATICS PACK PASS OK

✅ M45 RETENTION + BACKUP PACK PASS OK

Post-M44 / Post-M45 repo durumu:

✅ M44.5 SSOT sync uygulanmış

✅ M44.6 ROOM > Vehicles > Telematics UI repoda mevcut

✅ M45 retention + backup resmi pack/check ile green

✅ backup policy / manifest admin endpointleri eklendi

✅ backup create / restore tool hattı repoya oturdu

✅ M45 runbook + SSOT senkronu tamamlandı

Ana kanıt komutları:

./tools/pack.ps1 -To 41

./tools/pack_m42_optional.ps1

./tools/pack_step06_stabil.ps1

./tools/pack_step1_security_foundation.ps1

./tools/pack_step1_totp_stepup.ps1

./tools/check_repo_cleanup_m104.ps1 -RepoRoot D:\servis-platform

./tools/check_tools_hygiene_m105.ps1 -RepoRoot D:\servis-platform

./tools/check_repo_hygiene_m106.ps1 -RepoRoot D:\servis-platform

./tools/pack_m43_google_auth_invite_gate.ps1 -RepoRoot D:\servis-platform

./tools/pack_m44_telematics.ps1 -RepoRoot D:\servis-platform

./tools/pack_m45_retention_backup.ps1 -RepoRoot D:\servis-platform

Önemli not:

tools/STABLE_TO.txt = 41

Bu, ana stabil tabanın hâlâ M41 olduğunu gösterir.

M42 / Step0.6 / Step1 / M43 / M44 / M45 bunun üstünde ayrı resmi pack/check hatlarıyla yeşil kabul edilen ek katmanlardır.

Overlay standardı:

tek zip

tek kök klasör

nested root yok

1) Resmi olarak yeşil kabul edilen kapsam
1.1 V1 ana regresyon

M41 PACK PASS altında ana sistem yeşil:

auth / refresh / revoke / device mismatch

RBAC / route guard

agreement

offer / counter / accept

route / stops

live / ws / gps

mini rate-limit stres hattı

audit / retention temel hattı

learning / route learn akışları

1.2 M42 Optional Release

check-in modülü optional release olarak hazır

FEATURE_CHECKIN=0 iken dormant

FEATURE_CHECKIN=1 iken ayrı optional hat üzerinden doğrulanmış

resmi referans: M42 OPTIONAL PACK PASS

1.3 Step 0.6 Stabil Ekler

capacity / pool / auto-split

split parent cleanup

school parent invite + public accept

shift preview external nav

company list click details

Kanıt:

STEP 0.6 STABIL PACK PASS

1.4 Step 1 Security Foundation

refresh reuse detection

export limiter

login/gps/export limit hattı

RBAC deny-by-default sanity matrix

Kanıt:

STEP 1 SECURITY FOUNDATION PACK PASS

1.5 Step 1 TOTP Step-up

ROOM ve SUPER_ADMIN için TOTP setup / enable / verify

login response içinde stepUpRequired

setup/verify olmadan kritik write/admin endpointler kapalı

verify sonrası geçici stepUpUntil ile erişim açılıyor

COMPANY ve DRIVER bu guard’dan etkilenmiyor

Kanıt:

STEP 1 TOTP STEP-UP CHECK PASS

STEP 1 TOTP STEP-UP REPO CONTRACT PASS

1.6 Step 2 — M43 Google Auth + Invite Gate

Kapsam:

Google Auth backend hattı

UserIdentity + Invite modeli

generic invite / accept akışı

invite yoksa kabul yok

role / scope bağlı kabul

Company / Room auth invite yönetimi

public accept-invite paneli

parent invite akışında Google ile kabul desteği

local email+şifre akışı korunuyor

Önemli davranış:

Google login açık olsa bile erişim invite / scope / bağlama kurallarıyla sınırlı

bağlı profile başka kullanıcıya tekrar bağlanamaz

local login kaldırılmadı

PERSONEL için zorunlu login modeli getirilmedi

Kanıt:

M43 GOOGLE AUTH + INVITE GATE CHECK PASS

M43 GOOGLE AUTH + INVITE GATE REPO CONTRACT PASS

M43 GOOGLE AUTH + INVITE GATE PACK PASS OK

1.7 Step 2.5 — M44 Telematics

Kapsam:

telematics normalize core

direct device HTTP push

vendor cloud adapter endpoint

GpsDevice modeli

provider normalize katmanı

raw/vendor payload → kanonik GPS/event hattı

audit + limiter + history gate entegrasyonu

Backend yetenekleri:

POST /api/telematics/push

POST /api/telematics/vendor/:provider

GET /api/telematics/devices

POST /api/telematics/devices

PATCH /api/telematics/devices/:id

POST /api/telematics/devices/:id/rotate

Önemli davranış:

mevcut driver app GPS akışı korunur

telematics ek kaynak olarak çalışır

device token hash mantığı vardır; ham token sadece create/rotate anında görünür

vendor secret gerekir

mevcut WS / room / company GPS akışı bozulmaz

Kanıt:

M44 TELEMATICS CHECK PASS

M44 TELEMATICS REPO CONTRACT PASS

M44 TELEMATICS PACK PASS OK

1.8 M44.6 UI eki — ROOM > Vehicles > Telematics

Kapsam:

ROOM > Vehicles içinde Telematics sekmesi

araç bazlı device oluşturma

device listeleme

label / status güncelleme

token rotate

create/rotate sonrası ham token tek seferlik gösterim

Repo izi:

web/src/panels/room/VehiclesPanel.jsx içinde telematics sekmesi ve device yönetim akışı mevcut

Not:

bunun için ayrı resmi pack/check hattı yok

durum: UI + manuel doğrulama ile kabul edilen ek

1.9 Step 2.6 — M45 Retention + Backup

Kapsam:

retention policy görünürlüğü

backup policy görünürlüğü

backup manifest görünürlüğü

yerel SQL backup üretim scripti

kontrollü restore scripti

runbook + SSOT senkronu

runtime check + repo-contract + tek pack hattı

Yeni admin endpointleri:

GET /api/admin/retention/policy

GET /api/admin/backup/policy

GET /api/admin/backup/manifest

Yeni tool’lar:

tools/pack_m45_retention_backup.ps1

tools/check_m45_retention_backup_repo_contract.ps1

tools/backup_create_m45.ps1

tools/backup_restore_m45.ps1

Yeni backend / docs:

backend/scripts/m45_retention_backup_check.js

backend/src/ops/retentionBackupPolicy.js

docs/RUNBOOK_M45_RETENTION_BACKUP.md

Önemli davranış:

ApiRequest retention görünürlüğü var

AuditLog retention görünürlüğü var

GpsPoint retention görünürlüğü var

telematics history değerlendirmesi GPS/history retention mantığıyla uyumlu

backup local dir / retention / format bilgisi admin’den görülebilir

restore destructive olduğu için kontrollü ve -Force opt-in akışta

Kanıt:

M45 RETENTION + BACKUP CHECK PASS

M45 RETENTION + BACKUP REPO CONTRACT PASS

M45 RETENTION + BACKUP PACK PASS OK

2) Personel ve parent link politikası
2.1 Parent invite TTL

Presetler:

1 hafta

1 ay

6 ay

1 yıl

Backend üst sınır:

365 gün

2.2 Personel public canlı link TTL

Presetler:

1 hafta

1 ay

6 ay

1 yıl

Backend üst sınır:

365 gün

Önemli davranış:

personel public link vardiya endAt ile zorunlu clamp edilmez

ham token yalnızca ilk üretimde gösterilir

revoke / expired link aktifmiş gibi tutulmaz

2.3 Ürün kararı

COMPANY / ROOM / SUPER_ADMIN / DRIVER login tabanlı kalır

PERSONEL varsayılan olarak düşük sürtünmeli, süreli public link modeliyle çalışır

gerekirse ileride opsiyonel account-upgrade düşünülebilir

M43 bu kararı değiştirmez

3) Repo ve tools hijyen durumu
3.1 M104 Repo Cleanup

Temizlenen ana başlıklar:

stale duplicate route/panel dosyaları

.bak artık dosyaları

root stray path kalıntıları

dağınık legacy README/TXT kalıntıları

Sonuç:

canlı ağaç korunmuş

stale path’ler archive altına alınmış

M104 REPO CLEANUP CHECK PASS

3.2 M105 Tools Canonical Cleanup

Kanonik tools/ hattı korunmuş:

pack*

gate*

reset-and-pack.ps1

check_*

README.md

PRIMER_SNAPSHOT.md

CHECKLIST_SSOT.md

STABLE_TO.txt

Legacy içerik:

tools/_archive/...

tools/_backup/...

Sonuç:

M105 TOOLS HYGIENE CHECK PASS

3.3 M106 Repo Hygiene + Primer / TTL Sync

Senkronlanan ana başlıklar:

primer / checklist / startpack

parent + personel TTL politikası

kanonik checker hattı

Sonuç:

M106 REPO HYGIENE + LINK TTL CHECK PASS

3.4 M44.5 SSOT Sync

Senkron hat:

tools/PRIMER_SNAPSHOT.md

docs/PRIMER_SSOT.md

docs/CHECKLIST_SSOT.md

tools/CHECKLIST_SSOT.md

docs/STARTPACK_V1.md

tools/README.md

Sonuç:

M44 sonrası SSOT senkronu yapılmış

3.5 M45 SSOT / Runbook Sync

M45 ile senkronlanan ana hat:

docs/RUNBOOK_M45_RETENTION_BACKUP.md

tools/README.md

docs/STARTPACK_V1.md

docs/PRIMER_SSOT.md

tools/PRIMER_SNAPSHOT.md

docs/CHECKLIST_SSOT.md

tools/CHECKLIST_SSOT.md

Sonuç:

retention + backup operasyon hattı SSOT’a işlendi

4) SSOT / doküman düzeni

Kanonik hat:

tools/PRIMER_SNAPSHOT.md

tools/CHECKLIST_SSOT.md

tools/README.md

docs/PRIMER_SSOT.md

docs/CHECKLIST_SSOT.md

docs/STARTPACK_V1.md

docs/API_SPEC_V1.md

docs/UI_SPEC_V1.md

docs/DB_SCHEMA_V1.md

docs/PROJECT_SPEC_V1.md

Ek repo notu:

docs/PRIMER_SNAPSHOT_2026-03-10_FINAL.md ayrıca bulunabilir

kanonik çalışma hattı yine tools/PRIMER_SNAPSHOT.md + docs/PRIMER_SSOT.md

M43 araçları:

tools/pack_m43_google_auth_invite_gate.ps1

tools/check_m43_google_auth_invite_gate_repo_contract.ps1

backend/scripts/m43_google_auth_invite_gate_check.js

M44 araçları:

tools/pack_m44_telematics.ps1

tools/check_m44_telematics_repo_contract.ps1

backend/scripts/m44_telematics_check.js

M45 araçları:

tools/pack_m45_retention_backup.ps1

tools/check_m45_retention_backup_repo_contract.ps1

tools/backup_create_m45.ps1

tools/backup_restore_m45.ps1

backend/scripts/m45_retention_backup_check.js

backend/src/ops/retentionBackupPolicy.js

docs/RUNBOOK_M45_RETENTION_BACKUP.md

Overlay notları:

docs/overlays/OVERLAY_NOTES_M104_REPO_AUDIT_CLEANUP_2026-03-10.md

docs/overlays/OVERLAY_NOTES_M105_TOOLS_CANONICAL_CLEANUP_2026-03-10.md

docs/overlays/OVERLAY_NOTES_M106_LINK_TTL_AND_HYGIENE_2026-03-10.md

docs/overlays/OVERLAY_NOTES_M106_4_CHECKERS_RESTORE_PRIMER_SYNC_2026-03-10.md

docs/overlays/OVERLAY_NOTES_M44_TELEMATICS_2026-03-10.md

docs/overlays/OVERLAY_NOTES_M44_5_SSOT_SYNC_2026-03-10.md

docs/overlays/OVERLAY_NOTES_M44_6_TELEMATICS_ROOM_UI_2026-03-10.md

docs/overlays/OVERLAY_NOTES_M45_RETENTION_BACKUP_2026-03-10.md

5) Bir sonraki resmi iş
Step 3 — M46 AI Copilot Foundation

Sıradaki resmi hedef:

sistem için domain AI foundation kurmak

read-only / suggestion-first AI hattı

role/scope kontrollü AI erişimi

structured JSON output

tool whitelist

audit log

mevcut operasyon verisini açıklayan copilot katmanı

İlk kapsam önerisi:

POST /api/ai/copilot

vardiya özeti

conflict açıklama

telematics health/anomali açıklama

operasyon notu / bilgilendirme taslağı

write aksiyon yok, önce read-only + suggestion

Uygulama ilkeleri:

kritik kararları AI vermeyecek

mevcut RBAC/scope sistemi korunacak

AI yalnız whitelist tool’lar üzerinden veri okuyacak

öneri üretecek, otomatik işlem yapmayacak

audit ve güvenlik ilk günden zorunlu olacak

6) Korunacak ürün kararları

PERSONEL hâlâ public link öncelikli modelde

Google Auth geldi diye personelde zorunlu hesap modeline dönülmeyecek

invite-based access kontrolü role/scope mantığıyla devam edecek

parent invite akışı bozulmayacak

local login + Google login birlikte yaşamaya devam edecek

telematics mevcut driver GPS akışının yerine geçmez; ek kaynak olarak çalışır

ROOM device provisioning sahibi olmaya devam eder

retention + backup hattı operasyonel görünürlükle birlikte korunacak

overlay üretim standardı: tek zip, tek kök klasör, nested root yok

7) Yeni sohbet açınca ilk cümle

“Repo şu an M41 ana green tabanı üzerinde; M42 optional, Step 0.6 stabil, Step 1 Security, Step 1 TOTP, M104/M105/M106 hijyen, M43 Google Auth, M44 Telematics ve M45 Retention + Backup ayrı pack/check hatlarıyla yeşil durumda. M44.5 SSOT sync ve M44.6 ROOM Vehicles Telematics UI repoda mevcut. Personel login zorunlu değil; public link TTL presetleri parent ve personelde 1 hafta / 1 ay / 6 ay / 1 yıl olarak hizalı. Sıradaki resmi hedef mevcut repoya göre tek overlay zip standardıyla M46 AI Copilot Foundation.”