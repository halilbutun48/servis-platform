# STARTPACK V1

## Temel kurallar
1. Monorepo modüler yapıda ilerler: `backend / web / mobile / infra / docs / tools`.
2. Ürün kimliği **Vardis** markası altında çalışan karma taşıma platformudur; sadece personel ürünü diye daraltılmaz.
3. Ticari akış ile operasyon akışı aynı ürün içinde ama ayrı katmanlar olarak korunur.
4. Driver login ana akışı `Sürücü Kodu + PIN` olarak korunur.
5. İlk girişte PIN değişimi zorunludur.
6. Ürün içi konum dili `sürücünün telefon GPS'i` olarak korunur.
7. Company default `maxWalkM = 250`, School default `maxWalkM = 50`.
8. Oluşturma için tek kaynak **Planlama Merkezi** olmalıdır.
9. **Vardiyalar** ekranı oluşturma değil, takip / operasyon ekranı olarak kalmalıdır.
10. Room seçip teklif göndermeden iş markete düşmemelidir.
11. Guided Mode kullanıcıyı gereksiz draft mantığıyla uğraştırmamalıdır.
12. Overlay standardı: **tek zip / tek kök klasör / nested root yok**.
13. Checklist'te `[x]` yalnızca pack/check green sonrası işaretlenir.
14. Önce ölç, sonra düzelt, sonra tekrar ölç.

## Güncel dürüst durum
- Teknik yaşayan taban **M75 green baseline** olarak kabul edilir.
- M76A-1 + M76B + M76A-2 normalizasyon/konsolidasyon hattı kanonik durumda görünür.
- M77 şu an iskelet-open durumundadır; aydınlatma metinleri, veri görünürlük matrisi, retention / silme / anonimleştirme yaklaşımı ve audit izi bu faz altında ilerleyecektir.
- Ancak tam güven için living static + living runtime yeniden koşum gerekir.
- Tools tarafında yeni hedef, faz girişlerini klasör altında toplamak; ama mevcut root pack/check adlarını bir anda kırmamaktır.

## Kanonik komutlar
- Yaşayan master hat: `tools\pack.ps1 -To 75 -RepoDir D:\servis-platform -NoBuild`
- Yaşayan tek giriş: `tools\pack_living.ps1 -To 75 -RepoRoot D:\servis-platform -NoBuild`
- Yaşayan static doğrulama: `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- Yaşayan runtime doğrulama: `tools\verify_living_runtime.ps1 -To 75 -RepoRoot D:\servis-platform -NoBuild`
- Repo audit: `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- M77 iskelet pack: `tools\pack_m77_kvkk_uyum_katmani.ps1 -RepoRoot D:\servis-platform`

## Master pack
`tools\pack.ps1 -To 75` yaşayan ana çatıdır.

Bu komut:
- `M104 / M105 / M106` statik repo check'lerini çalıştırır,
- `M0 -> M41` gate hattını koşturur,
- `M42 -> M58` pack zincirini koşturur,
- `M59 -> M66` pack zincirini koşturur,
- `M67 -> M75` pack zincirini koşturur,
- sonda repo audit raporu üretir.

## TTL kısa not
- Parent invite presetleri: **1 hafta / 1 ay / 6 ay / 1 yıl**
- Personel/öğrenci public canlı link presetleri: **1 hafta / 1 ay / 6 ay / 1 yıl**
- Parent invite backend üst sınırı: **365 gün**
- Personel/öğrenci public canlı link backend üst sınırı: **365 gün**

## Tools düzeni kısa not
- Dışarıdaki kanonik girişler: `pack.ps1`, `pack_living.ps1`, `verify_living_static.ps1`, `verify_living_runtime.ps1`, `gate.ps1`
- Faz wrapper'ları: `tools\packs\living\`
- Yardımcı living check girişleri: `tools\checks\living\`
- Legacy root pack/check dosyaları uyumluluk için korunur.

## M58 -> M75 kısa marker
- M58 tarihsel pilot readiness kapısıdır.
- M59 -> M65 geçmiş green-base hattıdır.
- M66 fonksiyonel-open / yeniden doğrulama bekleyen adımdır.
- M67 -> M75 kurumsal ölçek ve hot-path sertleştirme hattıdır.
- repo/tools hijyen check: `tools\check_tools_hygiene_m105.ps1 -RepoRoot D:\servis-platform`

M63 guven + kalite + hizmet degerlendirme rotasi aktif. Komut: .\tools\pack_m63_trust_quality_service_evaluation.ps1 -RepoRoot .

- M63 - guven + kalite + hizmet degerlendirme - aktif
- Komut: .\tools\pack_m63_trust_quality_service_evaluation.ps1 -RepoRoot .

M64 dogal copilot katmani rotasi aktif. Komut: .\tools\pack_m64_natural_copilot_layer.ps1 -RepoRoot .


- M76A-2 final normalization ve archiving
- Komut: .\tools\pack_m76a_2_final_normalization_archiving.ps1 -RepoRoot .

- M77 kapsami: aydinlatma metinleri, veri görünürlük matrisi, retention / silme / anonimleştirme yaklaşımı, audit ve erişim izi uyumu.
- Komut: .\tools\pack_m77_kvkk_uyum_katmani.ps1 -RepoRoot .
