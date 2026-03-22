# STARTPACK V1

## Temel kurallar
1. Monorepo modüler yapıda ilerler: `backend / web / mobile / infra / docs / tools`.
2. Ürün kimliği **B2B servis pazaryeri + operasyon platformu**dur.
3. Driver login ana akışı `Sürücü Kodu + PIN` olarak korunur.
4. İlk girişte PIN değişimi zorunludur.
5. Ürün içi konum dili `sürücünün telefon GPS'i` olarak korunur.
6. Company default `maxWalkM = 250`, School default `maxWalkM = 50`.
7. Oluşturma için tek kaynak **Planlama Merkezi** olmalıdır.
8. **Vardiyalar** ekranı oluşturma değil, takip / operasyon ekranı olarak kalmalıdır.
9. Room seçip teklif göndermeden iş markete düşmemelidir.
10. Guided Mode kullanıcıyı gereksiz draft mantığıyla uğraştırmamalıdır.
11. Overlay standardı: **tek zip / tek kök klasör / nested root yok**.
12. Checklist'te `[x]` yalnızca pack/check green sonrası işaretlenir.

## Güncel dürüst durum
- `M59 -> M65` sertleştirme hattı green taban olarak vardır.
- Ama `M59 -> M66` için tam uçtan uca yeniden kontrol, smoke ve saha testi henüz kapanmamıştır.
- Repo şu an **post-M66 functional** durumdadır.
- Büyük repo cleanup / duplicate cleanup / dead code cleanup / performans sadeleştirmesi sonraki ana fazdır.

## Kanonik komutlar
- Tam master hat: `tools\pack.ps1 -To 66 -RepoDir D:\servis-platform -NoBuild`
- Reset + full hat: `tools\reset-and-pack.ps1 -To 66 -NoBuild`
- Repo audit: `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- M66 özel pack: `tools\pack_m66_operation_reassignment.ps1 -RepoRoot D:\servis-platform`

## Master pack
`tools\pack.ps1 -To 66` artık tek çatı girişidir.

Bu komut:
- `M104 / M105 / M106` statik repo check'lerini çalıştırır,
- `M0 -> M41` gate hattını koşturur,
- `M42 -> M66` pack zincirini sırayla koşturur,
- sonda repo audit raporu üretir.

## Repo audit kapsamı
- duplicate dosyalar
- benzer pack/check script grupları
- orphan / legacy adayları
- tiny / boş dosyalar
- archive/live shadow çiftleri
- temel performans kokuları (`useEffect`, `setInterval`, `addEventListener`, backend `.on(`)

## M66 kısa not
- ROOM operasyon yetkisiyle araç/sürücü reassignment yapar.
- COMPANY bunu ticari değil operasyonel olay olarak görür.
- Yeni sürücüye görev/rota paketi gider.
- Eski sürücü aktif görevden düşer.
- M66 fonksiyonel olarak eklidir; tam kapanış için smoke + saha doğrulaması gerekir.
