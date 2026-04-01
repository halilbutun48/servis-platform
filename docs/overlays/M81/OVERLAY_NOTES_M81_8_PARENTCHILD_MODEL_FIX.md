# M81.8 — ParentChild Prisma Model Fix (SUPER_ADMIN parent↔student bağlama crash)

> Tarihsel not (2026-04-01): Bu dosyadaki M80/M81/M82 numarası Mart 2026 overlay serisine aittir. Güncel aktif milestone anlamı için `docs/PRIMER_SSOT.md` ve `docs/MILESTONE_REGISTRY_V1.md` baz alınır.


## Problem
SUPER_ADMIN "Parent ↔ Öğrenci bağla" ekranı `GET /api/admin/parent-children` çağrısında API crash:

- `TypeError: Cannot read properties of undefined (reading 'findMany')`
- Root cause: Prisma client içinde `prisma.parentChild` **yok** (schema.prisma’da `model ParentChild` yok / relation eksik)

## Fix
`tools/patch-parentchild-model.ps1`:
- `model ParentChild` ekler (yoksa)
- `model User` içine `parentChildren ParentChild[]` relation’ını ekler (yoksa)
- `model Personel` içine `parentLinks ParentChild[]` relation’ını ekler (yoksa)
- UTF-8 no-BOM yazar + `tools/_backup` altına backup alır

## Apply
1) Overlay’i repo root’a extract et
2) PowerShell:
- `.	ools\patch-parentchild-model.ps1`
- `.	ools
eset-and-pack.ps1`

## Result
- Prisma client artık `prisma.parentChild` üretir
- Admin parent-child list/create/delete route’ları crash olmadan çalışır
