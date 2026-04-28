# MILESTONE VE TICARI OMURGA HIZA REHBERI V2

Bu dosya, 2026-04-05 itibarıyla STARTPACK / PRIMER / MILESTONE_REGISTRY çizgisini aynı resmi gösterecek şekilde hizalamak için eklenmiştir.

## Neden gerekliydi?
Repo içindeki mevcut dokümanların bir bölümü hâlâ M79/M80 aktifmiş gibi konuşuyor. Oysa resmi doğrulanmış son baz:
- M61 geçti
- M67→M79 geçti
- M80 / M80.1 / M80.2 / M80.3 geçti
- M81 geçti
- aktif ana faz M82 oldu

## Güncel resmi yorum
- M81 kapanmış bazdır.
- M81-A..G olarak daha önce konuşulan işler, artık bağımsız yeni milestone değil; M82 alt fazlarına taşınmıştır.
- M82 içindeki ilk sekiz alt faz kalite borcunu kapatır.
- M82.9→M82.11 ise dormant ticari omurgayı kurar.

## Ticari omurga revizyonu
Eski düşünce: komisyon ve ödeme yalnız agreement merkezli olsun.
Yeni resmi düşünce:
- ticari kaynak `AGREEMENT` olabilir
- kısa iş/vardiya serisi için `SHIFT_SERIES` olabilir
- ödeme/komisyon yalnız hukuki sözleşme nesnesine kilitlenmez
- settlement omurgası ticari kaynak tipini bilir
- bu turda hedef canlı ödeme açmak değil, ödeme ve mutabakatı hazırlık modelinde tutmaktır
- birincil kanal FAST / EFT / Havale, ikincil kanal Sanal POS + 3D Secure olarak hazırlanır
- gerçek provider/webhook/payout aktivasyonu ayrı bir kapıdır

## Super Admin ticari yetkileri
- payment mode (`OFF | OPTIONAL | REQUIRED`)
- global komisyon oranı
- oda bazlı komisyon override
- audit log

## 10/10 kalite kapıları
1. Snapshot invalidation eksiksiz çalışır.
2. Preview cache invalidation backend+frontend birlikte çalışır.
3. Mobil koordinat doğruluk bug'ları kapanır.
4. Placeholder env URL'leri fail eder.
5. SSOT ve tooling tek resmi gösterir.
6. Cleanup gerçek uygulanır.
7. Büyük dosyalar modüler parçalanır.
8. Check hattı gerçeğe yaklaşır.
