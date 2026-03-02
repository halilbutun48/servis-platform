# OVERLAY_NOTES_M81_1_2_PARENTCHILD_INCLUDE_FIX

## Fix
- `/api/admin/parent-children` Prisma include field name fix:
  - `include: { personel: ... }` → `include: { child: ... }`
  - Response JSON stays the same (`personel` key preserved) so UI does not change.
- Prevents PrismaClientValidationError and nodemon crash when opening the PARENT edit modal.

## Why
Your Prisma model `ParentChild` exposes relations as `parent` and `child` (not `personel`).

## Apply
Extract overlay to repo root, rebuild api container.
