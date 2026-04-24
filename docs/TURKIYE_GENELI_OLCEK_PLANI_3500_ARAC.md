# Turkiye Geneli Olcek Plani - 3000 Stabil Tavan / 3500 Stress Referans Modeli

Bu belge bir milestone degil; ulke geneli yayilimda oda, firma ve panel planlamasi icin referans notudur.

## Kisa karar

- 3000 arac, stabil operasyon tavanidir; 3500 arac ise stress / ust sinir referansidir.
- Ulke geneline yayilirken araci il bazinda grupla, buyuk illeri ilce/zone ile alt parcaya bol.
- Oda sayisini arac sayisindan birebir cikarma; oda, canli operasyon birimidir.
- Firma sayisi da arac sayisina degil, tenant / isletici / regional organizasyon yapisina gore belirlenir.
- Panel sayisi kapasite birimi degil, aktif ekip ve gorunum birimidir.

## Repo gercegi

Prisma schema zaten su alanlari taniyor:
- `Company.regionId`, `Company.district`
- `Room.regionId`, `Room.district`

Bu yuzden ulke geneli dagilim icin il + ilce/zone modeli mevcut schema ile uyumludur.

## Mevcut test zemini

Bu dokumandaki load testler su tekil infra bazinda alindi:

- `solver` x 1
- `osrm` x 1
- `db` x 1
- `redis` x 1
- `api` x 1

Yani buradaki 3500 arac referansi, tek bir infra adasinin mevcut kaldirma gucu icindir.  
Ulke geneli planda bu sayi dogrudan "tek sunucuda 3500" diye okunmamalidir; shard / zone / tenant parcasi olarak okunmalidir.

## Load test referansi

Mevcut benchmark okumasina gore:
- 3000 arac: stabil operasyon tavanina yakin
- 3500 arac: geciyor, ama stress bandinda calisiyor
- 3600 arac: daha fazla drift goruluyor
- 3750 arac: timeout duvarina yaklasiyor / kaliyor

Bu nedenle:
- 3000 arac civari: stabil tavan
- 3000-3500 arac: stress band
- 3500 arac: ust sinir referansi / ceiling band

3500, tek bir hot shard icin "konforlu" degil; planlama tavanina yakin bir referans sayi olarak alinmali.

## Stabil seviye

Tekil infra, panelsiz ve staggered cadenceli current test formunda:
- **stabil bant:** 2000-3000 arac
- **stabil tavan:** 3000 arac
- **sari / stress bant:** 3000-3500 arac
- **ust sinir referansi:** 3500 arac

Bu ayrim, 500 bin arac planinda hangi shard'in saglikli calistigini ayirmak icin kullanilmalidir.

## Planlama birlikleri

### 1) Company
- Anlam: hukuki / operasyonel tenant
- Rol: kullanici, yetki, sozlesme, raporlama ve ticari omurga
- Kural: company sayisi arac sayisindan degil, isletici yapisindan cikmali

### 2) Room
- Anlam: canli operasyon / dispatch birimi
- Rol: vardiya, canli panel, atama, izleme
- Kural: room sayisi aktif arac yogunluguna gore bolunmeli

### 3) Panel
- Anlam: acik ekran / UI gorunumu
- Rol: canli operasyon okuma
- Kural: panel sayisi kapasiteye direkt esitlenmemeli; ayni room icin birden fazla panel acilabilir ama bu read load uretir

## 3500 arac icin referans boyut

Bu sayilar "ilk planlama bandi" olarak kullanilmali:

| Birim | Tavsiye bandi | 3500 arac icin referans |
|---|---:|---:|
| Room | 200-300 aktif arac / room | 12-18 room |
| Company | 500-700 aktif arac / company | 5-7 company |
| Aktif room paneli | 1 panel / room civari | 12-16 aktif room paneli |
| Company paneli | 1 panel / company civari | 3-6 aktif company paneli |

## Ilk sayi olarak ne alalim?

Eger bir tek baslangic resmi lazimsa:
- `6 company`
- `14 room`
- `12-16 aktif room paneli`
- `3-6 aktif company paneli`

Bu, 3500 araci tek bir yerde tutmak yerine operasyonu daha ince parcaya ayirir.

## Sehir bazli dagilim

- Istanbul, Ankara, Izmir gibi buyuk iller: ilce / zone bazli alt parcaya bol
- Bursa, Antalya, Kocaeli, Adana, Konya gibi agir iller: en az 2-4 operasyon parcasi dusun
- kucuk iller: tek room + tek company yeterli olabilir

## Kural seti

1. Tek bir company icinde cok room olabilir.
2. Tek bir room icinde cok vehicle olabilir.
3. Panel sayisi, araç sayisina degil, ayni anda acik operasyon alanlarina baglidir.
4. Bir room 250 aracin ustune cikmaya basliyorsa yeni zone ac.
5. Bir company 600-700 aracin ustune cikiyorsa yeni tenant / regional bolge dusun.

## 500k hedefi icin not

500 bin arac icin 3000'i "tek region cell stabil tavani", 3500'i ise "stress referansi" olarak okumak dogru olur; bunlar shard / operasyon adasi icin referans kabul edilmeli.

Ulke geneli planlama:
- ust katman: 81 il
- buyuk iller: ilce / zone alt shard
- teknik katman: api yatay, redis cluster, db shard / partition, OSRM ve solver region bazli

## Bu belgenin amaci ne degil?

- yeni feature acmak degil
- mevcut production yapisini bozmak degil
- tek bir kesin company/room sayisi dayatmak degil

Bu belge sadece "ulke geneline yayilirken oda, firma ve panel sayisini nasil planlariz?" sorusuna bir referans bandi verir.
