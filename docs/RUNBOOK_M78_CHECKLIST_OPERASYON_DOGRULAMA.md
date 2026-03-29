# RUNBOOK — M78 CHECKLIST + OPERASYON DOGRULAMA

Tarih: 2026-03-28
Timezone: Europe/Istanbul
Durum: **aktif / iskelet green**

Bu runbook, M78 ile açılan checklist / operasyon doğrulama katmanının ilk ve en küçük doğru iskeletini tanımlar.

## 1) M78 amaç cümlesi
M78 ile sistem şu soruya tek yerden cevap vermeye hazırlanır:

**"Bir iş, rol bazında hangi kontrol listesiyle incelendi; kanıtı ne; sonucu kabul mü, red mi, eksik mi, tekrar kontrol mü?"**

## 2) İlk tur kapsam
M78 ilk turda şunları açar:
- saha kabul checklistleri
- rol bazlı operasyon doğrulama yüzeyi
- kanıt / proof / kontrol omurgası
- kabul / red / eksik / tekrar kontrol akışı
- runbook / milestone / manifest / living bağları

## 3) Kapsam sınırı
Bu tur bilinçli olarak küçüktür.
- DB şema genişletmesi açmaz
- web/backend route zorlamaz
- M79+ uygulama detaylarını açmaz
- compatibility alias ve fallback check mantığını bozmaz

## 4) İlk teslim seti
Bu ilk teslim şu omurgayı koyar:
1. `tools\pack_m78_checklist_operasyon_dogrulama.ps1`
2. `tools\check_m78_checklist_operasyon_dogrulama_repo_contract.ps1`
3. `backend\scripts\m78_checklist_operasyon_dogrulama_check.js`
4. saha kabul / rol / proof / karar akışı belgeleri
5. manifest ve living static bağları

## 5) Kontrol kararı dili
M78 için resmi karar alanları şunlardır:
- **KABUL**
- **RED**
- **EKSİK**
- **TEKRAR KONTROL**

Bu alanlar sonraki fazlarda UI ve veri akışına taşınacaktır.

## 6) Kanıt ilkeleri
İlk turda kanıt / proof / kontrol omurgası için temel kanıt sınıfları:
- ekran görüntüsü
- log/export izi
- cihaz / build bilgisi
- operatör notu
- kısa saha yorumu

## 7) Kanonik komut
`tools\pack_m78_checklist_operasyon_dogrulama.ps1 -RepoRoot D:\servis-platform`

Bu komut şu iki parçayı doğrular:
- repo-contract: `tools\check_m78_checklist_operasyon_dogrulama_repo_contract.ps1`
- runtime/check: `backend\scripts\m78_checklist_operasyon_dogrulama_check.js`

## 8) Green yorumu
M78 green sayılabilmesi için:
- pack geçmeli
- repo-contract geçmeli
- manifest M78 kaydı görünmeli
- living static bağında M78 yer almalı
- user-facing SSOT yüzeyleri `M0 -> M78` durumuna güncellenmiş olmalı

## 9) Sonraki doğru adım
Bu iskelet green olduktan sonra sıradaki doğru iş:
- M79 ile rol bazlı operasyon doğrulama yüzeyini ürün içine taşımak
- M80 ile kanıt / proof kayıt ve rapor özetini derinleştirmek
- M81 ile kabul kararlarının daha katı kural setine bağlanmasını değerlendirmek
