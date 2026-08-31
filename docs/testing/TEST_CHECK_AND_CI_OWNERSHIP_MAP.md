# Test, check and CI ownership map

Checks are evidence owners, not substitutes for the implementation owner. Apply the project’s one-first-failure discipline and do not self-approve a check by changing its guard dynamically.

| Check family | Owner | When to run | Proves | Does not prove |
|---|---|---|---|---|
| Focused milestone check | `backend/scripts/*_check.js` and package scripts | after a bounded change | owner contract and negative sensitivity | every product surface |
| Product extensions | `backend/scripts/run_product_extensions_check_chain.js` and `productExtensionsRegistry.js` | closure/current-head | registered extension chain | production SLA |
| Repo verification | `backend/scripts/run_repo_check_chain.js` | every closure | registered repo spine | unregistered behavior |
| Final verification | root `package.json` `verify:final` | final closure | web/mobile/product/repo chain | physical device or production DR |
| Prisma | #10/#11 scripts | schema/client/toolchain changes | generation, identity and schema parity | backup recovery |
| Backup/recovery | #12 check/acceptance | backup/migration risk | isolated backup/restore integrity | production PITR |
| Migration | #13 check/acceptance/CI | schema/migration change | history/status/replay contract | automatic rollback |
| Security/KVKK | `security_kvkk_final_01_check.js` | auth/privacy changes | covered security/privacy contract | external penetration test |
| Role/data isolation | `role_data_isolation_redteam_01_check.js` | tenant/RBAC changes | covered access negatives | unlisted integration paths |
| Audit/approval | `audit_log_and_approval_trace_01_check.js` | critical action changes | audit and approval boundary | legal accounting finalization |
| Real browser smoke | canonical UX smoke scripts | UI/runtime impact | visible current-head supported flows | physical device proof (#36) |
| Documentation | #16 checker and docs registry owner | architecture/owner/doc changes | owner/path/link/current-future integrity | business behavior |

## Canonical commands

- Documentation: `npm run check:projectdocumentationarchitectureandcodebaseindex01`
- Product extensions: `npm run check:product-extensions`
- Repo: `npm run verify:repo`
- Final: `npm run verify:final`
- Prisma: `npm --prefix backend run prisma:verify`, `npm --prefix backend run prisma:modularization:check`
- #12: `npm --prefix backend run backup:acceptance`, `npm run check:databasebackupretentionandintegrity01`
- #13: `npm --prefix backend run prisma:migration:acceptance`, `npm --prefix backend run prisma:migration:ci`

The actual package scripts and `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md` remain command authority. This document intentionally avoids duplicating long command inventories.

## CI map

`.github/workflows/vardis_verification_visibility.yml` is the current repository-native workflow. Its jobs cover repo verification, shareable-export hygiene, Prisma cross-platform/runtime checks, Linux runtime, container parity, migration baseline and export-related evidence. Job names and commands are authoritative in the workflow itself; this document does not claim a hosted CI result merely from YAML inspection.

CI and local/container paths must use the same lockfile, Prisma version, schema root and generation owner. CI cache identity must not accept a stale generated client after schema, lockfile, Prisma or generation-contract changes.

## Evidence quality rules

- Bind current-head evidence to HEAD, source identity, schema identity, version, platform, timestamp and result.
- Distinguish static, Windows-real, Linux-real, container-real, CI-real and negative evidence.
- Real browser is required for user-facing behavior; source-only claims are insufficient.
- Protected runtime-data stays untouched; exact staging is required.
- No dynamic SHA, broad allowlist, self-referential guard, or silent generated artifact acceptance.
