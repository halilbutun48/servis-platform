# RUNBOOK — M80.1 HOT PANEL DARALTMA

## 1) Amaç
M80 kabul kapısı açıldıktan sonra sıcak panel yüklerini küçük ve güvenli adımlarla daraltmak.

## 2) Bu turdaki kapsam
### GeoReviewPanel
- doğrudan ham `/api/company/personels?...` çağrısı kaldırılır
- helper/cached yol kullanılır
- ilk açılışta zorunlu force refresh sadece açık niyet varsa yapılır
- durum/neden filtre değişimi her seferinde geniş liste yükünü tetiklemez

### MapPanel
- vehicles/shifts yeniden yükleme zamanlayıcıları tek yardımcıda toplanır
- event burst geldiğinde art arda yükleme yerine koalesced refresh uygulanır

### ShiftsPanel
- rooms auto-reload tarafında `force: true` zorlaması kaldırılır
- referans verisi TTL/cached akıştan yararlanır

## 3) Kanonik komut
`tools\pack_m80_1_hot_panel_daraltma.ps1 -RepoRoot D:\servis-platform`

## 4) Beklenen işaretler
- `GeoReviewPanel` içinde ham personels query izi kalmamalı
- `MapPanel` scheduleRefresh/ref helper ile tek noktadan zamanlama yapmalı
- `ShiftsPanel` rooms auto reload force olmadan çalışmalı
- `scale_readiness_check` geçmeye devam etmeli

## 5) Sınır
Bu tur yeni UI açmaz, veri modeli değiştirmez, mobil alanına geçmez.
