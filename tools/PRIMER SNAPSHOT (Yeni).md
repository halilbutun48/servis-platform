SERVIS-PLATFORM — PERSONEL SERVİS V1 — PRIMER SNAPSHOT (Yapıştır & Devam Et)

Tarih: 2026-02-28 (Europe/Istanbul)

0) Durum / Referans

Repo: D:\servis-platform

Gate/Pack aralığı: M0→M35 (tools/gate.ps1 + tools/pack.ps1)

Canonical doğrulama: .\tools\pack.ps1 -To 35

Son GREEN (kayıtlı): ✅ GATE PASS + ✅ PACK PASS (M0→M33)

Not: Repo içinde m34check.js ve m35check.js var; en güncel GREEN’i kanıtlamak için -To 35 koşup bu satırı güncelle.

1) V1 Amaç

GPS tabanlı personel servis platformu:

Company planlama (Templates + Guided flow + Market teklifler)

Room operasyon (Shifts/Offers → counter/accept → approve/start → operasyon)

Driver operasyon (route + reached + complete)

Personel (request + my ride)

WS canlı güncelleme + bildirimler + dedupe

2) Roller

SUPER_ADMIN: Companies/Rooms yönetimi + overview

COMPANY: Agreement/Shift talebi, Market ile çoklu room teklif toplama, offers yönetimi

ROOM: araç+sürücü, teklif inbox, approve/start, map/shift operasyonu

DRIVER: aktif rota + reached

PERSONEL: request + my ride

3) Sahada “az tık” kritik akış

Company hub + personel konumları hazır (geoStatus=OK, lat/lng dolu; 0,0 değil)

Company: plan → N market shift → toplu teklif

Room: Shifts içinde teklif gör → counter/accept → approve/start

Driver: reached → done

4) Milestone özeti (Gate/Pack M17+)

✅ M17–M18: Agreements + conflict + monitor + (bugün için) agreementShiftGenerator
✅ M22: Room directory (/api/rooms?q&hasHub) + Agreement UX
✅ M24: Marketplace offers (multi-room) + accept cancels others
✅ M26–M27: Agreement Wizard + preset paketler
✅ M33: Plan Builder contract + precheck (Step-0) + m33check
✅ M34: m34check (precheck + apply doğrulanabilir akış; OSRM opsiyonel)
✅ M35: m35check (offer-scope route preview/stops + room includeOffered doğrulaması)

5) Repo içi Overlay Notes (M36–M49) — önemli davranışlar

✅ M36: ROOM market/offered shift’lerde route-preview + stops auth (allowRoomOfferScope)
✅ M37: Company Shifts hızlı filtre (Bugün/Yarın/Açık/Temizle) + Room satır detay aç/kapat
✅ M38: Hub “Konumumu Al” + Agreements görünürlük/extend UX
✅ M39–M41: Premium UI + Nav grupları + Company Shifts accordion (sayaç + hepsini aç/kapat)
✅ M42: Company Shifts “Oluştur / Takip” ana sekmeleri (Takip: Market/Bekleyen/Liste)
✅ M46–M49: PlanBuilder Apply/Toplu Teklif akışı sağlamlaştırıldı + focus event

M48: fokus teklifler gerçekten gönderilince

M49: ROOM Shifts’te Market Teklifi kutusu + counter

M49: Agreement overlap room’lara market teklif skip (skippedRoomIds) + Agreements açıklama kartı

6) Kurallar / Disiplin

Yanıtlarda en fazla 3 PowerShell komutu.

“Green” = .\tools\pack.ps1 -To <hedef> PACK PASS.

Değişiklikler mümkün olduğunca tek seferde overlay (zip).

OSRM data repo’ya girmez: infra/osrm-data/ ignore.

7) Karar: Wizard yaklaşımı

Yeni wizard yazılmayacak.

Mevcut Company akışı “Guided Mode / stepper” olarak geliştirilecek.

Pazarlık/teklif takibi guided içine gömülmeyecek:

final: “Gönderildi” + “Bekleyen Talepler’e Git (filtreli)”.

8) Ürün Kararı: Agreement ↔ Shift ayrımı (kafa karışıklığı sıfır)

Agreement = anlaşma takvimi + fiyat/koşul (uzun/kısa süreli; Room “hangi firmalarla anlaşmam var?”)

Shift = operasyon (durak/rota/personel/maxWalk/araç-şoför)

Hedef kural:

Agreement APPROVED olunca otomatik shift üretimi

Rolling ufuk: 7 gün, TR (+03:00) saat ile

Agreement’lı shift: APPROVED, offer/pazarlık UI kapalı + agreementId badge

Room AgreementsPanel: companyOfferAmount + note görünür + agreement:update WS/notification

9) Şablonlar: “Günler + Süre”

Mevcut: kafa karıştırıyor ve üretimi tetiklemiyor.

Karar: Template UI’dan kaldır (veya Advanced’e göm).

Kısa işler için: Agreement create’de Quick Duration presetleri:

1 gün (default), 2/3/4 gün, 1 hafta, 1 ay

10) Sonraki işler (Overlay roadmap)

M52: Agreement Shift Generator → rolling 7 gün + TR saat + (gerekirse) vehicle/driver zorunluluğunu gevşet

M53: Room teklif görünürlüğü (companyOfferAmount/note + WS)

M54: Agreement’lı shiftlerde offers/counter kapatma + badge

M55: Template cleanup + Agreement quick duration (DURATION_PRESETS: 1d/2d/3d/4d/1w/1m)

Not: Yerel overlay’ler: M51_A (Shifts default pending + accept gating + manual talep kaldır), M51_B (Shift Tools hub kartı).

İstersen sıradaki adım olarak (primerdeki plana göre) direkt M52 (Agreement → rolling 7 gün, TR saat, APPROVED shift üretimi) overlay’ine geçelim.