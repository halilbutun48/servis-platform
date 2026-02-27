SERVIS-PLATFORM — PERSONEL SERVİS V1 — PRIMER SNAPSHOT (Yapıştır & Devam Et)

Tarih: 2026-02-28 (Europe/Istanbul)

0) Durum / Referans

Repo: D:\servis-platform

Gate/Pack:
- tools/pack.ps1 şu an [ValidateRange(0,35)] → hedef üst sınır M35
- Son kaydedilmiş GREEN: ✅ GATE PASS (M0→M33) + ✅ PACK PASS (M0→M33)
- Güncel doğrulama komutu (öneri): .\tools\pack.ps1 -To 35

Not (numaralandırma):
- “M0→M35” Gate/Pack stage’idir.
- “OVERLAY_NOTES_Mxx” dosyalarındaki Mxx ise UI/overlay serisi olabilir; Gate/Pack ile birebir aynı olmak zorunda değil.

1) V1 Amaç

GPS tabanlı personel servis platformu:

- Company planlama (Templates + Guided flow + Market teklifler)
- Room operasyon (Shifts/Offers → counter/accept → approve/start → operasyon)
- Driver operasyon (route + reached + complete)
- Personel (request + my ride)
- WS ile canlı güncelleme + bildirimler + dedupe

2) Roller

- SUPER_ADMIN: Companies/Rooms yönetimi + overview
- COMPANY: Agreement/Shift talebi, Market ile çoklu room teklif toplama, offers yönetimi
- ROOM: araç+sürücü, teklif inbox, approve/start, map/shift operasyonu
- DRIVER: aktif rota + reached akışı
- PERSONEL: request + my ride

3) En kritik akış (sahada “az tık”)

- Company hub + personel konumları hazır (geoStatus=OK, lat/lng dolu; 0,0 değil)
- Company: plan → N shift → toplu teklif
- Room: counter/accept → approve/start
- Driver: reached → done

4) Mevcut UX paketleri (elde var)

M51 (overlay serisi):
- Company Vardiyalar default: Takip → Bekleyen/Teklifler (mainTab=track, trackTab=pending)
- “Manuel Talep Aç” kaldırıldı
- Offers modal “Kabul Et” yalnızca COUNTERED iken aktif
- Shift Tools: “Vardiya Toplanma/Dağıtım Yeri (Hub)” kartı + Adresten Bul (/api/geocode) + durak listesine OUTBOUND başa / INBOUND sona ekleme
- Shift Extend (süre uzatma) modülü mevcut: company extend-request, room extend-decision + notification/WS

5) Tasarım notu

- Plan Builder V1: shift’e bağlı (shift seç → personel/durak üret → route preview)
- V1.5 hedef: Shift’ten bağımsız Plan Builder (OSRM + solver) → “Uygula” → N shift create (market) → offers → accept → room approve/start

6) Kurallar / Çalışma disiplini

- Yanıtlarda en fazla 3 PowerShell komutu.
- “Green” = .\tools\pack.ps1 -To <hedef> PACK PASS.
- Değişiklikler mümkün olduğunca tek seferde overlay (zip) paket.
- Büyük dosyalar (örn. OSRM blob) repo’ya girmez: infra/osrm-data/ ignore.

7) Karar: Wizard yaklaşımı

- Yeni wizard yazılmayacak.
- Mevcut Company akışı “Guided Mode / stepper” olarak geliştirilecek.
- “Advanced” ekranlar (Shift Tools, Templates) kalacak; guided arkadan kullanacak.
- Pazarlık/teklif takibi guided içine gömülmeyecek:
  - Final: “Gönderildi” + “Bekleyen Talepler’e Git (filtreli)”.

8) Ürün kararı: Agreement ↔ Shift ayrımı (kafa karışıklığı sıfır)

- Agreement = anlaşma takvimi + fiyat/koşul (uzun/kısa süreli)
  - Room: “hangi firmalarla ne zaman çalışıyorum?”
- Shift = operasyon (durak/rota/personel/maxWalk/araç-şoför)

Hedef kural:
- Agreement APPROVED → otomatik shift üretimi (rolling ufuk = 7 gün)
- Üretilen shift’ler: APPROVED (pazarlık/offer UI kapalı) + agreementId badge
- Room AgreementsPanel: companyOfferAmount/note görünür + agreement:update WS/notification
- Template ekranındaki işlevsiz “Günler + Süre” kaldırılacak; kısa işler için Agreement create’de quick duration presetleri:
  - 1 gün (default), 2/3/4 gün, 1 hafta, 1 ay

9) Sonraki işler (plan — agreement stream)

- AGREEMENT-A: shift generator rolling 7 gün + TR (+03) saat doğruluğu + idempotent
- AGREEMENT-B: Room panelde company teklifi görünürlüğü + WS
- AGREEMENT-C: Agreement’lı shiftlerde offer/counter UI kapatma + badge
- AGREEMENT-D: Template cleanup + Agreement quick duration presetleri
