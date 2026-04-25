<!-- REPO_CONTRACT_MARKER milestone=M84 slug=field-feedback-loop -->

# MILESTONE — M84 SAHA GOZLEM / GERI BILDIRIM DONGUSU

Tarih: 2026-04-21
Durum: **resmi green**

## Hedef
M84, saha gununde ortaya cikan sorun, gozlem, oneriler ve tekrar eden aksakliklari daginik notlardan cikarip tek bir durum dongusunde toplamayi hedefler.

Bu milestone'un amaci:
- saha gozlemini kalici kayda donusturmek
- role ve yuzeye gore geri bildirim yogunlugunu gormek
- Super Admin tarafinda acik / tekrarlandi / cozuldu / kapandi akisina gectigimizi resmi hale getirmek

## Ana basliklar
1. saha geri bildirim kayit store'u
2. role ve yuzeye gore siniflanan geri bildirim kaydi
3. durum akisi: `GORULDU -> TEKRARLANDI -> COZULDU -> KAPANDI`
4. Super Admin tarafinda ozet paket ve kayit yonetimi
5. Gelişmiş alt menusu ile ortak `Geri Bildirim` girisi
6. check + pack + runbook + milestone izi

## Repo cikti seti
- `backend/scripts/m84_field_feedback_loop_check.js`
- `backend/src/ops/fieldFeedbackLoop.js`
- `backend/src/routes/pilotLaunchGate.js`
- `web/src/panels/superadmin/PilotLaunchGatePanel.jsx`
- `tools/pack_m84_field_feedback_loop.ps1`
- `tools/check_m84_field_feedback_loop_repo_contract.ps1`
- `docs/RUNBOOK_M84_FIELD_FEEDBACK_LOOP.md`
- `docs/MILESTONE_M84_FIELD_FEEDBACK_LOOP.md`

## UI
- `Super Admin > Sahaya Cikis Kontrolu` icinde `Saha gozlem / geri bildirim dongusu`
- yeni saha geri bildirimi ekleme formu
- kayitlar icin durum guncelleme aksiyonlari
- `NavDock` icinde `Gelişmiş` altinda `Geri Bildirim` alt menusu; `Copilot` en altta ayridir
- `ROOM`, `COMPANY`, `DRIVER`, `PERSONEL` ve `PARENT` panellerinde ortak geri bildirim girisi
- `#/room/drivers` ve `#/company/access-links` gibi yuzeylerdeki eski mini butonlar kaldirilir
- degerlendirme alaninda 1-5 yildiz kullanilir; notlar Super Admin tarafinda okunur

## Kural
- M84 geri bildirim kaydi local not degil, backend runtime store kaydidir.
- Kayitlar en az rol, yuzey, baslik, detay, kategori ve yildiz puani ile acilir.
- Panel yuzeylerindeki eski butonlar kaldirilir; tek resmi giris Gelişmiş alt menusu ve ortak geri bildirim sayfasidir.
- Ayri bir paralel kayit modeli acilmaz.

## Kanonik komut
- `tools\pack_m84_field_feedback_loop.ps1 -RepoRoot D:\servis-platform`

## Green yorumu
M84 green sayilmasi icin service, route, panel, check, pack ve runbook birlikte bulunmalidir.
Tek basina panel eklenmesi veya yalnizca bir kayit store'u acilmasi yeterli degildir.
