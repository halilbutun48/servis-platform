# UX-SUPERADMIN-PANEL-CLARITY-01

## Problem
Super Admin ekranlarında kullanıcıya görünen debug, token, null, raw ve benzeri teknik kalıntılar ekranı yoruyor. Bazı yüzeyler de gereğinden yoğun göründüğü için ilk bakışta neyin önemli olduğu anlaşılmıyor.

## Goal
Super Admin panellerini summary-first, daha premium ve daha okunur hale getirmek.

Ana hedefler:
- Overview ekranında kritik durum, geri bildirim ve sistem özeti üstte kısa görünür.
- Canlı izleme ekranında risk ve canlı sağlık özeti üstte durur.
- Onboarding review ekranı insan onaylı kuyruk olarak anlaşılır kalır.
- Commercial core yoğun görünse bile kritik bilgiler üstte, detaylar kontrollü alanlarda kalır.

## Analysis format
Öncelikli ekranlar mümkün olduğunca şu kalıbı korur:

1. Durum
2. Ne anlama geliyor?
3. Etki / risk
4. Sıradaki doğru işlem
5. Güvenli sınır

## Technical detail standard
Teknik kanıt, debug notu, raw dump veya uzun log içeriği ana kartta görünmez.
Gerekirse yalnız kapalı detay alanında, accordion / tab / drawer içinde gösterilir.

## Words to suppress or downplay
Kullanıcı-facing ana metinde şu ifadeler görünmemelidir:
- `undefined`
- `null`
- `NaN`
- `[object Object]`
- `payload`
- `raw`
- `token`
- `hash`
- `stack`
- `debug`
- `internal`

## Out of scope
Bu milestone aşağıdakileri açmaz veya değiştirmez:
- payment execute
- billing execute
- settlement execute
- contract execute / sign
- invite send
- user create
- supplier verification auto
- route apply
- schema / migration

## Notes
- Amaç yeni ürün akışı açmak değildir.
- Amaç yalnızca Super Admin kullanıcı deneyimini sadeleştirmek ve premium okumayı güçlendirmektir.
