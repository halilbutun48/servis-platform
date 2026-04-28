# LIVING BASELINE M75

Tarih: 2026-03-27  
Timezone: Europe/Istanbul

## Amaç
Bu dosya M76A-1 kapsamında yaşayan doğrulama setini tek yerde toplar. Amaç tüm eski pack'leri silmek değil; aktif ana omurgayı, hedefli hotfix pack'lerini ve kanonik helper standardını netleştirmektir.

## Green baseline
- M0 -> M41 gate PASS
- M42 -> M58 geçmiş baseline tamam
- M59 -> M66 role rollout / operasyon hattı geçmiş baseline tamam
- M67 -> M75 kurumsal ölçek ve hot-path sertleştirme hattı çalıştı
- M75 sert storm profilinde 429 = 0, 5xx = 0, toplam 117 adet 200 görüldü
- Bu durum yaşayan teknik taban olarak **M75 green baseline** kabul edilir

## Kanonik giriş noktaları
- Master giriş: `tools\pack.ps1 -To 76 -RepoDir D:\servis-platform -NoBuild`
- Faz pack'leri:
  - `tools\_packs\pack_m0_m41.ps1`
  - `tools\_packs\pack_m42_m58.ps1`
  - `tools\_packs\pack_m59_m66.ps1`
  - `tools\_packs\pack_m67_m75.ps1`
  - `tools\_packs\pack_m76_m81.ps1`
- Manifest: `tools\milestone_pack_manifest.json`

## Master zincirde yaşayan pack seti
- M42 optional
- M43 -> M58 baseline pack'leri
- M59 -> M66 role rollout / operasyon pack'leri
- M67 kurumsal ölçek hazırlık
- M68 fetch hardening
- M69 fetch hardening phase2
- M70 checker sync + hot path
- M71 summary hotpath
- M72 hot endpoint reduction
- M73 hot path phase2
- M74 hot path phase3
- M75 hot path phase4
- M76A-1 minimum normalizasyon

## Hedefli doğrulama pack'leri (master zincir dışında)
Bunlar tamamen çöpe atılmadı. Hâlâ hedefli kontrol için değerlidir; ancak master manifest zincirinin ana omurgası değildir.

- `tools\pack_m71_room_title_hotfix.ps1`
- `tools\pack_m71_workflow_loadsummary_hotfix.ps1`
- `tools\pack_m71_ui_contract_hotfix.ps1`
- `tools\pack_m72_georeview_token_hotfix.ps1`
- `tools\pack_m75_repo_contract_hotfix.ps1`

## Kanonik helper standardı
Yeni veya dokunulan doğrulama dosyalarında hedef standart aşağıdaki helper setidir:

- Görsel/çıktı standardı: `tools\_console_status.ps1`
- Manifest çözümü: `tools\_manifest_pack_helpers.ps1`
- Standart pack çatısı: `tools\_pack_runner.ps1`
- Repo-contract ortak doğrulama: `tools\_repo_contract_common.ps1`

Not: Eski pack/check dosyalarının hepsini tek seferde yeniden yazmak bu adımın amacı değildir. M76A-1, yaşayan seti ve yeni standart yönünü sabitler.

## M76A-1 başarı ölçütü
- Master pack artık M67 -> M75 ve M76A-1'i görebilir
- Manifest yaşayan M67 -> M76 setini bilir
- Living baseline listesi tek yerde vardır
- En az bir yanlış alarm üreten hotfix pack/check çifti kanonik kök çözümüne çekilmiştir
- Repo audit sonucu korunur; cleanup sonraki fazdır
