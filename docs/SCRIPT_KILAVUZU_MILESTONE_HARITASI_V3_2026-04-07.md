# SCRIPT KILAVUZU — MILESTONE HARITASI V3

Tarih: 2026-04-07  
Repo baz: `servis-platform`  
Amaç: Bu sürüm, eski V2 kılavuzunu en son çalışma hattına göre günceller; özellikle `M82+` bandını, doğrulama disiplini ve dürüst kanıt ayrımıyla yeniden yazar.

---

## 1) Bu sürüm neden gerekliydi?

V2 dosyası artık güncel baz için eksik kalıyordu:
- kapsamı “gelecekteki M86’ya kadar” diye bitiyordu
- `M85` ve `M86` hâlâ plan diliyle anlatılıyordu
- `M82+` sonrası kapanan saha / payment / settlement hattı bu dosyada yoktu

Bu yüzden V3’te iki şey yapıldı:
1. `M82+` hattı güncellendi
2. kanıt modeli daha dürüst hale getirildi

---

## 2) Kanıt seviyesi sözlüğü

- **[TEYİTLİ-REPO]** → Bu repo snapshot’ında ilgili check / runbook / pack / route / dosya izi gerçekten var.
- **[TEYİTLİ-SOHBET]** → Bu çalışma hattında overlay üretildi, uygulandığı kullanıcı tarafından söylendi, ama bu son repo snapshot’ında doğrudan ilgili artefakt izi bulunmuyor.
- **[TEYİTLİ-PRIMER]** → Kullanıcının primeri veya çalışma özeti milestone durumunu açıkça doğruluyor.
- **[YENİDEN KURGULANMIŞ]** → Legacy check, isim ve mimari üzerinden dürüstçe yeniden anlatılmış açıklama.
- **[PLAN]** → Henüz resmi future iş.

---

## 3) Resmi mevcut baz — bu snapshot için güvenli okuma

### Repo içinde doğrudan teyitli baz
- `M61 → M81` hattı daha önceki resmi baz olarak kabul ediliyor.
- `M82.1` backend correctness check izi var.
- `M82.2` web contract/cache check izi var.
- `M82.8` verification 2.0 izi var.
- `M82.9` dormant payment backbone check izi var.
- `M82.10` super admin commercial settings check izi var.
- `M82.11` payment readonly surface check izi var.
- `M83` field prep packet check + runbook + pack izi var.
- `M84` field feedback loop check + runbook + pack izi var.
- `M85` optional payment pilot check + runbook + pack izi var.
- `M86` required payment rollout check + runbook + pack izi var.
- `M87` payment account readiness check + runbook + pack izi var.

### Bu snapshot’ta doğrudan bulamadığım ama sohbet hattında işlendiği söylenenler
- `M88` settlement operations console
- `M89` settlement reconciliation desk

Bu yüzden bu dosyada:
- `M87` = **repo-teyitli üst sınır**
- `M88–M89` = **sohbet-teyitli ama bu zip içinde repo-teyitsiz**

Bu ayrım bilerek korunuyor.

---

## 4) M82+ güncel hat — kısa ama resmi okuma

## M82 — Saha öncesi çekirdek sertleştirme bandı  
**Kanıt seviyesi:** [TEYİTLİ-REPO] + [TEYİTLİ-PRIMER]

### M82.1 — Backend correctness kilidi
- preview stale noktalarını kapatır
- merkezi error contract ve acceptance guard kurar
- write path sonrası rebuild/snapshot hattını sıkılaştırır
- transaction ve invalidation doğruluğunu artırır

**Repo izi:**
- `backend/scripts/m82_1_correctness_guard_check.js`
- `backend/scripts/m82_1_acceptance_contract_check.js`
- `tools/pack_m82_1_backend_correctness.ps1`
- `docs/RUNBOOK_M82_1_BACKEND_CORRECTNESS.md`

### M82.2 — Web UI + API kontrat sertleştirme
- web error/contract/cache davranışını düzeltir
- büyük UI dosyalarının ikinci kademe cleanup’ına zemin oluşturur

**Repo izi:**
- `backend/scripts/m82_2_web_contract_cache_check.js`

### M82.3 — Mobil gerçek kullanım tamamlama
**Kanıt seviyesi:** [TEYİTLİ-PRIMER] + [TEYİTLİ-SOHBET]
- selected shift, gerçek rota akışı, bugün/rota/canlı ayrımı
- manuel operasyon kablosu
- mobilin dashboard değil gerçek görev uygulaması gibi davranması

