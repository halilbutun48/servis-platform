# overlay_colorized_ps_output_2026-03-10

PowerShell çıktılarını renklendirir:

- `OK` / `PASS` / `health OK` → yeşil
- `FAIL` / `ERROR` / timeout / repo contract fail → kırmızı
- `WARN` → sarı
- `INFO` / başlıklar → camgöbeği

Kapsam:
- `tools/gate.ps1`
- `tools/pack.ps1`
- `tools/pack_m42_optional.ps1`
- `tools/pack_step06_stabil.ps1`
- `tools/check_step06_repo_contract.ps1`
- `tools/pack_step1_security_foundation.ps1`
- `tools/check_step1_security_foundation_repo_contract.ps1`
- `tools/_console_status.ps1`
