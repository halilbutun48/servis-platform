# RUNBOOK — REPO CLEANUP PHASE 1

Bu fazın amacı çalışan akışı bozmadan **yüksek güvenli** eski/orphan/deprecated parçaları temizlemek ve derin audit hattını repo içine eklemektir.

## Bu fazda yapılan güvenli temizlik
Silinen dosyalar:
- `backend/_dmmf_shift_offer.cjs`
- `backend/_shift_offer_fields.cjs`
- `web/src/socket.js`
- `web/src/panels/room/LiveProgressPanel.jsx`

Gerekçe:
- repo içinde aktif import / çağrı izi bulunmadı
- `web/src/socket.js` zaten kendi içinde deprecated + no-op olarak işaretliydi
- `LiveProgressPanel.jsx` sadece `MapPanel` re-export eden artık kullanılmayan uyumluluk katmanıydı
- backend `_dmmf*` yardımcıları tek seferlik inceleme script’i gibi duruyor ve runtime hattına bağlı görünmüyor

## Bu fazda henüz silinmeyen ama inceleme listesinde kalanlar
- `mobile/src/lib/observability.js`
- `mobile/src/lib/fieldAcceptance.js`
- `backend/scripts/full-smoke.js`
- `web/src/live/useOnlineStatus.js`
- `web/src/live/useAutoFlushOnOnline.js`

Bunlar için durum:
- aktif runtime zincirinde zayıf veya hiç bağlantı görünmüyor
- ancak bazıları milestone check / doküman / gelecekteki milestone notlarıyla bağlı
- bu yüzden ikinci faz kararı olmadan silinmemeleri gerekir

## Yeni audit hattı
- `backend/scripts/repo_deep_audit.js`
- `tools/pack_repo_cleanup_phase1.ps1`
- `tools/check_repo_cleanup_phase1_repo_contract.ps1`

Audit çıktıları:
- `artifacts/repo_deep_audit_latest.json`
- `artifacts/repo_deep_audit_latest.md`

## Hijyen
Köke `.gitignore` eklendi.
Özellikle:
- `web/dist/`
- `artifacts/`
- `node_modules`
- `.env`
- `*.log`

Bu, build çıktısı ve lokal dosyaların repoya karışma riskini azaltır.

## Sonraki faz önerisi
1. `tools/pack.ps1 -To 66` ile master hattı çalıştır
2. `tools/pack_repo_cleanup_phase1.ps1` ile audit çıktısını al
3. audit raporuna göre phase 2 cleanup:
   - pack/check script consolidation
   - exact duplicate doküman birleştirme
   - deferred review listesindeki dosyalar için karar
   - gereksiz fetch/render/state ve parallel akış sadeleştirme
