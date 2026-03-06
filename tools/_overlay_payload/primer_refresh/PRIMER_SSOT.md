# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — PRIMER (SSOT)

Tarih: 2026-03-06  
Timezone: Europe/Istanbul

Bu dosya repo için “tek bakışta SSOT primer”dir:
- Repo şu an **ne durumda**
- Hangi milestone kanıtı **canonical**
- Ürün/model/rol kararları neler
- V2 öncesi **hangi sırayla** ilerleyeceğiz

> Yeni sohbet yapıştırmalık dosya: `tools/PRIMER_SNAPSHOT.md`

---

## 1) Repo & doğrulama (canonical)

- Repo path: `D:\servis-platform`
- Stabil stage dosyası: `tools/STABLE_TO.txt` → **41**
- `tools/pack.ps1` default `-To=0` ile auto max kullanır; bu repoda auto max **M41**
- Canonical GREEN kanıtı:
  - `tools\pack.ps1 -To 41`
  - `tools\gate.ps1 -To 41`
- Temiz auto-max akış: `tools\reset-and-pack.ps1`

**Not (numaralandırma):**
- Gate/Pack milestone = `backend/scripts/m{N}check.js`
- `OVERLAY_NOTES_Mxx`, `M72`, `M77`, `M81` vb. feature/overlay serisi olabilir; Gate ile birebir aynı olmak zorunda değildir.

---

## 2) Ürün modeli (kafa karışıklığı yok)

- **Agreement** = anlaşma takvimi + fiyat/koşul
- **Shift** = operasyon (durak/rota/personel/maxWalk/araç-şoför)
- **Offer** = agreement dışı pazarlık/room teklifi
- **Live** = WS invalidate + map/panel senkronizasyonu
- **KVKK policy** = ingest / publish ayrımı üzerinden düşünülür

---

## 3) Current GREEN kapsamı (M17 → M41 çekirdeği)

### 3.1 Agreements
- Company agreement oluşturabilir
- Room approve + vehicle/driver bind yapabilir
- Generator agreement kaynaklı shift üretir
- Agreement’lı shiftlerde offer/counter UI kapalıdır
- `agreementId` badge görünür
- Extend-request / extend-decision / counter hattı vardır
- Agreement ACTIVE/DONE durumu **zaman bazlıdır**

### 3.2 Offer / scope izolasyonu
- Market/requested shift → 1+ room offer
- Room: counter / accept / reject
- Company: accept
- Bir room kazanınca diğer room teklifleri CANCELLED olur
- Cross-room detay sızıntısı olmamalıdır

### 3.3 Route / OSRM / operasyon
- OUTBOUND: ilk nokta hub
- INBOUND: son nokta hub
- Preview ile persist tutarlı olmalıdır
- Driver: start / reached / done akışı vardır

### 3.4 KVKK / Auth / audit
- **M38:** consent gate
- **M39–M40:** log export, retention dryRun, audit izi
- **M41:** refresh session, logout, revoke, driver device binding

### 3.5 UI / anti-429
- Company Shifts ekranında oluşturma ve takip ayrımı vardır
- Takip ekranı accordion/counter iyileştirmeleri içerir
- Rate-limit route bazlı düşünülür
- GreenPack/dev test stabilizasyonu için bypass mantığı vardır

---

## 4) Hesap / üyelik yetki politikası (SSOT)

- **SUPER_ADMIN:** tüm kullanıcı/rol/scope create + yönetim
- **ROOM:** sadece **Driver create + bind**
- **COMPANY:** **Personel create** (login opsiyonel) + personel invite
- **SCHOOL:** Student/Personel create + Parent link yönetimi + Parent invite
- **PARENT / PERSONEL / DRIVER:** hesap oluşturma yok

**Önemli karar:**
- Parent hesabını okul oluşturmaz
- Parent, **self-serve invite** ile kendi hesabını açar
- Company tarafında personel kaydı login’den bağımsız tutulabilir; login gerekiyorsa invite ile bağlanır

---

## 5) Çalışma standardı

- GREEN olmadan ileri milestone yok
- “Çalışıyor” kanıtı = **PACK PASS**
- Yanıtlarda en fazla **3 PowerShell komutu**
- Değişiklikler mümkün olduğunca **tek overlay (zip)** paket olarak hazırlanır
- Tek **Guided Mode / Stepper** korunur; diğer ekranlar **Advanced** olarak kalır
- API/DB/UI/flow değişince SSOT dosyaları aynı pakette güncellenir

---

## 6) SSOT dosyaları (değişince birlikte düşün)

- `docs/PROJECT_SPEC_V1.md`
- `docs/API_SPEC_V1.md`
- `docs/DB_SCHEMA_V1.md`
- `docs/UI_SPEC_V1.md`
- `docs/STARTPACK_V1.md`
- `docs/CHECKLIST_SSOT.md`
- `docs/PRIMER_SSOT.md`
- `tools/PRIMER_SNAPSHOT.md`

---

## 7) Yol haritası (sıralı)

### Step 0 — V1 manuel checklist
Hedef: mevcut V1 regresyon paketini %100 PASS tutmak.

### Step 1 — V1.5 Minimum Security
- WAF / bot-bruteforce koruması
- TOTP / step-up
- refresh reuse detection
- RBAC matrisi + allow/deny otomatik test
- deny-by-default

### Step 2 — M43 Google Auth + Invite Gate
- Google login UX
- Invite tabanlı rol/scope güvenliği
- `UserIdentity` / `Invite` modelleri
- Invite yoksa `INVITE_REQUIRED`

### Step 2.5 — M44 Telematics
- Normalize Core
- Direct HTTP Push connector
- Vendor Cloud connector
- Source priority: DEVICE > PHONE
- Device auth / secret rotation
- 1500 araç yüküne uygun ingest dayanıklılığı

### Step 2.6 — M45 Retention + GPS history + PITR
- AuditLog / ApiRequest 730 gün
- GPS history 50sn / 50m downsample
- Partition stratejisi
- Base backup + WAL archiving + restore test

### Step 3 — V2
- **V2-Scale:** ingest ayrıştırma, queue, batch write, cache, Redis adapter
- **V2-Mobile Driver:** online akış, sonra offline/background
- **V2-ProdOps:** SLO, alarm, runbook, rollback
- **V2-FieldFeatures:** learning v2, check-in ürünselleştirme

---

## 8) V2 öncesi tasarım kırmızı çizgileri

- V1 checklist regresyon paketi stabil tutulur
- Yeni özellikler doğrudan V1 checklist’e gömülmez; önce ilgili yol haritası başlığına eklenir
- GPS ingest ile live publish ayrı düşünülür
- Rate-limit / queue / cache / WS fanout, 1500 araç hedefiyle tasarlanır
- Backup/PITR, “full backup her 50 saniye” gibi pratik olmayan yöntemler yerine doğru veri koruma hattıyla ele alınır

---

## 9) Hızlı devam notu

Yeni sohbette önce `tools/PRIMER_SNAPSHOT.md` yapıştırılır.  
Detay ve karar gerekirse bu dosya (`docs/PRIMER_SSOT.md`) + `docs/CHECKLIST_SSOT.md` referans alınır.
