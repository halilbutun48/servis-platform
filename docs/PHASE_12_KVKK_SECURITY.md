# PHASE 12 — KVKK & Security (Prod Readiness) — CHECKLIST + DoD
Tarih: 2026-03-04 (Europe/Istanbul)

Bu doküman teknik “yapılacaklar + kabul kriterleri (DoD) + doğrulama (check)” listesidir.
Hukuki danışmanlık değildir; KVKK uyumu için kurum içi hukuk/uyum ekibi ile birlikte finalize edilmelidir.

---

## 0) Kapsam
Bu projede işlenen başlıca veri sınıfları:
- Kimlik/iletişim: ad-soyad, telefon, email (PII)
- Hesap/rol: kullanıcı kimliği, rol, scope ilişkileri (PII)
- Konum: GPS noktaları, hız, rota/duraklar (hassas)
- Okul/veli/öğrenci (varsa): çocuk verisi (daha hassas)
- Operasyon: vardiya, teklif, sözleşme, atamalar
- Sistem: API request log, audit log, bildirim kayıtları

KVKK prensipleri (teknik açıdan):
- Veri minimizasyonu, amaçla sınırlılık
- Saklama süresi & silme/anonimleştirme
- Erişim kontrolü (RBAC + scope)
- İz kayıtları (audit) + dışa aktarma (export) denetimi
- İhlal yönetimi

---

## 1) Milestone haritası (PHASE 12)
- **M38:** KVKK Consent gate + CORS/TLS guard check
- **M39:** Retention job (silme/anonimleştirme) check
- **M40:** RBAC matrisi + Log export audit trail check
- **M41:** Refresh token + revoke + device binding + Redis rate-limit check

> Not: Bu repoda STABLE_TO=78 olarak kilitli (auto pack/reset-and-pack M78’de kalır).
> M38+ check’leri çalıştırmak için `tools/STABLE_TO.txt` değerini artır veya manuel `-To 38/39/40/41` kullan.

---

## 2) KVKK Gereksinimleri (Teknik)
### P12.1 Aydınlatma + Açık Rıza (Consent) — gate
**Amaç:** Konum/çocuk verisi gibi hassas veriler için sürümlemeli onay.

**DoD (özet)**
- Consent verilmeden: parent live / driver gps / export gibi ilgili endpoint’ler 403
- Consent accept/revoke audit’e düşer
- SUPER_ADMIN override varsa audit’li ve sınırlı

### P12.2 Retention — saklama süresi & silme
- gps_points: 30–90 gün
- notifications: 90–180 gün
- api_requests: 180 gün (veya daha az)
- audit_log: 2 yıl (kurum politikası)

**DoD (özet)**
- Nightly job süreyi aşanı siler/anonimleştirir
- Job koşusu audit’e düşer

### P12.3 Erişim matrisi + Log export kontrolü
**DoD (özet)**
- Export her çağrıda audit:
  - actor, role, kind, targetType/Id, from/to, rowCount
- PARENT vehicle export: childId zorunlu + ACTIVE vardiya şartı

---

## 3) Güvenlik Gereksinimleri (Prod)
### P12.5 TLS/Headers
- reverse proxy + HSTS + temel güvenlik header’ları

### P12.6 CORS whitelist + JWT secret disiplin
- prod’da `CORS_ORIGIN="*"` yasak
- JWT secret rotate planı

### P12.8 Refresh + Revoke + Device binding (mobile)
- refresh token tablosu (hashed)
- revoke/logout
- driver deviceId zorunlu

### P12.9 Rate-limit / Abuse (Redis)
- express-rate-limit store Redis
- GPS throttle distributed (Redis sliding window)

---

## 4) Go/No-Go (Mobile)
**Go için minimum**
- TLS + CORS whitelist + refresh/device binding + Redis rate-limit + consent gate

**No-Go**
- Refresh/revoke yoksa
- Consent/retention yoksa
- Rate-limit distributed değilse

---
