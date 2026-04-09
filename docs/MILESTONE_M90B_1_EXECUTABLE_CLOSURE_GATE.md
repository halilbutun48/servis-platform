# M90B.1 — EXECUTABLE CLOSURE GATE

Amaç: `M0->M89 green` bazının üstüne, M90 kapanış yönünü laf seviyesinden çıkarıp çalışan resmi kapıya bağlamak.

## Kapsam
- `tools/repo_contract_state.json` ile aktif milestone ve upper-route bilgisinin korunması
- `tools/pack.ps1`, `tools/pack_living.ps1`, `tools/verify_living_runtime.ps1` hattının M89 üst sınırında hizalı kalması
- `backend/scripts/repo_audit.js` görünürlük sertleştirmesinin closure hattına bağlanması
- `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md`, primer, backlog ve registry içinde aynı closure komutunun görünür olması
- başarısız split kalıntılarının source içinde tekrar görünmemesi

## Dışında kalanlar
- yeni ürün özelliği
- `helpComposer.js` final küçültme işi
- `schema.prisma` için sonraki karar

## Komut
- `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`

## Başarı ölçütleri
- M89 green bazı korunur
- closure gate repo contract PASS verir
- `npm run m90b1check` PASS verir
- state/pack/verify/audit/script-guide/primer hattı tek resmi gerçeği anlatır
- `helpComposerFlowSupport.js`, `helpComposerEntitySupport.js`, `helpComposerSelectedSupport.js` source içinde geri dönmez
