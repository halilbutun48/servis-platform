# RUNBOOK — M90B.1 EXECUTABLE CLOSURE GATE

Amaç: M90 kapanış yönünü çalışan resmi kapıya bağlamak.

## Çalıştırma sırası
1. `tools\pack.ps1 -To 89 -RepoDir D:\servis-platform -NoBuild`
2. `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
3. `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`

## Beklenen çıktı
- `MASTER PACK PASS OK (M0->M89)`
- `REPO AUDIT MASTER PASS`
- `M90B.1 canonical closure gate PACK PASS`

## Bu gate neyi doğrular?
- `repo_contract_state` M89 üst hattını doğru tutuyor mu?
- `pack.ps1`, `pack_living.ps1`, `verify_living_runtime.ps1` aynı upper-route gerçeğini anlatıyor mu?
- `repo_audit.js` hot/large file görünürlüğünü closure hattında koruyor mu?
- primer/backlog/registry/script-guide M90B.1 komutunu resmi kapı olarak gösteriyor mu?
- başarısız `helpComposer` split kalıntıları source içine geri dönmüş mü?

## Not
Bu gate yeni ürün davranışı doğrulaması değildir. `helpComposer.js` final küçültme işi bunun bir sonraki kontrollü adımıdır.
