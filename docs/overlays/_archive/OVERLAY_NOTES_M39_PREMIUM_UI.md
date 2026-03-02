# OVERLAY M39 — Premium UI + Usability Cleanup (Company + Room)

Amaç: Sistem çalışıyor; şimdi **daha premium + daha az yorucu** bir arayüz.
Bu overlay **işlevi bozmaz**, sadece UI/UX + okunabilirlik + menü düzeni düzeltir.

## 1) Büyük UX düzeltmeleri
- ✅ **Nav active highlight düzeldi**: `AppShell` artık `path` alıyor → sol menü hangi sayfada olduğunu doğru gösterir.
- ✅ **Okunabilirlik (geniş ekran)**: Map dışı sayfalar artık `page` container ile **merkezde ve max-width**.
  - Map sayfaları (`*/map`) **fluid** kalır.

## 2) Premium Theme (web/src/index.css)
- Yeni tasarım token’ları (bg/surface/border/accent) + daha yumuşak kontrast.
- Kartlar: gradient + daha az sert border + daha dengeli gölge.
- Input/select/button: focus ring + hover states.
- Tablo: sticky header + zebra + daha rahat satır aralığı.
- Eksik class fix: `.error` artık `.err` ile aynı görünür.

## 3) Menü (NavDock) sadeleştirme
- Menüler **gruplandı**: Ana / Operasyon / Sözleşme / Gelişmiş.
- **Gelişmiş** bölümü toggle (localStorage: `psv1:nav:advanced`).
- Etiketler daha anlaşılır TR metinlere çekildi.

## 4) Hub ekranları (Company + Room)
- Konum ekranı daha kompakt ve “premium form” düzeninde.
- Aksiyonlar: Konumumu Al / Adresten Bul / Kaydet → aynı çizgide, primary button vurgulu.

## 5) Room Agreements premium layout
- Inline style’lar temizlendi → ortak `.card`, `.tableWrap`, `.tbl`, `.fieldRow` kullanılıyor.
- Pending + Others aynı sayfada daha okunabilir.

## Değişen dosyalar
- `web/src/index.css`
- `web/src/App.jsx`
- `web/src/layout/AppShell.jsx`
- `web/src/layout/NavDock.jsx`
- `web/src/panels/company/HubPanel.jsx`
- `web/src/panels/company/AgreementsPanel.jsx` (StatusPill + tableWrap)
- `web/src/panels/room/HubPanel.jsx`
- `web/src/panels/room/AgreementsPanel.jsx`

## Smoke / UX kontrol listesi
- COMPANY: Home → Shifts → Agreements → Hub (menü active doğru mu?)
- ROOM: Offers → Shifts → Agreements → Hub (menü grupları OK mi?)
- Hub: Konumumu Al / Adresten Bul / Kaydet (butonlar ve mesajlar okunaklı mı?)

