# STARTPACK V1

<!-- STARTPACK_TOOLS_HYGIENE_V1 -->
<!-- STARTPACK_PARENT_TTL_PRESETS_V1 -->
<!-- STARTPACK_PUBLIC_LINK_TTL_PRESETS_V1 -->

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
- M77 artık salt iskelet değil; M77.1 content-foundation ile rol ile business domain ayrımı, KVKK görünürlük matrisi, aydınlatma envanteri, retention / silme / anonimleştirme yaklaşımı ve audit izi tek omurgada yazılı hale geldi. M77.2, M77.3 ve M77.4 ile payload-enforcement + redaction-foundation açıldı; M77.5 ile retention/export trail enforcement helper katmanı da bağlandı.
- M78 checklist / operasyon doğrulama iskeleti açıldı; saha kabul checklistleri, rol bazlı operasyon doğrulama, kanıt / proof / kontrol omurgası ve kabul / red / eksik / tekrar kontrol akışı ilk living seviyesinde tanımlandı.
- M78.1 ile bu omurga minimum super admin ürün yüzeyine taşındı; ana living rota yine `78` olarak korunur.
- M78.2 ile aynı yüzey ilk yazılabilir kayıt katmanına geçer; durum + kanıt tipi + kısa not + referans metni kaydı açılır ama living rota yine `78` kalır.
- M78.3 ile aynı ekran özet + filtre katmanına geçer; son güncelleyen / son güncelleme, filtreler ve export görünürlüğü açılır ama living rota yine `78` kalır.
- Auth role seti: `SUPER_ADMIN / ROOM / COMPANY / DRIVER / PERSONEL / PARENT`.
- School/Organization domain tarafı ayrı login role değil, `Company.kind` üstünden taşınan iş alanıdır.
- Ancak driver/parent dışındaki roller için zorunlu consent enforcement'ı hâlâ sonraki alt adımdır.
- Tools tarafında yeni hedef, faz girişlerini klasör altında toplamak; ama mevcut root pack/check adlarını bir anda kırmamaktır.

## Kanonik komutlar
- Operasyonel master doğrulama: `tools\pack.ps1 -To 78 -RepoDir D:\servis-platform -NoBuild`
- Yaşayan tek giriş: `tools\pack_living.ps1 -To 78 -RepoRoot D:\servis-platform -NoBuild`
- Yaşayan static doğrulama: `tools\verify_living_static.ps1 -RepoRoot D:\servis-platform`
- Yaşayan runtime doğrulama: `tools\verify_living_runtime.ps1 -To 78 -RepoRoot D:\servis-platform -NoBuild`
- Repo audit: `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- Docs/SSOT sync pack: `tools\pack_docs_ssot.ps1 -RepoRoot D:\servis-platform`
- M77 payload-enforcement pack: `tools\pack_m77_kvkk_uyum_katmani.ps1 -RepoRoot D:\servis-platform`
- M78 checklist/operasyon doğrulama pack: `tools\pack_m78_checklist_operasyon_dogrulama.ps1 -RepoRoot D:\servis-platform`
- M78.1 operasyon doğrulama yüzeyi pack: `tools\pack_m78_1_operasyon_dogrulama_yuzeyi.ps1 -RepoRoot D:\servis-platform`
- M78.2 operasyon doğrulama kayıt katmanı pack: `tools\pack_m78_2_operasyon_dogrulama_kayit_katmani.ps1 -RepoRoot D:\servis-platform`
- M78.3 operasyon doğrulama özet ve filtre katmanı pack: `tools\pack_m78_3_operasyon_dogrulama_ozet_filtre_katmani.ps1 -RepoRoot D:\servis-platform`

## Master pack
`tools\pack.ps1 -To 78` güncel operasyonel ana çatıdır.

Tarihsel not: Teknik yaşayan taban kavramı hâlâ `M75 green baseline` diye anılır.

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

## M78 hızlı referans
- saha kabul checklistleri: `docs\SAHA_KABUL_CHECKLISTLERI_V1.md`
- rol bazlı operasyon doğrulama: `docs\ROL_BAZLI_OPERASYON_DOGRULAMA_V1.md`
- kanıt / proof / kontrol omurgası: `docs\KANIT_PROOF_KONTROL_OMURGASI_V1.md`
- karar akışı: `docs\KABUL_RED_EKSIK_TEKRAR_KONTROL_AKISI_V1.md`

## M77 hızlı referans
- görünürlük matrisi: `docs\KVKK_VERI_GORUNURLUK_MATRISI_V1.md`
- aydınlatma envanteri: `docs\KVKK_AYDINLATMA_ENVANTERI_V1.md`
- retention / silme / anonimleştirme: `docs\KVKK_RETENTION_ANONIMLESTIRME_V1.md`
- audit ve erişim izi: `docs\KVKK_AUDIT_ERISIM_IZI_V1.md`

- M77.3 / M77.5 ana belgeleri: `docs\KVKK_ENFORCEMENT_YUZEYI_V1.md`, `docs\KVKK_REDACTION_ENFORCEMENT_V1.md`, `docs\KVKK_ROLE_PAYLOAD_DARALTMA_V1.md`, `docs\KVKK_RETENTION_ENFORCEMENT_V1.md`, `docs\KVKK_EXPORT_ERISIM_IZI_V1.md`
