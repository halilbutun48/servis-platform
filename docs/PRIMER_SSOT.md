# SERVIS-PLATFORM — PERSONEL SERVİS V1 — PRIMER (SSOT)
Tarih: 2026-02-24  
Timezone: Europe/Istanbul

## 0) Bu dosya ne?
Bu dosya “yapıştır & devam et” değil; **tek kaynak (SSOT)** seviyesinde repo özeti ve çalışma standardıdır:
- Repo şu an **ne** durumda?
- Nasıl doğruluyoruz (**Gate/Pack**)? “GREEN” ne demek?
- Kritik akışlar ve rol davranışları
- Doküman haritası + bilinen tutarsızlıklar

> Hızlı sohbet başlangıcı için: `tools/PRIMER_SNAPSHOT.md`

---

## 1) Stabil referans ve doğrulama (milestone disiplini)

### Son GREEN referans (değişmez)
- Stable tag: **`v1-m32-green.1`**
- Green tanımı: ✅ `tools/pack.ps1 -To 32` → **PACK PASS**  
  (compose up + smoke + fullcheck + M0..M32 milestone check’leri)

### Komutlar (kanıt standardı)
- PACK: `tools/pack.ps1 -To 32`
- Sadece gate/check: `tools/gate.ps1 -To 32`

**Kural:**
- GREEN olmadan sonraki milestone’a geçilmez.
- API/DB/UI/flow değişirse aynı PR içinde ilgili `docs/*` güncellenir.

---

## 2) Ürün amacı (Personel Servisi V1)
Öğrenci/parent yok. GPS tabanlı “personel servisi” platformu:

- **COMPANY**: Agreement/Shift planlama, Market ile çoklu room teklif toplama, 1 teklifi accept etme
- **ROOM**: araç+sürücü yönetimi, offer inbox, tek tık approve/start, operasyon takibi
- **DRIVER**: aktif rota + reached akışı + complete
- **PERSONEL**: uygun vardiyalar + request oluşturma + my ride görünümü
- **WS + Notifications**: canlı güncelleme, bildirim dedupe, stale/offline ve recovery

---

## 3) Roller ve UI rotaları
Referans (SSOT): `docs/UI_SPEC_V1.md`

Özet:
- **SUPER_ADMIN**: Companies/Rooms yönetimi + overview
- **COMPANY**: Agreements + Shifts + Market Offers
- **ROOM**: Vehicles/Drivers + Offers Inbox + Operasyon
- **DRIVER**: Bugün rotam / aktif rota
- **PERSONEL**: Benim servis / talep

---

## 4) “Az tık” kritik akış (sahada standard)
1) **Geo Review**: NEEDS_REVIEW personelleri düzelt (manual override ile OK)
2) **Agreement Wizard** ile plan oluştur (preset paketler + günler + süre)
3) Gerekirse **Market**: aynı shift’e çoklu room teklif gönder
4) Company 1 teklifi **ACCEPT** eder → diğer teklifler otomatik **CANCELLED**
5) ROOM: **Onayla + Başlat** (tek adım) → shift ACTIVE
6) DRIVER: **Reached** ilerler → shift DONE

Bu akışın kullanımı için: `docs/USAGE_GUIDE_V1.md` (+ rol sayfaları)

---

## 5) Milestone durumu (özet)
✅ **M0–M16**: temel CRUD + shift + gps + ws + notifications + requests→suggestions→stops + geo review  
✅ **M17–M18**: agreements + conflict + monitor + daily shift generator  
✅ **M22**: room directory + agreement UX  
✅ **M24–M25**: marketplace offers (multi-room) + accept→others cancelled + filtreler  
✅ **M26–M27**: agreement wizard + preset paketler  
✅ **M28–M32**: one-click flow + guided market + room quick approve + driver/personel UX + template UI refactor

Detaylar: `docs/MILESTONE_M22.md` … `docs/MILESTONE_M32.md`

---

## 6) Repo haritası (SSOT dosyaları)
- `docs/PROJECT_SPEC_V1.md` — ürün kapsamı / kurallar
- `docs/API_SPEC_V1.md` — REST + WS sözleşmeleri
- `docs/DB_SCHEMA_V1.md` — şema (Prisma/DB)
- `docs/UI_SPEC_V1.md` — UI roller/route’lar
- `docs/STARTPACK_V1.md` — hızlı runbook (gate/pack/debug)
- `tools/PRIMER_SNAPSHOT.md` — yeni sohbet yapıştırmalık

---

## 7) Bilinen tutarsızlıklar / düzenleme listesi (repo hijyeni)
1) `docs/PRIMER_SSOT.md` (eski sürüm) **M18** referanslıydı → **M32** ile senk edilmesi gerekiyordu. ✅ (bu dosyada düzeltildi)
2) `docs/STARTPACK_V1.md` bazı bölümler **M16** komutları referanslıydı → **M32** ile güncellenmeli. ✅
3) `tools/README.md` hâlâ “M0–M12” anlatıyor → **M0–M32** olacak şekilde güncellenmeli. ✅
4) `docs/MILESTONE_GATE_MATRIX.md` erken dönem (M1–M6) içerik gibi duruyor →  
   - ya “LEGACY” diye işaretle,  
   - ya da M32’ye kadar genişlet (tercihen: **per-milestone docs + check script** zaten kanıt).
5) `tools/gate.ps1` ve `tools/pack.ps1` default `-To` değeri **21** → en güncel hedefe (32) çekmek UX’i iyileştirir (opsiyonel).

---

## 8) Sonraki hedef: V1.5 Plan Builder (OSRM + OR-Tools)
Hedef: Kullanıcı “kaç araç gerekir / rota nasıl olur”u düşünmesin.

Önerilen fazlar:
- **Kural tabanlı**: kişi sayısı + kapasite → araç sayısı, geohash/cluster
- **OSRM**: süre/mesafe matrisi
- **OR-Tools VRP**: araç/rota dağıtımı (N araç → N rota)
- “Uygula” → N shift create (market) → offers → accept → room approve/start

Backlog referans: `docs/NEXT_BACKLOG_V1.md` (özellikle A başlığı)

---
