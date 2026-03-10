# STEP1 TOTP Repo Contract Encoding Hotfix

Amaç: Windows PowerShell codepage/encoding yüzünden `Kurulum Başlat` ve `Step-up Doğrula`
metinlerinin yanlış eşleşmesini önlemek.

Değişiklik:
- `tools/check_step1_totp_stepup_repo_contract.ps1`
- Türkçe UI label araması yerine ASCII güvenli marker kullanılır:
  - `onClick={onSetup}`
  - `onClick={onVerify}`
