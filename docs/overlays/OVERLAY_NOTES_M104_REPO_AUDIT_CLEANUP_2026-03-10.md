# OVERLAY NOTES — M104 Repo Audit + Cleanup (2026-03-10)

Amaç: çalışan hattı bozmadan repo ağacını sadeleştirmek ve SSOT sapmalarını kapatmak.

## Yapılanlar
- `backend/src/server.js` içindeki kullanılmayan `organizationPlansRouter` import izi temizlendi
- stale route/panel/back-up dosyaları canlı ağaçtan arşive taşındı
- repo kökündeki overlay/readme döküntüleri `docs/_archive/root-legacy/` altına toplandı
- `README.md` repo giriş dosyası olarak yeniden düzenlendi
- public personel link akışı `API_SPEC_V1`, `DB_SCHEMA_V1`, `UI_SPEC_V1`, `PROJECT_SPEC_V1` ve `STARTPACK_V1` içine işlendi
- `tools/check_repo_cleanup_m104.ps1` eklendi

## Arşive taşınan başlıca izler
- `backend/src/routes/organizationPlans.js`
- `web/src/panels/room/RoomShiftsPanel.jsx`
- `web/src/panels/company/GuidedPlanModal.jsx.bak`
- aktif kaynak ağacındaki `*.bak*` dosyaları
- repo kökündeki geçici `README_*.md` / `README_*.txt` / `README.txt` notları
- kökte yanlışlıkla kalmış `src/`, `scripts/`, `rlays/` artıkları

## Not
Bu overlay resmi green milestone'u değiştirmez; bakım/hijyen düzenlemesidir.
