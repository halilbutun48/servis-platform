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

## Beklenen sonuç
- Backend ve web bagimliliklari kurulmuş olur.
- Prisma client üretimi tamamlanır.
- Repo doğrulama zinciri temiz geçer.

## Not
- Bu akış, mevcut `verify:repo`/`verify:final` omurgasının yerine geçmez; sadece yeni ve temiz bir checkout'un ilk kapısıdır.
