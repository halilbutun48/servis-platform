# SEFERPAKT / PERSONEL SERVIS V1
# 10/10 KABUL KRİTERLERİ

Tarih: 2026-04-08  
Durum: `M0->M89 green` bazından `M90 canonical closure` ile 10/10 kapanış hedefi

Bu doküman, projeye 10/10 denebilmesi için gerekli kalite kapılarını tanımlar.

> Temel ilke: Bu projeye 10/10 demek için yalnızca çalışması yetmez; doğru, temiz, izlenebilir, modüler, sürdürülebilir ve ticari olarak genişlemeye hazır olması gerekir.

## 1. Backend doğruluğu
- route snapshot değişen her write işleminde güncellenmelidir
- kritik çok adımlı yazma işlemleri transaction içinde olmalıdır
- sessiz veri bozulması üreten akış kalmamalıdır
- hata kontratı tek formatta çalışmalıdır

## 2. Web / UI tutarlılığı
- cache ve invalidate mantığı net olmalıdır
- modal, liste, harita ve detay ekranı aynı gerçeğe bakmalıdır
- ortak API hata modeli tek şekilde ele alınmalıdır
- kritik büyük panel dosyaları kontrollü bölünmelidir

## 3. Mobil saha güveni
- sürücünün telefon GPS'i görünür ve anlaşılır olmalıdır
- background GPS davranışı öngörülebilir olmalıdır
- offline / retry / queue görünürlüğü bulunmalıdır
- yanlış env / yanlış build ile saha paketi çıkmamalıdır

## 4. Konum kaynağı kalitesi
- araç GPS'i ile sürücünün telefon GPS'i karışmamalıdır
- arbitration kuralları deterministik olmalıdır
- kaynak çakışması görünür hale getirilmelidir

## 5. Ticari omurga
- ticari kaynak `AGREEMENT` ve `SHIFT_SERIES` kapsamalıdır
- payment mode `OFF / OPTIONAL / REQUIRED` temiz çalışmalıdır
- payment/commission snapshot kuralı korunmalıdır
- settlement ve reconciliation yüzeyleri denetlenebilir olmalıdır

## 6. Repo hijyeni
- kanonik markdown seti aynı resmi göstermelidir
- makine-okur state ile markdown anlatımı çelişmemelidir
- `.bak`, yanlış build kalıntıları ve gereksiz backup görünürlüğü kapanmalıdır
- syntax/lint hattı kırık bırakılmamalıdır

## 7. Verification dürüstlüğü
- `pack.ps1 -To 89` gerçekten M89'a kadar koşmalıdır
- `pack_living`, `verify_living_static`, `verify_living_runtime` anlatımı dürüst olmalıdır
- living/historical ayrımı açık olmalıdır
- script/check sistemi eski metne değil güncel canonical duruma göre yaşamalıdır

## 8. Proof kalitesi
- screenshot ana kanıt olmamalıdır
- state/check/log/export öncelikli kanıt modeline geçilmiş olmalıdır
- kabul kararları kanıt türüyle açıkça bağlanmalıdır

## 9. Tek rehber kuralı
- `SCRIPT_KILAVUZU_MILESTONE_HARITASI.md` tek resmi rehber olmalıdır
- eski V1/V2/V3 dosyaları yönlendirme seviyesine düşmelidir

## 10. 10/10 kapanış kararı
10/10 için aşağıdakiler birlikte sağlanmalıdır:
- ürün omurgası doğru
- ticari omurga sürdürülebilir
- repo kanonik ve temiz
- proof/verify sistemi dürüst
- dokümantasyon tek gerçekliği anlatıyor
- `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform` geçer durumda olmalıdır
