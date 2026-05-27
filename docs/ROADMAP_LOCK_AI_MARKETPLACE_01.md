# ROADMAP LOCK AI MARKETPLACE 01

Tarih: 2026-05-27  
Repo: `servis-platform`

## Amaç
- Bu doküman SeferPakt'ın güncel milestone yolunu ve Sefer Abi merkezli AI / pazaryeri omurgasını dokümana sabitler.
- Bu milestone sadece docs / roadmap / primer güncellemesidir.
- Runtime ürün davranışı değiştirmez.

## Ürün gerçeği
- SeferPakt sadece operasyon takip yazılımı değildir.
- Sefer Abi ürünün ana farkıdır.
- Sefer Abi rol bazlı çalışır, sesli destek verebilir, durumu anlayabilir, riskleri fark edebilir ve sıradaki doğru işlemi önerebilir.
- Kritik işlemler kullanıcı onayı olmadan yapılmaz.

## Kritik güvenlik sınırı
- Teklif gönderme yok.
- Tedarikçi seçme yok.
- Sözleşmeye dönüştürme yok.
- Araç / sürücü atama yok.
- Rota / durak değişikliğini uygulama yok.
- SMS / push / bildirim gönderme yok.
- Ödeme yok.
- Fatura / tahsilat yok.
- Ceza / yaptırım yok.
- Hakediş / settlement execute yok.
- Tedarikçi görünürlük / sıralama değişimi yok.

## Completed milestones
1. `DYNAMIC-SAVINGS-01` ✅
2. `QLT-PAY-BRIDGE-01` ✅
3. `SEFER-SCORE-01` ✅
4. `BOARDING-CHANGE-DECISION-OWNER-PREVIEW-01` ✅
5. `UI-ACTION-WIRING-AUDIT-01` ✅
6. `AUTH-STEPUP-PROVIDER-LOCAL-DEFAULT-01` ✅
7. `BOARDING-CHANGE-REQUEST-ENTRY-01` ✅
8. `MARKETPLACE-FREE-TO-OPERATE-01` ✅
9. `AGREEMENT-SOURCE-SHIFT-LINEAGE-01` ✅

## Locked roadmap order
1. `ROADMAP-LOCK-AI-MARKETPLACE-01`
2. `PUBLIC-LANDING-01`
3. `LEAD-CAPTURE-01`
4. `ONBOARDING-REVIEW-01`
5. `INVITE-BASED-MEMBERSHIP-01`
6. `VERIFIED-SUPPLIER-01`
7. `UX-MARKETPLACE-PANELS-01`
8. `M44-TELEMATICS-T1-T5`
9. `SAFE-DRIVE-01`
10. `OFFER-RANKING-QUALITY-01`
11. `COPILOT-ROLE-TASK-MATRIX-01`
12. `COPILOT-AI-ACTION-ROADMAP-01`
13. `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01`
14. `VOICE-COPILOT-ROLE-ASSISTANT-01`
15. `PROACTIVE-COPILOT-01`
16. `COPILOT-NEXT-BEST-ACTION-01`
17. `COPILOT-ALERT-TO-ACTION-CARD-01`
18. `COPILOT-DEMAND-INTAKE-01`
19. `ADDRESS-GEOCODING-CONFIDENCE-01`
20. `COPILOT-STOP-ROUTE-DRAFT-01`
21. `COPILOT-RFQ-PREP-01`
22. `SUPPLIER-MATCHING-01`
23. `SUPPLIER-OFFER-COLLECT-01`
24. `COPILOT-OFFER-ANALYSIS-01`
25. `COPILOT-NEGOTIATION-ASSIST-01`
26. `COPILOT-OFFER-RECOMMENDATION-01`
27. `COPILOT-SHIFT-TO-AGREEMENT-PREP-01`
28. `COPILOT-DISPATCH-ACTION-PREP-01`
29. `COPILOT-ACTION-PREP-01`
30. `COPILOT-HUMAN-APPROVAL-01`
31. `VOICE-COPILOT-COMMANDS-01`
32. `VOICE-COPILOT-CONFIRMATION-01`
33. `COPILOT-SAFE-AUTOPILOT-01`
34. `PERF-REGRESSION-01`
35. `SECURITY-KVKK-FINAL-01`
36. `MOBILE-WEB-FINAL-01`
37. `QUALITY-GATE-FINAL-01`
38. `PROD-HARDENING-01`
39. `FIELD-ACCEPTANCE-01`
40. `RELEASE-CANDIDATE-01`

## Demand-to-Agreement omurgası
- Personel / öğrenci listesi okunur.
- Ad-soyad-adres alanları değerlendirilir.
- Adreslerden koordinat çıkarılır.
- Eksik veya şüpheli adresler kullanıcı ile düzeltilir.
- Toplanma / varış konumu belirlenir.
- Yürüme mesafesi belirlenir.
- Durak adayları oluşturulur.
- OSRM ile rota / km / süre çıkarılır.
- Kaynak vardiya / market shift taslağı oluşur.
- Uygun Room / tedarikçiler shortlist edilir.
- Teklif talebi hazırlanır.
- Kullanıcı onaylarsa teklif talebi gönderilir.
- Gelen teklifler fiyat / kalite / SeferPuanı / rota / kapasite / risk ile analiz edilir.
- Pazarlık / karşı teklif taslağı hazırlanabilir.
- En uygun teklif gerekçeleriyle önerilir.
- Kullanıcı seçerse "Bu teklifi sözleşmeye dönüştürmek ister misiniz?" onayı sorulur.
- Kullanıcı onaylarsa kaynak vardiya + seçilen teklif + rota / durak + fiyat sözleşme taslağına dönüşür.
- Agreement oluşur.
- Source lineage korunur.
- Agreement aktif olunca 7 günlük rolling vardiyalar üretilir.

## Dayanma kuralları
- Doğrudan agreement create ana ticari kaynak sayılmaz.
- Source vardiya / market shift / commercial source kanıtı yoksa başarı payı doğmaz.
- Belirsiz kaynak fallback olarak mevcut / manuel / legacy / insufficient lineage kabul edilir.
- Marketplace önizlemesi readonly kalır.
- Gerçek ödeme / tahsilat / fatura / ledger / settlement execute yoktur.

## İlişkili dokümanlar
- `docs/COPILOT_ROLE_TASK_MATRIX_01.md`
- `docs/COPILOT_AI_ACTION_STRATEGY_01.md`
- `docs/COPILOT_DEMAND_TO_AGREEMENT_ROADMAP_01.md`
- `docs/VOICE_COPILOT_ROLE_ASSISTANT_01.md`
- `docs/PROACTIVE_COPILOT_NEXT_BEST_ACTION_01.md`
- `PROACTIVE-COPILOT-NEXT-BEST-ACTION-01`
- `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md`
