# OVERLAY — Organization Plan Ops

Bu overlay, ORGANIZATION mode için demo moddan gerçek veri modeline geçiş iskeleti ekler.

## Eklenenler
- OrganizationPlan
- OrganizationStop
- /api/organization/plans CRUD
- toplu lokasyon import (UI textarea → stop listesi)
- saat penceresi edit
- plan → requested shift
- plan → agreement request

## Not
Bu paket mevcut M42 check-in hattına dokunmamaya çalışır. Yine de apply sonrası:
- .\tools\pack.ps1 -To 41
- .\tools\pack_m42_optional.ps1
çalıştırılmalıdır.
