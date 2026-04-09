# M90 — CANONICAL CLOSURE / 10-10 KAPANIŞ PAKETİ

Amaç: `M0->M89 green` bazının üstüne yeni özellik eklemek değil; repo gerçeğini tek canonical çizgide toplamak.

## Kapsam
- kanonik markdown hizası
- `tools/repo_contract_state.json` güncellemesi
- `pack.ps1`, `pack_living.ps1`, `verify_living_runtime.ps1` üst hat hizası
- `SCRIPT_KILAVUZU_MILESTONE_HARITASI.md` tek resmi rehberi
- screenshot bağımlılığını azaltan proof reformu
- repo hijyen kapanışı

## Çıkış ölçütleri
- canonical docs aynı resmi anlatır
- tek rehber kuralı uygulanır
- `pack.ps1 -To 89` orkestrasyonu upper-route'ı çağırır
- state-first kuralı ile markdown çelişmez
- proof modelinde screenshot destekleyici kanıt seviyesine iner

## M90B.1 — executable closure gate
- Amaç: `M0->M89 green` bazının üstüne docs/state/pack/verify convergence için çalışan resmi kapanış kapısı koymak.
- Komut: `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`
- Bu gate yeni ürün özelliği doğrulamaz; kanonik kapanış hattının gerçekten yürütülebilir olduğunu doğrular.
- Bu gate özellikle şunları bağlar: `repo_contract_state`, `pack.ps1`, `pack_living.ps1`, `verify_living_runtime.ps1`, `repo_audit.js`, `SCRIPT_KILAVUZU_MILESTONE_HARITASI`, primer ve backlog hizası.
