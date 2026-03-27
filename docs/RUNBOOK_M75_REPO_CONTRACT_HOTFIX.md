# M75 Repo Contract Hotfix

Amaç:
- `pack_m75_hot_path_phase4.ps1` içindeki repo contract adımında görülen
  `Assert-FileExists is not recognized` hatasını kapatmak.

Yapılan:
- `tools/_repo_contract_common.ps1` içine backward-compat `Assert-FileExists` helper eklendi.
- `tools/check_m75_hot_path_phase4_repo_contract.ps1` yeni helper adıyla senkronlandı.
- Küçük doğrulama pack scripti eklendi.
