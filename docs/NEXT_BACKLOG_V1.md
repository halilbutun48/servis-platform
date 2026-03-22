# NEXT BACKLOG V1

Tarih: 2026-03-20
Timezone: Europe/Istanbul

Current direction: **post-M66 functional -> full M0-M66 rerun -> live smoke -> field validation -> deep repo cleanup**

## 1) Resmi durum
- `M59 -> M65` green taban mevcut
- `M66` fonksiyonel çekirdek mevcut
- Tam milestone kapanışı için `M59 -> M66` yeniden kontrol gereklidir
- Büyük cleanup / duplicate / dead code / performance sadeleştirmesi henüz yapılmadı

## 2) Hemen sonraki ana faz
1. `M0 -> M66` master pack ile baştan sona yeniden koşum
2. eksik fonksiyonel noktaların kapatılması
3. canlı smoke / saha akışı doğrulaması
4. derin repo cleanup
5. performans ve ölçek hazırlığı

## 3) Kanonik komutlar
- `tools\pack.ps1 -To 66 -RepoDir D:\servis-platform -NoBuild`
- `tools\reset-and-pack.ps1 -To 66 -NoBuild`
- `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`

## 4) Cleanup fazında odak alanları
- duplicate pack/check iskeletleri
- legacy / orphan adayları
- dead code
- gereksiz listener / interval / duplicate fetch yüzeyleri
- archive/live gölge dosya çiftleri
- backend/frontend/mobile tarafında gereksiz yük üreten paralel akışlar

## 5) İlk cümle
Repo şu an post-M66 functional durumda. M66 operasyonel reassignment çekirdeği ve verification pack'i eklendi. Ancak M59–M66 için baştan aşağı kontrol, saha testi ve sonrasında derin repo cleanup fazına geçmemiz gerekiyor.
