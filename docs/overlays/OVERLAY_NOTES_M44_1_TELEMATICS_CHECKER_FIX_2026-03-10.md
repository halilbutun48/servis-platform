# OVERLAY NOTES — M44.1 TELEMATICS CHECKER FIX — 2026-03-10

Amaç:
- `tools/check_m44_telematics_repo_contract.ps1` içinde literal string aramada `-notlike` kaynaklı wildcard çakışmasını düzeltmek.

Sorun:
- `gpsDevices      GpsDevice[]` ifadesindeki `[]`, PowerShell wildcard karakter seti gibi yorumlanıyordu.
- Bu yüzden runtime M44 PASS olsa bile repo-contract check patlıyordu.

Düzeltme:
- `MustContain` kontrolü `String.Contains()` ile literal aramaya çevrildi.

Etkilenen dosyalar:
- `tools/check_m44_telematics_repo_contract.ps1`
