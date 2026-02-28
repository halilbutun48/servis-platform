# OVERLAY M72.4.1 — Optimistic Reached (Multi-click safe)

## Problem
API down iken Reached queued oluyor; M72.4'te bazı durumlarda sadece 1 kez ilerleyip
sonraki tıklamalarda ilerleme artmıyordu (closure/stale nextStop).

## Fix
Queued olduğunda optimistic ilerlemeyi **state içinden** yap:
- Her tıklamada `prev.nextStop` (veya lastReachedOrder'a göre ilk stop) reached sayılır
- `progress.lastReachedOrder` güncellenir
- `nextStop` bir sonraki durağa geçer

Bu sayede API down iken arka arkaya Reached basınca her seferinde UI ilerler.

## Uygulama
Zip'i repo root'a aç ve script'i çalıştır.
