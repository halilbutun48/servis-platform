# ROOM-VEHICLE-DRIVER-UPPERCASE-NORMALIZATION-01

## Problem
Room araç ve sürücü formlarında bazı alanlar küçük harfle girilince ekranda ve payload tarafında tutarsız kalabiliyordu. Bu durum plaka, ad soyad ve cihaz bilgisi gibi alanlarda okunurluğu düşürüyordu.

## Goal
Kullanıcı girişlerini güvenli şekilde uppercase normalize ederek Room araç/sürücü create ve edit akışlarını daha tutarlı hale getirmek.

Normalize edilen alanlar:
- Araç plakası
- Araç marka / model / renk / VIN / not alanları
- Sürücü ad soyad
- Sürücü cihaz bilgisi

## Behavior
- Boş, `null` ve `undefined` değerler güvenli ele alınır.
- Plaka alanı live input ve payload tarafında uppercase gösterilir / gönderilir.
- Sürücü adı ve cihaz bilgisi payload tarafında uppercase normalize edilir.
- Telefon alanı uppercase yapılmaz; trim edilir.
- Create / update endpoint contract'ı genişletilmez.

## Out of scope
Bu milestone aşağıdakileri açmaz veya değiştirmez:
- yeni endpoint
- schema değişikliği
- payment execute
- billing execute
- settlement execute
- contract execute
- invite send
- user create
- supplier verification auto
- route apply

## Notes
- Türkçe locale uppercasing bilinçli olarak kullanılır.
- Amaç kullanıcı-facing veri girişini daha tutarlı hale getirmektir; Room panel layout veya clarity refactor değildir.