### M82.4 — Background GPS / offline davranış sertleştirme
**Kanıt seviyesi:** [TEYİTLİ-REPO] + [TEYİTLİ-SOHBET]
- retry/backoff
- offline toparlama
- gereksiz network yükünü azaltma

**Repo izi:**
- `mobile/scripts/m82_4_bg_offline_hardening_check.js`

### M82.5 — Canlı konum kaynak önceliği
**Kanıt seviyesi:** [TEYİTLİ-REPO] + [TEYİTLİ-SOHBET]
- backend araç GPS’i resmi kaynak
- sürücünün telefon GPS’i fallback/önizleme
- kaynak görünürlüğü

**Repo izi:**
- `mobile/scripts/m82_5_live_location_source_priority_check.js`

### M82.6 — Release / env / acceptance sertleştirme
**Kanıt seviyesi:** [TEYİTLİ-REPO] + [TEYİTLİ-SOHBET]
- placeholder env reddi
- release guard
- acceptance zinciri

**Repo izi:**
- `mobile/scripts/m82_6_release_env_acceptance_check.js`

### M82.7 — Repo hygiene + cleanup
**Kanıt seviyesi:** [TEYİTLİ-REPO] + [TEYİTLİ-SOHBET]
- transient dosya ve paket kalıntılarını temizleme
- repo hijyeni

**Repo izi:**
- `mobile/scripts/m82_7_repo_hygiene_cleanup_check.js`

### M82.8 — Verification 2.0
**Kanıt seviyesi:** [TEYİTLİ-REPO]
- M82 bandını resmi verification hattına bağlar
- static/runtime check dilini gerçeğe yaklaştırır

**Repo izi:**
- `mobile/scripts/m82_8_verification_2_0_check.js`
- `tools/pack_m82_8_verification_2_0.ps1`
- `docs/RUNBOOK_M82_8_VERIFICATION_2_0.md`

### M82.9 — Dormant payment backbone
**Kanıt seviyesi:** [TEYİTLİ-REPO]
- payment mode omurgası: `OFF | OPTIONAL | REQUIRED`
- commercial source: `AGREEMENT | SHIFT_SERIES`
- dormant settlement/commission/account domain’i

**Repo izi:**
- `backend/scripts/m82_9_dormant_payment_backbone_check.js`
- `tools/pack_m82_9_dormant_payment_backbone.ps1`
- `docs/RUNBOOK_M82_9_DORMANT_PAYMENT_BACKBONE.md`

### M82.10 — Super Admin ticari ayarlar
**Kanıt seviyesi:** [TEYİTLİ-REPO]
- global payment mode
- global komisyon bps
- oda bazlı override

**Repo izi:**
- `backend/scripts/m82_10_super_admin_commercial_settings_check.js`
- `tools/pack_m82_10_super_admin_commercial_settings.ps1`
- `docs/RUNBOOK_M82_10_SUPER_ADMIN_COMMERCIAL_SETTINGS.md`

### M82.11 — Payment readonly ticari yüzey
**Kanıt seviyesi:** [TEYİTLİ-REPO]
- agreement ve vardiya yüzeylerinde payment/komisyon snapshot görünürlüğü
- settlement readiness özeti

**Repo izi:**
- `backend/scripts/m82_11_payment_readonly_surface_check.js`
- `tools/pack_m82_11_payment_readonly_surface.ps1`
- `docs/RUNBOOK_M82_11_PAYMENT_READONLY_SURFACE.md`

---

## M83 — Saha hazırlık paketi  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ne yapar?
- release / canlı ortam kontrol özeti
- rol ve cihaz checklist’i
- saha senaryoları
- operatör uygulama sırası

**Repo izi:**
- `backend/scripts/m83_field_prep_packet_check.js`
- `tools/pack_m83_field_prep_packet.ps1`
- `docs/RUNBOOK_M83_FIELD_PREP_PACKET.md`

---

## M84 — Saha gözlem / geri bildirim döngüsü  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ne yapar?
- saha geri bildirim kayıt store’u
- durum döngüsü: görüldü / tekrarlandı / çözüldü / kapandı
- super admin yüzeyinde geri bildirim özeti

**Repo izi:**
- `backend/scripts/m84_field_feedback_loop_check.js`
- `tools/pack_m84_field_feedback_loop.ps1`
- `docs/RUNBOOK_M84_FIELD_FEEDBACK_LOOP.md`

---

## M85 — Ödeme opsiyonel pilot  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ne yapar?
- `OPTIONAL` ticari kaynakları pilot adaya dönüştürür
- `READY / DORMANT` pilot hazırlık akışı açar
- gerçek tahsilatı değil, kontrollü pilot hazırlığını yönetir

