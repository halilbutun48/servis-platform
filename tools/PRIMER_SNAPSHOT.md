SERVIS-PLATFORM — PERSONEL SERVİS V1 — PRIMER SNAPSHOT (Yapıştır & Devam Et)

Tarih: 2026-02-24 (Europe/Istanbul)

0) Durum / Referans

Repo: D:\servis-platform

Son GREEN: v1-m32-green.1 ✅ (M0→M32 PACK PASS)

Doğrulama: .\tools\pack.ps1 -To 32

1) V1 Amaç

GPS tabanlı personel servis platformu:

Company planlama (Agreement Wizard + Market teklifler)

Room operasyon (offer inbox → onayla/başlat → shift operasyon)

Driver operasyon (route + reached + complete)

Personel (my ride + request)

WS ile canlı güncelleme + bildirimler + dedupe

2) Roller

SUPER_ADMIN: Companies/Rooms yönetimi + overview

COMPANY: Agreement/Shift talebi, Market ile çoklu room teklif toplama, offers yönetimi

ROOM: Araç+sürücü, offer inbox, approve/start, map/shift operasyonu

DRIVER: aktif rota + reached akışı

PERSONEL: request + my ride

3) En kritik akış (sahada “az tık”)

Geo Review (NEEDS_REVIEW bitir)

Agreement Wizard ile plan oluştur (preset paketler + günler + süre)

Gerekirse Market: aynı shift’e çoklu room teklif gönder

Company 1 teklifi kabul eder → diğerleri CANCELLED (otomatik)

Room Onayla + Başlat (tek tık) → operasyon ACTIVE

Driver “Reached” ilerler → shift DONE

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

5) Bilinen tasarım notu (Plan Builder konusu)

Mevcut “Personel & Rota (M16 draft)” ekranı shift’e bağlı (Shift seç → personel/durak üret).

Asıl hedef (V1.5): Shift’ten bağımsız Plan Builder:

personel cluster + araç sayısı önerisi + OSRM/OR-Tools ile gerçek rota optimizasyonu

çıktı: N adet shift (1 araç = 1 shift) + market offer akışı

6) Kurallar / Çalışma disiplini

Yanıtlarda en fazla 3 PowerShell komutu.

“Green” = .\tools\pack.ps1 -To <hedef> PACK PASS.

Değişiklikler mümkün olduğunca tek seferde overlay (zip) paket olarak verilecek (M26+ formatı).

Büyük dosyalar (örn. OSRM blob) repo’ya girmez: infra/osrm-data/ ignore.

7) Yeni hedef (sonraki sohbet): V1.5 Plan Builder (OSRM + OR-Tools)

Amaç: kullanıcı “kaç araç gerekir / rota nasıl olur”u düşünmesin.

Aşamalar:

Kural tabanlı: kişi sayısı + kapasite → araç sayısı, geohash/cluster

OSRM ile süre/mesafe matrisleri

OR-Tools VRP ile rota/araç dağıtımı

“Uygula” → N shift create (market) → offers → accept → room approve/start

Not (UI refactor önerisi):
- ShiftsPanel gibi büyük dosyalarda “Template UI” bloğunu ayrı componente bölmek (örn. `ShiftTemplatesPanel`) overlay merge/manuel copy’de “kapanmayan tag” riskini azaltır.
- Şu anki repoda template UI, `web/src/panels/company/ShiftsPanel.jsx` içinde (ayrı component dosyası henüz yok).
