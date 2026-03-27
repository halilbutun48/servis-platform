# M70 — Checker Sync + Hot Path

## Hedef
Kurumsal ölçek hazırlığında yanlış alarm üreten checker katmanını güncellemek ve ilk frame’de gereksiz veri çeken birkaç sıcak akışı azaltmak.

## Kapsam
- M67 scale/storm script sync
- Workflow ilk açılış room yükünü kaldırma
- Workflow provider score scope daraltma
- ServiceEvaluation template lazy load
- agreements/offers q desteği

## Tamamlanma ölçütü
- M70 pack PASS
- güncel M67 pack anlamlı ve güncel uyarılar üretir
- checker artık mevcut backend/web kapasitesini yanlış eksik göstermeye devam etmez
