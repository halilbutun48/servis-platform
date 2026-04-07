<!-- REPO_CONTRACT_MARKER milestone=M86 slug=required-payment-rollout -->

# RUNBOOK — M86 REQUIRED PAYMENT ROLLOUT

Bu runbook, `M82.9 -> M82.11` ticari omurga ve `M85` opsiyonel pilot fazindan sonra acilan **M86 zorunlu odeme rollout** kapsam sinirini tanimlar.

## Amaç
- `REQUIRED` moddaki ticari kaynaklari zorunlu rollout listesinde toplamak
- Super Admin'in secili kaynaklari `ACTIVE` durumuna alip rollout kapsamina sokmasini saglamak
- Gerekirse ayni kaynaklari `DISABLED` durumuna cekerek kontrollu rollback yapabilmek

## Açılan yüzeyler
- `CommercialCorePanel` icinde M86 zorunlu odeme rollout bolumu
- backend tarafinda required rollout status / candidate / activate / deactivate endpoint'leri
- readonly ticari ozetlerde required rollout aktif / durduruldu / beklemede ipucu

## Bu faz ne degildir?
- Gercek provider entegrasyonunu tamamlamaz
- Gercek charge/payout webhook mutabakatini bu fazda bitirmez
- Finansal iade/iptal duzeltme akisini son noktasina tasimaz

## Resmi komutlar
- `tools\pack_m86_required_payment_rollout.ps1 -RepoRoot D:\servis-platform`
- `tools\check_m86_required_payment_rollout_repo_contract.ps1 -RepoRoot D:\servis-platform`
- `cd backend && npm run m86check`

## Kabul özeti
- Super Admin ticari akış ekranında M86 required rollout bölümü görünür
- REQUIRED moddaki kaynaklar rollout listesinde görünür
- Seçili kaynak `ACTIVE` yapılabilir
- Aktif kaynak `DISABLED` yapılabilir
- agreement / vardiya readonly özetleri required rollout durumunu görünür taşır

## Not
- Bu faz, gerçek provider entegrasyonundan önce zorunlu rollout omurgasını görünür ve yönetilebilir hale getirir.
- Sonraki gerçek saha/operasyon adımı rollout sonrası ölçüm, mutabakat ve finans operasyon doğrulamasıdır.
