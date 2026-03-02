# OVERLAY M42 — Company Shifts UI (Create/Track tabs) + Hub save feedback fix

Tarih: 2026-02-26

## 1) Room/Company Hub — “Kaydedildi” bildirimi
**Sorun:** Room Hub'da `save()` sonrası `load()` çağrısı `msg`'yi sıfırladığı için “Kaydedildi” mesajı anında kayboluyordu.

**Çözüm:**
- `load(opts={silent})` eklendi.
- `save()` sonrası `load({silent:true})` ile veri reload yapılır ama mesaj korunur.

Dosyalar:
- `web/src/panels/room/HubPanel.jsx`
- `web/src/panels/company/HubPanel.jsx`

## 2) Company → Vardiyalar (Shifts) ekranı: daha derli toplu
**Hedef:** Sayfa uzamasını azaltmak, “oluşturma” ve “takip” akışını ayırmak.

### 2.1 Page Tabs
- Üste iki ana sekme:
  - **Oluştur**: Manuel Talep / Şablonlar / Plan Builder / Shift Tools
  - **Takip**: Hızlı Filtre + Market/Bekleyen/Liste

### 2.2 Takip içinde alt sekmeler
- **Market / Bekleyen / Liste** artık **tab** mantığıyla tek ekranda “tek bölüm” gösterir.
- Plan Builder “focus” event’i (`company:shifts:focus`) geldiğinde otomatik **Takip** sekmesine geçer ve doğru alt sekmeyi açar.

Dosya:
- `web/src/panels/company/ShiftsPanel.jsx`

## Not: “Takip” ekranını Sözleşmeler’e taşıma
Bu overlay bunu yapmaz. Çünkü **Sözleşmeler (Agreement)** “dönemsel sözleşme” domain’idir; Market/Bekleyen/Liste ise **Shift operasyon takibi**.
En pratik ve anlaşılır yapı: Shifts ekranında **Takip** sekmesi.
