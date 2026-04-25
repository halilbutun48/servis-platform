# RUNBOOK — M84 SAHA GOZLEM / GERI BILDIRIM DONGUSU

Bu runbook, `M83 saha hazirlik paketi` sonrasinda saha gununde cikan sorunlari daginik notlardan cikarip tek bir durum dongusunde izlemek icin acilan **M84 saha gozlem / geri bildirim dongusu** kapsam sinirini tanimlar.

## Amac
- saha gununde gorulen sorunlari tek yerde toplamak
- role gore hangi kaydin kimden geldigini gorunur yapmak
- durum akisina gore kaydi ilerletmek: goruldu -> tekrarlandi -> cozuldu -> kapandi
- Super Admin'in sahayi sadece anlik degil, geri bildirim iziyle de yonetmesini saglamak

## Kapsam
- `Sahaya Cikis Kontrolu` panelinde M84 geri bildirim bolumu
- `NavDock` icinde `Gelişmiş` altinda `Geri Bildirim` alt menusu; `Copilot` en altta ayridir
- ortak `#/shared/feedback` sayfasi
- backend runtime store ile saha geri bildirim kayitlari
- ozet paket endpoint'i
- yeni kayit acma ve durum guncelleme endpoint'leri
- backend check + tools pack hatti

## Bu milestone neyi yapmaz
- saha sorununu otomatik cozmeye calismaz
- mobil veya web tarafinda local notu resmi kayit kabul etmez
- JIRA/harici ticket sistemi baglantisi acmaz
- M85 odeme pilotunu burada acmaz

## Kanonik komutlar
- `tools\pack_m84_field_feedback_loop.ps1 -RepoRoot D:\servis-platform`
- `cd backend && npm run m84check`

## Beklenen sonuc
- Super Admin son saha ekraninda acik/tekrarlayan/cozulen/kapanan kayitlari tek yerde gorur
- role ve yuzeye gore geri bildirim yogunlugu okunur
- yeni kayit acilir, yildiz degeri eklenir ve ayni yuzeyden durum ilerletilebilir

## Kabul notu
- M84 green olsa bile saha gozlem turu insan tarafindan kosulur
- yine de geri bildirim akisi artik daginik degil sistemli kayda donusur
- sonraki dogru blok kullanici kararina gore saha turu veya M85 olabilir
