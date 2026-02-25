SERVIS-PLATFORM — PERSONEL SERVİS V1 — PRIMER SNAPSHOT (Yapıştır & Devam Et)

Tarih: 2026-02-25 (Europe/Istanbul)

0) Durum / Referans

Repo: D:\servis-platform

Son GREEN: ✅ GATE PASS (M0→M33) + ✅ PACK PASS (M0→M33)

Doğrulama:
- .\tools\pack.ps1 -To 33

1) V1 Amaç

GPS tabanlı personel servis platformu:

- Company planlama (Templates + Guided flow + Market teklifler)
- Room operasyon (offers inbox → counter/accept → approve/start → operasyon)
- Driver operasyon (route + reached + complete)
- Personel (my ride + request)
- WS ile canlı güncelleme + bildirimler + dedupe

2) Roller

- SUPER_ADMIN: Companies/Rooms yönetimi + overview
- COMPANY: Agreement/Shift talebi, Market ile çoklu room teklif toplama, offers yönetimi
- ROOM: Araç+sürücü, offer inbox, approve/start, map/shift operasyonu
- DRIVER: aktif rota + reached akışı
- PERSONEL: request + my ride

3) En kritik akış (sahada “az tık”)

- Company hub + personel konumları hazır (geoStatus=OK, lat/lng dolu; 0,0 değil)
- Company: plan → N shift → toplu teklif
- Room: counter/accept → approve/start
- Driver: reached → done

4) Milestone özet (M17+ sonrası)

✅ M17–M18: Agreements + conflict + monitor + daily shift generator
✅ M22: Room directory (/api/rooms?q&hasHub) + Agreement UX
✅ M24: Marketplace offers (multi-room) + accept cancels others
✅ M25: Offer status filtreleri
✅ M26–M27: Agreement Wizard + preset paketler
✅ M28: One-click flow + company offers directory + NavDock düzeltme + check fix
✅ M29: Onboarding checklist + offers modal shortcut + room offer shift-status badge
✅ M30: Guided market flow + ROOM quick approve + Driver/Personel UX + /api/personel/shifts
✅ M31: Room one-click approve+start + Driver UX (big reached + Enter) + Usage docs
✅ M32: Template UI refactor (wizard-style), weekMask fix (Pzt–Cum), custom “Düzenle/Sil”
✅ M33: Plan Builder contract + precheck (Step-0) + m33check (PACK)
✅ Ek: Route preview mini-map (Leaflet/OSM) taban çizim (SVG yerine)

5) Tasarım notu

- Plan Builder V1: shift’e bağlı (shift seç → personel/durak üret → route preview)
- Asıl hedef (V1.5): Shift’ten bağımsız Plan Builder:
  - personel cluster + araç sayısı önerisi
  - OSRM ile süre/mesafe matrisleri
  - OR-Tools VRP ile araç/rota dağıtımı
  - “Uygula” → N shift create (market) → offers → accept → room approve/start

6) Kurallar / Çalışma disiplini

- Yanıtlarda en fazla 3 PowerShell komutu.
- “Green” = .\tools\pack.ps1 -To <hedef> PACK PASS.
- Değişiklikler mümkün olduğunca tek seferde overlay (zip) paket olarak verilecek (M26+).
- Büyük dosyalar (örn. OSRM blob) repo’ya girmez: infra/osrm-data/ ignore.

7) Karar: Wizard yaklaşımı

- Yeni bir wizard yazılmayacak.
- Mevcut Company akışı “Guided Mode / stepper” olarak geliştirilecek.
- “Advanced” ekranlar (Manuel Talep, Shift Tools, Templates) kalacak; wizard arkadan kullanacak.
- Pazarlık/teklif takibi wizard içinde tam UI ile embed edilmeyecek:
  - Wizard finalde “Gönderildi” ekranı verir ve “Bekleyen Talepler’e Git (filtreli)” yönlendirmesi yapar.

8) Sonraki işler (Plan)

M33 — Plan Builder (backend contract + check)
- /api/plan-builder mount + precheck endpoint (OSRM/solver optional)
- m33check gate

M34 — Company Guided Flow (mevcut akış üstünden)
- Step 0: Ön kontrol (Company hub var mı? konum eksik/0,0 var mı? OSRM OK mi?)
- Step 1: Şablon + Tarih (Templates)
- Step 2: Personel dahil et (eligible + geocode yönlendirme)
- Step 3: Durak üret + Önizleme (Leaflet)
- Step 4: Matris al + Çöz (OSRM + OR-Tools)
- Step 5: Uygula + Toplu Teklif Gönder (room seç + tutar/not ops.)
- Step 6: “Gönderildi” (shift ID listesi) + “Bekleyen Talepler’e Git (filtreli)” + “Yeni Plan”

DoD (M34):
- Wizard’dan çıkmadan: N shift + toplu teklif gönderildi
- Final: Bekleyen Talepler’e filtreli geçiş

M34.1 — ROOM Shifts birleşimi (ana şikayeti çözer)
- ROOM → Shifts: “Teklif Gelen Shifts” (offered) + “Operasyon Shifts” (assigned)
- Preview + counter Shifts’te çalışır (offer üzerinden erişim izni)
- Offers sayfası secondary/debug olarak kalır

Not:
- Room hub opsiyonel (operasyon/garaj). Rota “target hub” (company site) konusu V1.5 kapsamında netleştirilecek.
