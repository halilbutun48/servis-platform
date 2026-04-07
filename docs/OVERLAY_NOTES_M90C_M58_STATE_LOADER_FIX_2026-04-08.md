# OVERLAY NOTES — M90C M58 STATE LOADER FIX

Tarih: 2026-04-08
Kapsam: Dar check katmanı düzeltmesi

## Sorun
`tools/check_m58_final_pilot_readiness_repo_contract.ps1` içinde iki dot-source satırı tek satıra yapışmıştı.

Bozuk biçim:
- `. (Join-Path $PSScriptRoot "_repo_contract_common.ps1"). (Join-Path $PSScriptRoot "_repo_contract_state.ps1")`

Bu yüzden `_repo_contract_state.ps1` yüklenmiyor ve `Read-RepoContractState` fonksiyonu tanınmıyordu.

## Etki
- `tools/pack_m58_final_pilot_readiness.ps1` repo-contract aşamasında düşüyordu.
- `pack.ps1 -To 89` M58'de kesiliyordu.

## Düzeltme
Aynı satır iki ayrı dot-source satırına ayrıldı.

## Beklenen sonuç
- `pack_m58_final_pilot_readiness.ps1` repo-contract kısmı helper'ı görebilmeli.
- `pack.ps1 -To 89` M58 sonrasına ilerleyebilmeli.
