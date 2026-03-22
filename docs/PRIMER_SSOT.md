# SERVIS-PLATFORM — PERSONEL SERVİS V1 — PRIMER SNAPSHOT

Tarih: 2026-03-20
Timezone: Europe/Istanbul
Repo: `D:\servis-platform`
Branch: `main`

## 0) Genel durum

- `M59 -> M65` saha öncesi sertleştirme hattı **green taban** olarak duruyor.
- Ancak `M59 -> M65` için tam uçtan uca yeniden kontrol ve saha testi **henüz tamamlanmış sayılmaz**.
- Şu an repo **post-M66 functional** durumdadır.
- `M66` fonksiyonel geliştirme olarak eklendi; fakat tam milestone kapanışı için canlı smoke + saha testi + yeniden doğrulama gereklidir.
- Repo cleanup / duplicate code cleanup / dead code cleanup / büyük performans sadeleştirmesi **henüz yapılmadı**.

## 1) M66 güncel durum

- `M66-A1` çekirdek çalışıyor:
  - ROOM, `APPROVED/ACTIVE` vardiyada araç/sürücü atamasını değiştirebiliyor.
  - değişiklik audit + notification + operation event olarak yazılıyor.
  - COMPANY tarafında Vardiyalar / Liste içinde operasyon kaydı görülebiliyor.
- `M66-A2b` polish yapıldı:
  - buton dili: **Değişikliği Kaydet ve Paketi Yenile**
  - yeni sürücüye `shift:update + route:plan` zinciri
  - eski sürücüye removal zinciri
- operation event reason metinleri kullanıcı diliyle gösteriliyor.
- verification katmanı eklendi:
  - `backend/scripts/m66check.js`
  - `tools/pack_m66_operation_reassignment.ps1`
  - `tools/check_m66_operation_reassignment_repo_contract.ps1`
  - `docs/RUNBOOK_M66_OPERATION_REASSIGNMENT.md`

## 2) Dürüst saha öncesi durum

- `M59 -> M65` için green taban var.
- Ama **"tam saha hazır ve her şey yeniden doğrulandı"** denemez.
- Özellikle baştan aşağı kontrol gerekecek:
  - yönlendirmeler
  - tarih / saat akışları
  - role-based rollout
  - market / pazarlık / bekleyen / liste akışları
  - bildirim ve ws zinciri
  - operasyon görünürlüğü
  - hizmet değerlendirme
  - admin / observability / launch gate yüzeyleri
  - `M66` operasyonel reassignment canlı zinciri

## 3) Yeni tek komut hattı

Kanonik tam komut artık:

- `tools\pack.ps1 -To 66 -RepoDir D:\servis-platform -NoBuild`

Bu master pack:
- statik repo check'leri koşturur,
- `M0 -> M41` gate hattını koşturur,
- `M42 -> M66` pack zincirini koşturur,
- sonunda repo audit raporu üretir.

Repo audit wrapper:
- `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`

Audit raporu:
- `artifacts/repo-audit/repo_audit_latest.json`

## 4) Büyük cleanup fazı (sonraki ana faz)

1. `M0 -> M66` baştan aşağı kontrol / eksik fonksiyonel noktaları kapatma
2. saha testi / canlı akış doğrulama
3. büyük repo cleanup
   - duplicate kod
   - eski / legacy / orphan parçalar
   - dead code
   - ortak helper/domain grouping
   - backend/frontend/mobile gereksiz yük üreten parçaların temizliği
4. performans ve ölçek hazırlığı
   - 2000 eşzamanlı kullanıcı hedefi için gereksiz render / fetch / listener / interval / paralel akışların azaltılması

## 5) Yeni sohbet için ilk cümle

Repo şu an post-M66 functional durumda. M66 operasyonel reassignment çekirdeği ve verification pack'i eklendi. Ancak M59–M66 için baştan aşağı kontrol, saha testi ve sonrasında derin repo cleanup fazına geçmemiz gerekiyor. Öncelik artık eksik fonksiyonel noktaları kapatmak, sonra canlı doğrulama ve ardından duplicate/legacy/dead code temizliği yapmak.
