# M71 Workflow loadSummary Hotfix

Amaç:
- Company > Planlama Merkezi ekranındaki `loadStats is not defined` UI hatasını kapatmak.

Değişiklik:
- Geo review kartındaki `Yenile` butonu artık olmayan `loadStats` referansı yerine güvenli `loadSummary()` çağrısı kullanır.

Doğrulama:
- `tools/pack_m71_workflow_loadsummary_hotfix.ps1`
