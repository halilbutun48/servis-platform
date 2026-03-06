SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — PRIMER SNAPSHOT (Yapıştır & Devam Et)

Tarih: 2026-03-06 (Europe/Istanbul)

0) Durum / Referans

Repo: D:\servis-platform

Gate/Pack:
- `tools/STABLE_TO.txt` = **41**
- `tools/pack.ps1`: default `-To=0` (auto max), bu repoda auto max **M41**
- Canonical GREEN kanıtı: `./tools/pack.ps1 -To 41`
- Current GREEN ref: **v1-m41-green.*** (Gate+Pack PASS)

Not (numaralandırma):
- Gate/Pack milestone = `backend/scripts/m{N}check.js`
- `OVERLAY_NOTES_Mxx`, `M72`, `M77`, `M81` gibi etiketler feature/overlay serisidir; Gate milestone ile birebir aynı olmak zorunda değildir.

1) Ürün özeti

- Ana eksen: **GPS tabanlı personel servis platformu**
- Çekirdek roller: **SUPER_ADMIN / ROOM / COMPANY / DRIVER / PERSONEL**
- Opsiyonel/ilerleyen akış: **SCHOOL / PARENT** invite modeli
- Canlı yapı: REST + WS invalidate + live map + audit/log + retention hattı

2) Mevcut GREEN çekirdek (özet)

- **M17/M18 Agreements:** agreement oluştur / approve / vehicle+driver bind / generator ile agreement kaynaklı shift üretimi
- Agreement’lı shiftlerde **offer/pazarlık UI kapalı**, `agreementId` badge görünür
- Agreement extend akışı var: company extend-request, room decision/counter
- Agreement’lar **zaman bazlı ACTIVE/DONE**; driver shift DONE olsa bile agreement bitiş zamanına kadar ACTIVE kalabilir
- Agreement dışı **offer akışı** çalışıyor: market/requested → room counter/accept/reject → company accept
- **Scope izolasyonu:** bir room kabul edince diğer room offer’ları CANCELLED; cross-room leak olmamalı
- **Route/OSRM kuralı:** OUTBOUND ilk nokta hub, INBOUND son nokta hub
- **M38 KVKK consent gate:** consent yoksa live/publish blok; kabul sonrası açılır
- **M39/M40:** log export + retention dryRun + audit izi
- **M41 Auth:** refresh / logout / revoke / driver device binding
- Company Shifts UX: **Oluştur / Takip** ayrımı, accordion/counter iyileştirmeleri, daha sade takip ekranı
- Rate-limit / anti-429 hattı ve GreenPack bypass mantığı mevcut

3) Hesap / üyelik yetki politikası (SSOT)

- **SUPER_ADMIN:** tüm kullanıcı/rol/scope create + yönetim
- **ROOM:** sadece **Driver create + bind**
- **COMPANY:** **Personel create** (login opsiyonel) + personel invite
- **SCHOOL:** Student/Personel create + Parent link yönetimi + Parent invite
- **PARENT / PERSONEL / DRIVER:** hesap oluşturma yok
- Parent user hesabını okul oluşturmaz; **self-serve invite** ile parent kendi hesabını açar

4) Çalışma kuralları

- Yanıtlarda en fazla **3 PowerShell komutu**
- GREEN olmadan ilerleme yok
- Değişiklikleri mümkün olduğunca **tek seferde overlay (zip)** olarak hazırla
- UI tarafında tek **Guided Mode / Stepper**; diğer araçlar **Advanced** olarak kalır
- API/DB/UI/flow değişirse aynı pakette SSOT dokümanlarını güncelle

5) Doğrulama / kanıt standardı

- Canonical pack: `./tools/pack.ps1 -To 41`
- Canonical gate: `./tools/gate.ps1 -To 41`
- Temiz kurulum + auto max akışı: `./tools/reset-and-pack.ps1`
- `x-greenpack: 1` dev/test bypass mantığı check stabilizasyonu için kullanılabilir
- “Çalışıyor” kanıtı = **PACK PASS**

6) Kritik sahne akışı

- Company hub + personel geo hazır
- Agreement veya market shift oluştur
- Room offer/counter/accept
- Room approve/start
- Driver reached / done
- Company + Room canlı panelden takip

7) Sıradaki yol haritası

- **Step 0:** V1 manuel checklist %100 PASS
- **Step 1 (V1.5):** Minimum Security
  - WAF
  - TOTP / step-up
  - refresh reuse detection
  - RBAC matrisi + deny-by-default test
- **Step 2 (M43):** Google Auth (GIS) + Invite Gate
- **Step 2.5 (M44):** Telematics
  - Normalize Core
  - Direct HTTP Push
  - Vendor Cloud connector
- **Step 2.6 (M45):**
  - 2 yıl retention
  - GPS geçmiş 50sn / 50m
  - backup + PITR
- **Step 3 (V2):**
  - V2-Scale
  - V2-Mobile Driver
  - V2-ProdOps
  - V2-FieldFeatures

8) V2 öncesi kırmızı çizgiler

- V1 checklist regresyon paketi stabil tutulacak
- Yeni özellikler önce V1.5 / M43 / M44 / M45 / V2 başlıklarında toplanacak
- GPS ingest ile live publish politikası ayrıştırılacak
- 1500 araç yükü düşünülerek queue / batch / cache / WS fanout tasarlanacak
