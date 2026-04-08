# KANIT / PROOF / KONTROL OMURGASI V1

M78 ile açılan proof omurgası, kontrol sonucunun boş sözle değil kanıtla kapanmasını hedefler.

## Temel kanıt tipleri
- state / marker / contract izi
- check çıktısı
- log/export izi
- panel / manifest izi
- ekran görüntüsü
- cihaz / build bilgisi
- operatör notu
- kısa saha yorumu

## Ana ilke
- Screenshot ana kanıt değildir.
- Ana kanıt sırası: **state/marker -> check çıktısı -> log/export -> panel manifest izi -> ekran görüntüsü**
- Ekran görüntüsü yalnızca görsel destek, düzen/regresyon kanıtı veya rol görünürlüğü teyidi için kullanılır.
- Metin eşleme bağımlılığı olan ekran görüntüsü, tek başına güçlü kabul vermez.

## Minimum proof paketi
Bir kontrol kaydı mümkünse şu seti taşır:
1. ne test edildi
2. hangi rol / ekran üzerinde test edildi
3. hangi sonuç alındı
4. bunu destekleyen ana kanıt ne
5. destekleyici görsel kanıt var mı
6. tekrar kontrol gerekip gerekmediği

## Omurga ilkesi
- kanıt yoksa güçlü kabul yorumu yazılmaz
- kısa ama okunur kayıt tercih edilir
- kanıt türü ile sonuç türü karıştırılmaz
- ekran görüntüsü ile sistem gerçeği aynı şey değildir; sistem gerçeği mümkünse marker/check/log ile kapanır
