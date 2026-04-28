# OVERLAY_NOTES_M80_0 — School foundation (Company.kind=SCHOOL)

> Tarihsel not (2026-04-01): Bu dosyadaki M80/M81/M82 numarası Mart 2026 overlay serisine aittir. Güncel aktif milestone anlamı için `docs/PRIMER_SSOT.md` ve `docs/MILESTONE_REGISTRY_V1.md` baz alınır.


Tarih: 2026-03-02 (Europe/Istanbul)

## Amaç
Okul modunu **en az kıran** şekilde açmak:
- Company tablosu aynı kalsın, sadece `kind` ile varyantlaşsın.
- UI’da `/school/*` route’ları açılıp **Company panelleri reuse** edilsin.
- Öğrenci = Personel tablosunda `kind=STUDENT`.

> Bu overlay **Parent rolünü getirmez** (o M81 serisi).

---

## Değişiklikler

### 1) DB / Prisma
- `Company.kind = COMPANY | SCHOOL` (default: COMPANY)
- `Personel.kind = PERSONEL | STUDENT` (default: PERSONEL)

### 2) API
- `GET/POST/PUT /api/companies` → `kind` alanını destekler, `?kind=SCHOOL|COMPANY` filtresi gelir.
- `GET /api/company/personels` → `?kind=PERSONEL|STUDENT` filtresi gelir, response’ta `kind` döner.
- `GET /api/me` → `companyKind/companyName/...` ve `personelKind` döner (UI’ın okul varyantını anlaması için).

### 3) Web
- Yeni route alias:
  - `/school`, `/school/map`, `/school/shifts`, `/school/georeview`, `/school/agreements`, `/school/hub`
  - Hepsi mevcut Company panellerini render eder.
- NavDock Company rolünde:
  - Company.kind=SCHOOL ise base path `/school` olur.
  - Menü etiketi “SCHOOL” görünür, “Okul Merkezi/Öğrenci Konum İncele” label’ları gelir.
- Company içindeki kritik navigate çağrıları base’e göre çalışır (Workflow + AgreementWizard).
- SUPER_ADMIN → Companies paneli:
  - “Şirket/Okul” filtre + oluşturma + edit.

---

## DoD
- SUPER_ADMIN “Okul” (kind=SCHOOL) oluşturabilir.
- COMPANY rolü okul companyId’ye bağlıysa, UI otomatik `/school` açar.
- `/api/company/personels?kind=STUDENT` döner.

## Notlar / Risk
- Okul kullanıcıları hâlâ `role=COMPANY` (yetki modeli değişmedi).
- Öğrenci alanları (sınıf/no vb) **bu adımda yok** (gerekirse M80.1+).
