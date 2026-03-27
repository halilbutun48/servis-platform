# M76A-1 — MINIMUM CHECK / RUNBOOK NORMALIZATION

Tarih: 2026-03-27

## Amaç
Cleanup başlamadan önce doğrulama hattının yaşayan kısmını görünür ve güvenilir hale getirmek.

## Kapsam
- aktif pack envanteri
- kanonik helper isimleri
- master pack / manifest hizası
- living baseline listesi
- yanlış alarm üreten en az bir hotfix pack/check çiftinin kök çözümüne çekilmesi

## Bu adımın yaptığı
- `tools\pack.ps1` artık `M67 -> M75` ve `M76A-1` fazlarını görür
- manifest artık yaşayan `M67 -> M76` pack setini bilir
- `docs\LIVING_BASELINE_M75.md` yaşayan omurgayı ayırır
- `pack_m71_workflow_loadsummary_hotfix.ps1` ve ilgili repo-contract check kanonik kök çözümüne çekilir
- `backend\scripts\m76a_1_minimum_normalization_check.js` minimum normalizasyon raporu üretir

## Bilinçli olarak yapmadığı
- tüm eski pack/check dosyalarını yeniden yazmaz
- cleanup yapmaz
- legacy/archive ayrımını tam kapatmaz
- KVKK / checklist / copilot / mobil saha fazlarını öne çekmez

## Çıkış ölçütü
- master pack `-To 76` ile yaşayan zinciri ifade eder
- minimum normalizasyon check raporu üretilir
- M75 green baseline anlatısı README / startpack / backlog / primer snapshot yüzeylerinde hizalanır
