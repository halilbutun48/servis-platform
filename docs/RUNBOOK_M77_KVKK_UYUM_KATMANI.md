# RUNBOOK — M77 KVKK + UYUM KATMANI

## Amaç
Bu adımın amacı KVKK/uyum tarafını tek seferde hukuki finale taşımak değildir. Amaç, M77 için yaşayan pack/check omurgasını açmak ve bundan sonraki KVKK işlerini tek bir kanonik faz altında toplamak.

## İlk tur kapsamı
- aydınlatma metinleri envanteri için iskelet
- veri görünürlük matrisi için iskelet
- retention / silme / anonimleştirme yaklaşımı için iskelet
- audit ve erişim izi uyumu için iskelet
- manifest, pack, repo-contract ve living static bağları

## İlk turda özellikle yapılmayanlar
- tüm ekranlarda son metin yerleşimi
- bütün roller için final görünürlük enforcement'ı
- tüm anonimleştirme job'larının son hali
- hukuk/onay metninin finalleştirilmesi

## Kanonik komut
- `tools\pack_m77_kvkk_uyum_katmani.ps1 -RepoRoot D:\servis-platform`

## Living bağları
- Faz wrapper'ı zaten `tools\packs\living\pack_phase_m76_m81.ps1` üstünden çalışır.
- Manifestte `M77` kaydı olduğu için `tools\pack.ps1 -To 77` ve `tools\verify_living_runtime.ps1 -To 77` akışları bu pack'i görür.
- Static doğrulama tarafında `tools\verify_living_static.ps1` artık `tools\checks\living\check_m76_m81_static.ps1` çağrısı üzerinden M77 repo-contract iskeletini de kontrol eder.

## Bu faz altında sonraki alt başlıklar
1. aydınlatma metinleri taslakları
2. veri görünürlük matrisi
3. retention / silme / anonimleştirme policy kararı
4. audit ve erişim izi kontrol listesi
5. ekran/rol bazlı enforcement listesi

## Çıkış ölçütü
- M77 pack vardır
- M77 repo-contract vardır
- M77 milestone/runbook vardır
- manifest M77 kaydını görür
- living static doğrulama M77 iskeletini görür
