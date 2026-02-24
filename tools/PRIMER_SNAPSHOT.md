SERVIS-PLATFORM — PERSONEL SERVİS V1 — PRIMER SNAPSHOT (Yapıştır & Devam Et)

Tarih: 2026-02-24 (Europe/Istanbul)

0) Durum / Referans

Repo: D:\servis-platform

Son GREEN: v1-m33-m19fix.2 ✅ (M0→M32 PACK PASS)

Doğrulama:
- .\tools\gate.ps1 -To 32  → PASS
- .\tools\pack.ps1 -To 32  → PASS

1) V1 Amaç

GPS tabanlı personel servis platformu:
- Company planlama (Agreement Wizard + Market teklifler)
- Room operasyon (offer inbox → onayla/başlat → shift operasyon)
- Driver operasyon (route + reached + complete)
- Personel (my ride + request)
- WS ile canlı güncelleme + bildirimler + dedupe

2) Roller

SUPER_ADMIN: Companies/Rooms yönetimi + overview  
COMPANY: Agreement/Shift talebi, Market ile çoklu room teklif toplama, offers yönetimi  
ROOM: Araç+sürücü, offer inbox, approve/start, map/shift operasyonu  
DRIVER: aktif rota + reached akışı  
PERSONEL: request + my ride  

3) En kritik akış (sahada “az tık”)

1) (Gerekirse) Konum düzelt: Shift Tools → Personel ekle/import → “Adresten Bul” → Ekle
2) Plan Builder ile N araç/cluster + (opsiyonel) OSRM+Solver ile çöz
3) Uygula → N market shift oluştur (people + stops + reorder)
4) Toplu Teklif Gönder → seçili room’lara tüm shift’lere teklif
5) Company 1 teklifi ACCEPT eder → diğerleri CANCELLED (otomatik)
6) Room approve+start → operasyon ACTIVE
7) Driver reached→complete → shift DONE

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

5) Plan Builder (V1.5) — güncel durum

Stage-0: cluster + araç sayısı önerisi + preview ✅  
Stage-1: OSRM table (süre/mesafe matrisi) ✅  
Stage-2: Solver (OR-Tools) ile rota/ziyaret sırası ✅ (solver=ortools; fallback=heuristic)  
Stage-3: Uygula → N market shift create + people REPLACE + stops generate + (ops) stops reorder ✅  
Ek: Uygula sonrası toast (oluşturulan shift id’leri) + Toplu Teklif Gönder modalı ✅  
UI isimleri: “Yeni Talep” → “Manuel Talep”, “Personel & Rota” → “Shift Tools” ✅

6) Kurallar / Çalışma disiplini

- Yanıtlarda en fazla 3 PowerShell komutu.
- “Green” = .\tools\pack.ps1 -To <hedef> PACK PASS.
- Değişiklikler mümkün olduğunca tek seferde overlay (zip) paket olarak verilecek.
- Büyük dosyalar (örn. OSRM blob) repo’ya girmez: infra/osrm-data/ ignore.

7) Bilinen tasarım notu

- Plan Builder’ın nihai hedefi: Shift’ten bağımsız plan → N shift üret → market offer → accept → room approve/start.
- Geocode: adres çok detaylıysa (daire/kapı “9/8” gibi) notfound olabilir; sokak/mahalle/ilçe/il + Türkiye formatı önerilir.
- 0/0 koordinat “Konum yok” sayılır; Plan Builder eligible’a girmez.

8) Release Notes (bugün)

- Plan Builder eklendi (Stage-0..3): OSRM matrix + OR-Tools solve + Apply ile N market shift otomasyonu
- Company UX: Manuel Talep adı, Apply toast + shift id quick filter, Toplu Teklif Gönder (bulk offers)
- Shift Tools: geocode (“Adresten Bul”) ve konum düzeltme akışı
- Route preview: OSRM source olsa bile hub anchor ile M19 start-near-hub fix (Gate PASS)

