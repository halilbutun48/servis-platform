# #17 Role-based simple navigation and task home

Bu belge #17’nin güncel sahiplik özetidir. Makine-okunur [UX kabul manifesti](ROLE_BASED_SIMPLE_NAVIGATION_AND_TASK_HOME_01.json) ve [#15 terminoloji handoff'u](ROLE_BASED_SIMPLE_NAVIGATION_AND_TASK_HOME_01_TERMINOLOGY_HANDOFF.json) ayrıntılı kanıttır; bu belge iş kuralı veya ikinci bir veri SSOT'u değildir.

## Güncel sahiplik

- Tek rol menüsü: `web/src/utils/roleNavigation.js` → `web/src/layout/NavDock.jsx`
- Ortak görev özeti: `web/src/components/RoleTaskHome.jsx`
- Operasyon Komuta Merkezi sunumu: `web/src/components/OperationsCommandCenter.jsx`
- Sefer Abi hızlı giriş: `web/src/components/copilot/FloatingCopilotDrawer.jsx`
- Hızlı/tam ekran ortak bağlam: `web/src/utils/copilotSharedState.js`
- Tam ekran aynı yardımcı deneyimi: `web/src/panels/shared/CopilotPanel.jsx`

Görev ana sayfası şu sırayı kullanır: özet → sorun/fırsat → tek ana aksiyon → ayrıntılar → gelişmiş. Komuta Merkezi yalnızca mevcut canonical bundle/observability sinyallerini sunar; finans, GPS, risk, rota veya optimizer hesabı yapmaz. Sinyal yoksa veri uydurmaz ve güvenli bir sonraki çalışma alanını gösterir.

## Roller ve bağlamlar

`SCHOOL` ve `ORGANIZATION` kullanıcı bağlamları backend Auth Role değildir. Her ikisi de `role=COMPANY` olarak doğrulanır ve `CompanyKind` ile ayrılır. Menüler bu ayrımı görünür rotalara yansıtır; API/RBAC tenant sınırı olmaya devam eder.

Desteklenen bağlamlar: `SUPER_ADMIN`, `COMPANY`, `ROOM`, `SCHOOL`, `ORGANIZATION`, `DRIVER`, `PERSONEL`, `PARENT`. Her bağlamın mevcut detay paneli görev özetinin ayrıntı disclosure alanında korunur; #17 bir yetenek silme veya yeni iş kuralı milestone'u değildir.

## Sefer Abi giriş modeli

Kullanıcıya görünen tek ana giriş, alt sağdaki kompakt `Sefer Abi’ye Sor` avatarıdır. Sol menüde ayrı bir yardımcı/terminal maddesi yoktur. Avatar hızlı konuşmayı açar; `Tam ekranda aç` aynı konuşma geçmişini, ekran/rol bağlamını, seçili kaydı ve görev devamlılığını `copilotSharedState.js` üzerinden taşır. Bu yapı #18 highlight, #20 optimizer ve #30+ proaktif davranış uygulamaz.

## Kanıt ve sınırlar

Gerçek rol görevleri ve görsel kanıt `backend/artifacts/browser-smoke/role-based-simple-navigation-and-task-home-01/` altında oluşur; bu çıktı commit dışıdır. #15 global terminoloji temizliği yalnızca handoff dosyasındaki bulgularla sonraki milestone'a bırakılmıştır. #36 fiziksel cihaz kabulü, #38 üretim sertleştirmesi ve #20 optimizer burada uygulanmış sayılmaz.
