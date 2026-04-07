# M90B Runtime / Repo-Contract Fix Overlay

Bu overlay şu iki gerçek kırığı düzeltir:

1. `tools/check_m89_settlement_reconciliation_desk_repo_contract.ps1` içinde dot-source satırı ile `$backend` ataması aynı satırda kalmıştı. Bu nedenle `npm run m89check` bazen yanlış yerde çalışıp `Missing script: m89check` üretiyordu.
2. Birçok `tools/check_*.ps1` dosyasında dot-source satırı ile `function Info/Ok/...` tanımları aynı satıra yapışmıştı. Bu da `Info is not recognized` türü pack kırıkları üretiyordu.

Ek düzeltme:
- `tools/check_m45_retention_backup_repo_contract.ps1` içindeki bozuk `$1` parametreleri onarıldı.

Bu overlay ürün davranışını değiştirmez; sadece pack/check katmanındaki bozuk PowerShell dosyalarını düzeltir.
