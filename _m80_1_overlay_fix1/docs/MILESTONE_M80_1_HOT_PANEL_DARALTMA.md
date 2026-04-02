# MILESTONE — M80.1 HOT PANEL DARALTMA

Tarih: 2026-04-02
Durum: aktif alt adım

## Amaç
M80 altında görünen sıcak panel yüklerini ürün davranışını bozmadan küçük ve kontrollü şekilde daraltmak.

Bu adım yeni ürün özelliği açmaz.
Bu adım yalnızca mevcut sıcak noktaları daha kontrollü hale getirir.

## Bu turdaki odak
- `GeoReviewPanel` gereksiz geniş liste yüklerini azaltır
- `MapPanel` event yağmurunda yeniden yüklemeyi tek yardımcıdan toplar
- `ShiftsPanel` rooms auto-reload tarafında zorlamalı referans yenilemesini gevşetir

## Kanonik dosyalar
- `tools/pack_m80_1_hot_panel_daraltma.ps1`
- `tools/check_m80_1_hot_panel_daraltma_repo_contract.ps1`
- `backend/scripts/m80_1_hot_panel_daraltma_check.js`
- `docs/RUNBOOK_M80_1_HOT_PANEL_DARALTMA.md`

## Kanonik komut
- `tools\pack_m80_1_hot_panel_daraltma.ps1 -RepoRoot D:\servis-platform`

## Green yorumu
Bu pack geçerse:
- M80.1 daraltma seti repo içine alınmış olur
- hedeflenen üç sıcak noktada kontrollü sadeleme doğrulanır

Bu pack geçmesi yine tek başına resmi final green değildir.
