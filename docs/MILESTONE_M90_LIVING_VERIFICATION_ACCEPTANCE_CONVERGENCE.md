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
- `helpComposer.js` exception policy canonical docs içinde tek anlamlı görünür

## M90B.1 — executable closure gate
- Amaç: `M0->M89 green` bazının üstüne docs/state/pack/verify convergence için çalışan resmi kapanış kapısı koymak.
- Komut: `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`
- Bu gate yeni ürün özelliği doğrulamaz; kanonik kapanış hattının gerçekten yürütülebilir olduğunu doğrular.
- Bu gate özellikle şunları bağlar: `repo_contract_state`, `pack.ps1`, `pack_living.ps1`, `verify_living_runtime.ps1`, `repo_audit.js`, `SCRIPT_KILAVUZU_MILESTONE_HARITASI`, primer ve backlog hizası.

## M90C.3 — helpComposer exception policy sync
- Amaç: `helpComposer.js` için alınmış justified exception kararını canonical docs içine tek anlamlı biçimde işlemek.
- Kural: line-count reduction hedefi yoktur; agresif refactor yapılmaz; yalnız acceptance-safe lokal düzeltme yapılabilir.
- Hedef yüzeyler: primer, backlog, tools primer, M90B.1 milestone, M90B.1 runbook.

## M90C.5 — schema.prisma decision gate
- Amaç: `backend/prisma/schema.prisma` için line-count odaklı yapısal split baskısını kapatıp resmi kararı kanonik dokülara bağlamak.
- Karar: schema bu hatta justified exception olarak korunur; split refactor M90 dışında kalır.
- Gerekçe: schema migration/seed/client/check hattının ortak path sözleşmesidir; M90 kapanış hattında split yüksek risk, düşük acceptance değeridir.
- İzin verilen değişiklikler: migration-safe şema ekleri, relation/index/constraint tamiri, acceptance-safe lokal düzeltme.
- Sonraki iş: `M90C.6 — hot-file queue policy`.

## M90C.6 — hot-file queue policy
- Amaç: repo-audit large/hot file listesini yalnız uyarı çıktısı olmaktan çıkarıp resmi sınıflı queue'ya çevirmek.
- Kural: kör line-count düşürme yok; önce acceptance, sonra kontrollü temizlik.
- Sınıflar: `justified exception`, `safe candidate review`, `acceptance-sensitive / later`.
- State-first kaynak: `tools/repo_contract_state.json > hotFileQueuePolicy`.
- Yürütülebilir kapı: `tools\pack_m90_c6_hot_file_queue_policy.ps1 -RepoRoot D:\servis-platform`.
