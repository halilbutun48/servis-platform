# OVERLAY NOTES — M90F M80 tools primer gate fix

Tarih: 2026-04-08

Amaç:
- `tools\check_m80_final_sert_kabul_yuk_guveni_repo_contract.ps1` içindeki kırılgan `tools primer mirrors M80 gate` kontrolünü yaşayan tools primer wording'lerini de kabul edecek şekilde gevşetmek.

Kapsam:
- Sadece 1 dosya değişir.
- Ürün koduna dokunulmaz.
- Runtime check mantığına dokunulmaz.

Beklenen etki:
- `tools\PRIMER_SNAPSHOT.md` içinde zaten bulunan `M80 final sert kabul yük güveni` / `M80.1` / `M80.2` / `M80.3` notları M80 repo-contract için yeterli kabul edilir.