**Repo izi:**
- `backend/scripts/m85_optional_payment_pilot_check.js`
- `tools/pack_m85_optional_payment_pilot.ps1`
- `docs/RUNBOOK_M85_OPTIONAL_PAYMENT_PILOT.md`

---

## M86 — Ödeme zorunlu rollout  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ne yapar?
- `REQUIRED` kapsamındaki ticari kaynakları rollout adayına çevirir
- `ACTIVE / DISABLED` rollout durumu açar
- settlement plan/entry tarafında zorunlu rollout lifecycle görünürlüğü sağlar

**Repo izi:**
- `backend/scripts/m86_required_payment_rollout_check.js`
- `tools/pack_m86_required_payment_rollout.ps1`
- `docs/RUNBOOK_M86_REQUIRED_PAYMENT_ROLLOUT.md`

---

## M87 — Ödeme hesabı hazırlığı  
**Kanıt seviyesi:** [TEYİTLİ-REPO]

### Ne yapar?
- şirket/oda payment account readiness yüzeyi açar
- masked IBAN / ref / provider / status metadata yönetimi sağlar
- finans operasyonu için hesap hazırlığını görünür kılar

**Repo izi:**
- `backend/scripts/m87_payment_account_readiness_check.js`
- `tools/pack_m87_payment_account_readiness.ps1`
- `docs/RUNBOOK_M87_PAYMENT_ACCOUNT_READINESS.md`

---

## M88 — Settlement operasyon masası  
**Kanıt seviyesi:** [TEYİTLİ-SOHBET]

### Ne yapması beklenir?
- settlement queue görünürlüğü
- entry bazlı `PLANNED / READY / EXECUTED / CANCELLED` aksiyonları
- finance-ready bloklarının görünürlüğü

### Bu snapshot notu
Bu zip içinde `m88` için özel check/runbook/pack izi bulamadım. Bu yüzden milestone işlenmiş olsa da bu snapshot’ta repo-teyitli demiyorum.

---

## M89 — Settlement mutabakat masası  
**Kanıt seviyesi:** [TEYİTLİ-SOHBET]

### Ne yapması beklenir?
- reconciliation queue
- expected vs received amount
- delta, provider ref, uyumsuzluk ve inceleme akışı

### Bu snapshot notu
Bu zip içinde `m89` için özel check/runbook/pack izi bulamadım. Bu yüzden milestone işlenmiş olsa da bu snapshot’ta repo-teyitli demiyorum.

---

## 5) Bu repo için doğru verification disiplini

Her seferinde `m0`dan `m89`a kadar **tek tek bütün scriptleri** koşmak günlük geliştirme için ağırdır. Ama uzun zamandır tam doğrulama yapılmadıysa, en azından katmanlı bir doğrulama gerekir.

### A) Ana omurga doğrulaması
Önce resmi pack hattı:
- `tools/pack.ps1 -To 87`

Bu, mevcut snapshot’ta repo-teyitli üst sınır için en doğru ana kapıdır.

### B) Yaşayan doğrulama
Ardından living static/runtime:
- `tools/verify_living_static.ps1`
- `tools/verify_living_runtime.ps1`

### C) Delta check zinciri
Özellikle şu bandın ayrıca okunması doğru olur:
- `m82_9`
- `m82_10`
- `m82_11`
- `m83`
- `m84`
- `m85`
- `m86`
- `m87`

### D) M88–M89 için dürüst kural
Eğer gerçekten `M88` ve `M89` repo içinde resmi baz olacaksa, önce bu snapshot’a:
- check script
- runbook
- pack
- tools/readme/primer hizası
getirilmelidir.

Bunlar gelmeden “M89 resmi repo doğrulandı” demek erken olur.

---

## 6) Şu an önerilen resmi sıra

1. bu V3 dokümanını baz al
2. `tools/pack.ps1 -To 87` koş
3. `verify_living_static/runtime` koş
4. çıkan kırıkları kapat
5. sonra M88–M89 artefaktlarını repo-teyitli hale getir
6. ardından milestone haritasını bir kez daha V3.1 seviyesinde sabitle

---

## 7) Kısa sonuç

- Evet, eski V2 dosya güncellenmeliydi.
- Evet, uzun süredir tam doğrulama koşulmadığı için check/pack hattını yeniden çalıştırmamız gerekir.
- Ama bunu “her scripti körlemesine tek tek” değil, **katmanlı ve dürüst repo üst sınırıyla** yapmamız gerekir.
- Bu snapshot için güvenli repo-teyitli üst sınır **M87** görünüyor.
- `M88–M89` konuşma hattında var, ama bu zip içinde onları resmi repo-check seviyesinde doğrulayan izleri şu an görmüyorum.
