Yeni Milestone Roadmap (M0–M12) → toplam 13 milestone

M0 İskelet/Auth/Roles/Seed
M1 Company/Room CRUD + request→approve/assign akışı
M2 GPS ingest + status standardı + ETA core (+ WS gps/update)
M3 Shift/Stop workflow (create/approve/start/reached)
M4 Notification v1 + GPS monitors (transition+dedupe) + WS notif/new
M5 Stop CRUD (add/update/delete) + reorder + progress/ETA doğrulama (test pack)
M6 Standartlaştırma: shift lifecycle + reorder body standardı + reached stopId (tek sözleşme)
M7 Security hardening: RBAC/scope (room/company/shift/vehicle), rate-limit/abuse, input validation
M8 Route/Stop planlama “tam”: template/plan kopyalama, durak tipleri (COMMON/MANUAL), tutarlı sıralama kuralları
M9 Driver operasyon: “next stop”, “skip/reopen”, shift end/complete/cancel, cihaz/driver bağları
M10 Observability: audit_log + api_requests + retention + log standardı + health detayları
M11 Web UI tamam: paneller, map standardı, build kontrolleri (web build)
M12 Release/Runbook: backup/restore, env şablonları, GreenPack/Gate script tek komut, tag/release notu

Gate (Full Check) kuralı