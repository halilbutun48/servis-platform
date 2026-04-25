# RUNBOOK — CLEAN CLONE VERIFICATION

Bu akış, temiz bir klonda repo'nun tek komutta doğrulanmasını hedefler.

## Kanonik sıra
1. `npm --prefix backend ci`
2. `npm --prefix web ci`
3. `npm --prefix backend exec -- prisma generate`
4. `npm run verify:repo`

## Neden bu sıra
- `ci` adimi temiz bagimlilik kurar.
- `prisma generate` schema/client tarafini yeniler.
- `verify:repo` backend/web doğrulama omurgasını tek girişte çalıştırır.

## Kullanım
- Tercih edilen komut: `tools\\verify_clean_clone.ps1`
- Script, repo kökünden ya da herhangi bir dizinden çağrılabilir.
- Backend bootstrap `--ignore-scripts` ile güvenli kurulur; clean-clone akışında Prisma generate en iyi çaba adımı olarak denenir.
- Temiz klon bootstrap sırasında script, `prisma generate` için yerel bir placeholder `DATABASE_URL` kullanır ve npm update notifier'ı kapatır; amaç secret istemeden tek atışlık doğrulama akışını sürdürmektir.
- Clean-clone runner, repo check chain çıktısını tek yerde toplayıp bilinen non-fatal Windows bootstrap gürültüsünü sessizleştirir; amaç bağımsız paketin daha deterministik görünmesidir.

## Beklenen sonuç
- Backend ve web bagimliliklari kurulmuş olur.
- Prisma client üretimi tamamlanır.
- Repo doğrulama zinciri temiz geçer.

## Not
- Bu akış, mevcut `verify:repo`/`verify:final` omurgasının yerine geçmez; sadece yeni ve temiz bir checkout'un ilk kapısıdır. Clean-clone içinde repo check chain doğrudan çalıştırılır; günlük kullanımda yine `verify:repo` kanonik girişidir.
- Çıktıda görülen fiziksel snapshot raporu soft-gate olarak kalır; evidence artifact'leri artık warning sayılmaz.
- Prisma generate adımı host ortamına bağlı best-effort bir bootstrap kontrolüdür; repo sağlığının esas kapısı `verify:repo` zinciridir.
