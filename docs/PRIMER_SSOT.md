# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — PRIMER (SSOT)

Tarih: 2026-03-09  
Timezone: Europe/Istanbul

## 0) Güncel durum
- Repo: `D:\servis-platform`
- Ana referans: **M41 PACK PASS**
- Opsiyonel referans: **M42 OPTIONAL PACK PASS**
- Stabil ama ayrı doğrulanan ekler: **Step 0.6**
  - capacity gate
  - room pool summary
  - auto-split by real available vehicle combination
  - split parent cleanup
  - school parent invite restore
  - shift preview external navigation
  - company list click details

## 1) Kanonik doğrulama komutları
- Ana regresyon: `tools\pack.ps1 -To 41`
- Check-in optional: `tools\pack_m42_optional.ps1`
- Step 0.6 stabil ekler: `tools\pack_step06_stabil.ps1`

## 2) Ayrım (çok önemli)
- **M41** = V1 ana regresyon kanıtı
- **M42** = dormant/optional release, ayrı pack ile doğrulanır
- **Step 0.6** = çalışan stabil eklerdir; ana M41 pack’e zorla gömülmez, ayrı mini-check set ile doğrulanır

## 3) Repo organizasyonu
- `backend/` → API, jobs, ws, Prisma, runtime check scriptleri
- `web/` → Vite/React UI
- `infra/` → Docker compose / servisler
- `docs/` → SSOT dokümanlar
- `docs/overlays/` → overlay notları / tarihçe
- `tools/` → gate/pack/runbook scriptleri

## 4) Overlay / not organizasyonu
- Repo root’a yeni `OVERLAY_NOTES_*` bırakılmaz
- Overlay notları `docs/overlays/` altında tutulur
- Step 0.6 tarihçesi: `docs/overlays/STEP06/`
- Uygulama scriptleri `tools/` altında kalır

## 5) Step 0.6 resmi doğrulama kapsamı
### Runtime mini-check
- room pool summary endpoint shape / enough capacity
- auto-split approve akışı
- school parent invite create / info / accept akışı

### Repo contract smoke
- external navigation UI metni ve route açıcı fonksiyon
- `0,0` koordinatının navigation dışında bırakılması
- company list click details modalı
- school parent link nav + public accept ekranı
- split root cleanup filtreleri

## 6) Bir sonraki sıradaki işler
1. Step 0.6’yı ayrı mini-check ile kalıcılaştırmak  
2. Sonra V1.5 Minimum Security başlatmak:
   - WAF limitleri
   - TOTP step-up
   - refresh reuse detection
   - RBAC deny-by-default test harness

## 7) Çalışma kuralları
- Değişiklikler mümkün olduğunca tek seferde overlay (zip)
- Yanıtlarda en fazla 3 PowerShell komutu
- `Green` = hedef pack/check PASS kanıtı
- Ana M41 regressions sabit tutulur; yeni stabil ekler ayrı doğrulama ile yükseltilir