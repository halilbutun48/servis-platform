# RUNBOOK — M90 CANONICAL CLOSURE / 10-10 KAPANIŞ PAKETİ

Amaç: yaşayan repo gerçeği ile docs / state / script guide / proof / verification hattını tek resmi davranışta buluşturmak.

## Öncelik sırası
1. `tools\pack.ps1 -To 89`
2. `tools\verify_living_static.ps1`
3. `tools\verify_living_runtime.ps1 -To 89`
4. `tools\check_repo_audit_master.ps1`
5. `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`

## M90 alt blokları
- `M90A` canonical markdown hizası
- `M90B` state + pack/verify convergence
- `M90B.1` executable closure gate
- `M90C.6` hot-file queue policy
- `M90C` proof reformu
- `M90D` tek parça script rehberi
- `M90E` repo hijyen kapanışı

## M90B.1 çalışma mantığı
- Bu adım mevcut `M0->M89 green` bazını tekrar tanımlamaz; onu kapanış doğrulamasının ön koşulu olarak kabul eder.
- Komut: `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`
- Beklenen sonuç: state/pack/verify/audit/script-guide/primer hattı tek resmi gerçeği anlatır ve ölü split kalıntıları source içinde kalmaz.

## M90C.6 çalışma mantığı
- Bu adım repo-audit sıcaklık listesini state-first policy ile bağlar.
- Komut: `tools\pack_m90_c6_hot_file_queue_policy.ps1 -RepoRoot D:\servis-platform`
- Beklenen sonuç: large/hot file seti ile policy sınıflaması birebir eşleşir; justified exception ve acceptance-sensitive dosyalar net adlandırılır; safe candidate review kuyruğu resmi hale gelir.

## Değişmez kural
- yeni ürün özelliği açılmaz
- ticari omurgaya yeni domain eklenmez
- odak yalnızca doğrulama / kabul / SSOT / hijyen hizasıdır
- screenshot ana kanıt olarak kullanılmaz
