# OVERLAY M40 — Log export audit trail (LOG_EXPORT) + RBAC matrix check
Tarih: 2026-03-05 (Europe/Istanbul)

## Ne değişti?
1) `/api/logs/export` her başarılı export çağrısında **AuditLog**'a kayıt atar:
   - `action=LOG_EXPORT`, `entity=LOGS`
   - meta: endpoint, kind, targetType/Id, childId, format, take, range, rowCount

2) `/api/admin/logs/export` da aynı şekilde **LOG_EXPORT** audit kaydı üretir.

3) `tools/gate.ps1` artık `-To 40` çalıştırınca:
   - M38 + M39 + M40 check’leri dahil olacak.

> M40CHECK beklentisi: SuperAdmin `/api/logs/export` çağırınca `LOG_EXPORT` audit kaydı görünmeli.

## Uygulama
- Bu zip’i repo köküne (`D:\\servis-platform`) **extract** et (overwrite).

## Doğrulama
- `tools/pack.ps1 -To 40` → PASS beklenir.
