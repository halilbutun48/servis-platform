import { useEffect, useMemo, useRef, useState } from "react";
import { submitPublicLead } from "../../api";
import { getApiErrorMessage } from "../../utils/apiContract";

const LEAD_TYPE_OPTIONS = [
  ["DEMO_REQUEST", "Demo talebi"],
  ["LIVE_SUPPORT_REQUEST", "Canlı destek"],
  ["SERVICE_NEED", "Servis ihtiyacı"],
  ["SUPPLIER_APPLICATION", "Tedarikçi başvurusu"],
];

const ROLE_OPTIONS = [
  "Firma / okul / kurum",
  "Room / tedarikçi",
  "Sürücü",
  "Personel",
  "Veli",
  "Diğer",
];

const SERVICE_TYPE_OPTIONS = [
  "Personel servisi",
  "Öğrenci servisi",
  "Kurum servisi",
];

function trimText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function buildInitialForm(leadType = "DEMO_REQUEST") {
  return {
    type: leadType,
    name: "",
    phone: "",
    email: "",
    organizationName: "",
    role: "Firma / okul / kurum",
    city: "",
    district: "",
    message: "",
    kvkkAccepted: false,
    contactPermission: false,
    website: "",
    serviceNeed: {
      serviceType: SERVICE_TYPE_OPTIONS[0],
      approxPeopleCount: "",
      originRegion: "",
      destinationRegion: "",
      scheduleText: "",
      followUpNote: "",
    },
    supplierInfo: {
      vehicleCount: "",
      serviceRegions: "",
      vehicleTypes: "",
      authorizedPerson: "",
      capacityNote: "",
      invitedMembershipNote: "",
    },
  };
}

function buildPayload(form) {
  const type = String(form.type || "DEMO_REQUEST").trim().toUpperCase();
  const base = {
    type,
    name: trimText(form.name),
    phone: trimText(form.phone),
    email: trimText(form.email).toLowerCase(),
    organizationName: trimText(form.organizationName),
    role: trimText(form.role),
    city: trimText(form.city),
    district: trimText(form.district),
    message: trimText(form.message),
    kvkkAccepted: Boolean(form.kvkkAccepted),
    contactPermission: Boolean(form.contactPermission),
    website: trimText(form.website),
  };

  if (type === "SERVICE_NEED") {
    return {
      ...base,
      serviceNeed: {
        serviceType: trimText(form.serviceNeed?.serviceType),
        approxPeopleCount: trimText(form.serviceNeed?.approxPeopleCount),
        originRegion: trimText(form.serviceNeed?.originRegion),
        destinationRegion: trimText(form.serviceNeed?.destinationRegion),
        scheduleText: trimText(form.serviceNeed?.scheduleText),
        followUpNote: trimText(form.serviceNeed?.followUpNote),
      },
      supplierInfo: null,
    };
  }

  if (type === "SUPPLIER_APPLICATION") {
    return {
      ...base,
      serviceNeed: null,
      supplierInfo: {
        vehicleCount: trimText(form.supplierInfo?.vehicleCount),
        serviceRegions: trimText(form.supplierInfo?.serviceRegions),
        vehicleTypes: trimText(form.supplierInfo?.vehicleTypes),
        authorizedPerson: trimText(form.supplierInfo?.authorizedPerson),
        capacityNote: trimText(form.supplierInfo?.capacityNote),
        invitedMembershipNote: trimText(form.supplierInfo?.invitedMembershipNote),
      },
    };
  }

  return {
    ...base,
    serviceNeed: null,
    supplierInfo: null,
  };
}

function LeadField({ label, children, hint = "" }) {
  return (
    <label className="muted" style={{ display: "grid", gap: 6 }}>
      <span style={{ fontWeight: 800, color: "#eaf0fb" }}>{label}</span>
      {children}
      {hint ? <span className="panelMeta">{hint}</span> : null}
    </label>
  );
}

export default function PublicLeadCaptureModal({ open, leadType = "DEMO_REQUEST", leadTitle = "", onClose }) {
  const [form, setForm] = useState(() => buildInitialForm(leadType));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setForm(buildInitialForm(leadType));
      setBusy(false);
      setError("");
      setSuccess(null);
    } else if (open && prevOpenRef.current) {
      setForm((prev) => ({
        ...prev,
        type: leadType,
      }));
    }
    prevOpenRef.current = open;
  }, [leadType, open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, open]);

  const submitLabel = useMemo(() => {
    const active = LEAD_TYPE_OPTIONS.find(([value]) => value === String(form.type || "").trim().toUpperCase());
    if (!active) return "Başvuruyu gönder";
    return `${active[1]} gönder`;
  }, [form.type]);

  if (!open) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy || success) return;

    const trimmedName = trimText(form.name);
    const trimmedPhone = trimText(form.phone);
    const trimmedEmail = trimText(form.email).toLowerCase();
    const trimmedMessage = trimText(form.message);

    if (!trimmedName) {
      setError("Ad soyad gerekli.");
      return;
    }
    if (!trimmedPhone && !trimmedEmail) {
      setError("Telefon veya e-posta alanından en az biri gerekli.");
      return;
    }
    if (trimmedPhone && !/^\+?[0-9][0-9\s().-]{6,}$/.test(trimmedPhone)) {
      setError("Geçerli bir telefon numarası girin.");
      return;
    }
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Geçerli bir e-posta adresi girin.");
      return;
    }
    if (!form.kvkkAccepted) {
      setError("KVKK onayı gerekli.");
      return;
    }
    if (trimmedMessage.length > 1200) {
      setError("Mesaj en fazla 1200 karakter olabilir.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const result = await submitPublicLead(buildPayload(form));
      setSuccess(result);
    } catch (e) {
      setError(getApiErrorMessage(e, "Başvurunuz alınamadı. Lütfen biraz sonra tekrar deneyin."));
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div className="modal-backdrop" onClick={() => onClose?.()}>
        <div
          className="card modal"
          style={{ width: "min(920px, 94vw)", maxHeight: "92vh", overflow: "auto" }}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="public-lead-modal-title"
        >
          <div className="row" style={{ justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <div id="public-lead-modal-title" style={{ fontWeight: 900, fontSize: 20 }}>
                Başvuru alındı
              </div>
              <div className="muted" style={{ marginTop: 4 }}>
                {leadTitle || "Kontrollü lead kaydı"}
              </div>
            </div>
            <button type="button" className="btn sm" onClick={() => onClose?.()}>
              Kapat
            </button>
          </div>

          <hr />

          <div className="card" style={{ marginTop: 0, background: "rgba(16,185,129,.08)", borderColor: "rgba(16,185,129,.22)" }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Başvurunuz alındı. Ekibimiz inceleme sonrası sizinle iletişime geçecek.</div>
            <div className="panelBody" style={{ marginTop: 10 }}>
              Üyelik otomatik açılmaz. Ödeme / fatura / tahsilat bu form üzerinden başlatılmaz.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={() => onClose?.()}>
      <div
        className="card modal"
        style={{ width: "min(980px, 94vw)", maxHeight: "92vh", overflow: "auto" }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="public-lead-modal-title"
      >
        <div className="row" style={{ justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <div id="public-lead-modal-title" style={{ fontWeight: 900, fontSize: 20 }}>
              Başvuru formu
            </div>
            <div className="muted" style={{ marginTop: 4 }}>
              {leadTitle || "Kontrollü lead kaydı"}
            </div>
            <div className="panelMeta" style={{ marginTop: 6 }}>
              Üyelik otomatik açılmaz. Başvurular ekip tarafından incelenir.
            </div>
          </div>
          <button type="button" className="btn sm" disabled={busy} onClick={() => onClose?.()}>
            Kapat
          </button>
        </div>

        <hr />

        <div className="card" style={{ marginTop: 0, background: "rgba(59,130,246,.08)", borderColor: "rgba(59,130,246,.18)" }}>
          <div className="panelSectionTitle">Güvenli sınır</div>
          <div className="panelBody" style={{ marginTop: 8 }}>
            Bu form kontrollü lead kaydı alır. Self-service üyelik, otomatik firma hesabı, ödeme / fatura / tahsilat ve invite gönderimi açmaz.
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14, marginTop: 14 }}>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <LeadField label="Başvuru tipi">
              <select value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))} disabled={busy}>
                {LEAD_TYPE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </LeadField>

            <LeadField label="Ad Soyad">
              <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} disabled={busy} maxLength={120} />
            </LeadField>

            <LeadField label="Telefon">
              <input type="tel" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} disabled={busy} maxLength={40} />
            </LeadField>

            <LeadField label="E-posta">
              <input type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} disabled={busy} maxLength={160} />
            </LeadField>

            <LeadField label="Kurum / firma adı">
              <input value={form.organizationName} onChange={(e) => setForm((prev) => ({ ...prev, organizationName: e.target.value }))} disabled={busy} maxLength={160} />
            </LeadField>

            <LeadField label="Rol / başvuru tipi">
              <select value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))} disabled={busy}>
                {ROLE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </LeadField>

            <LeadField label="İl">
              <input value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} disabled={busy} maxLength={80} />
            </LeadField>

            <LeadField label="İlçe">
              <input value={form.district} onChange={(e) => setForm((prev) => ({ ...prev, district: e.target.value }))} disabled={busy} maxLength={80} />
            </LeadField>
          </div>

          {String(form.type) === "SERVICE_NEED" ? (
            <div className="card" style={{ marginTop: 0 }}>
              <div className="panelSectionTitle">Servis ihtiyacı ayrıntıları</div>
              <div className="grid" style={{ marginTop: 12, gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <LeadField label="Hizmet türü">
                  <select
                    value={form.serviceNeed.serviceType}
                    onChange={(e) => setForm((prev) => ({ ...prev, serviceNeed: { ...prev.serviceNeed, serviceType: e.target.value } }))}
                    disabled={busy}
                  >
                    {SERVICE_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </LeadField>

                <LeadField label="Yaklaşık kişi sayısı">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.serviceNeed.approxPeopleCount}
                    onChange={(e) => setForm((prev) => ({ ...prev, serviceNeed: { ...prev.serviceNeed, approxPeopleCount: e.target.value } }))}
                    disabled={busy}
                  />
                </LeadField>

                <LeadField label="Başlangıç bölgesi">
                  <input
                    value={form.serviceNeed.originRegion}
                    onChange={(e) => setForm((prev) => ({ ...prev, serviceNeed: { ...prev.serviceNeed, originRegion: e.target.value } }))}
                    disabled={busy}
                    maxLength={120}
                  />
                </LeadField>

                <LeadField label="Varış bölgesi">
                  <input
                    value={form.serviceNeed.destinationRegion}
                    onChange={(e) => setForm((prev) => ({ ...prev, serviceNeed: { ...prev.serviceNeed, destinationRegion: e.target.value } }))}
                    disabled={busy}
                    maxLength={120}
                  />
                </LeadField>

                <LeadField label="Servis günü / saat bilgisi">
                  <textarea
                    rows={3}
                    value={form.serviceNeed.scheduleText}
                    onChange={(e) => setForm((prev) => ({ ...prev, serviceNeed: { ...prev.serviceNeed, scheduleText: e.target.value } }))}
                    disabled={busy}
                    maxLength={200}
                  />
                </LeadField>

                <LeadField
                  label="Ek not"
                  hint="Personel/öğrenci listesi sonra paylaşılacak."
                >
                  <textarea
                    rows={3}
                    value={form.serviceNeed.followUpNote}
                    onChange={(e) => setForm((prev) => ({ ...prev, serviceNeed: { ...prev.serviceNeed, followUpNote: e.target.value } }))}
                    disabled={busy}
                    maxLength={240}
                  />
                </LeadField>
              </div>
            </div>
          ) : null}

          {String(form.type) === "SUPPLIER_APPLICATION" ? (
            <div className="card" style={{ marginTop: 0 }}>
              <div className="panelSectionTitle">Tedarikçi başvurusu ayrıntıları</div>
              <div className="panelBody" style={{ marginTop: 8 }}>
                Doğrulama sonrası davetli üyelik açılır.
              </div>
              <div className="grid" style={{ marginTop: 12, gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <LeadField label="Araç sayısı">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.supplierInfo.vehicleCount}
                    onChange={(e) => setForm((prev) => ({ ...prev, supplierInfo: { ...prev.supplierInfo, vehicleCount: e.target.value } }))}
                    disabled={busy}
                  />
                </LeadField>

                <LeadField label="Hizmet verdiği bölgeler">
                  <input
                    value={form.supplierInfo.serviceRegions}
                    onChange={(e) => setForm((prev) => ({ ...prev, supplierInfo: { ...prev.supplierInfo, serviceRegions: e.target.value } }))}
                    disabled={busy}
                    maxLength={180}
                  />
                </LeadField>

                <LeadField label="Araç tipleri">
                  <input
                    value={form.supplierInfo.vehicleTypes}
                    onChange={(e) => setForm((prev) => ({ ...prev, supplierInfo: { ...prev.supplierInfo, vehicleTypes: e.target.value } }))}
                    disabled={busy}
                    maxLength={180}
                  />
                </LeadField>

                <LeadField label="Yetkili kişi">
                  <input
                    value={form.supplierInfo.authorizedPerson}
                    onChange={(e) => setForm((prev) => ({ ...prev, supplierInfo: { ...prev.supplierInfo, authorizedPerson: e.target.value } }))}
                    disabled={busy}
                    maxLength={120}
                  />
                </LeadField>

                <LeadField label="Kısa kapasite notu">
                  <textarea
                    rows={3}
                    value={form.supplierInfo.capacityNote}
                    onChange={(e) => setForm((prev) => ({ ...prev, supplierInfo: { ...prev.supplierInfo, capacityNote: e.target.value } }))}
                    disabled={busy}
                    maxLength={240}
                  />
                </LeadField>

                <LeadField
                  label="Ek not"
                  hint="Doğrulama sonrası davetli üyelik açılır."
                >
                  <textarea
                    rows={3}
                    value={form.supplierInfo.invitedMembershipNote}
                    onChange={(e) => setForm((prev) => ({ ...prev, supplierInfo: { ...prev.supplierInfo, invitedMembershipNote: e.target.value } }))}
                    disabled={busy}
                    maxLength={240}
                  />
                </LeadField>
              </div>
            </div>
          ) : null}

          <LeadField label="Mesaj / not">
            <textarea
              rows={5}
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              disabled={busy}
              maxLength={1200}
              placeholder="Kısaca ihtiyacınızı anlatın."
            />
          </LeadField>

          <input
            value={form.website}
            onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
            autoComplete="off"
            tabIndex={-1}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: -9999,
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: "none",
            }}
          />

          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontWeight: 700, color: "#dbe7ff" }}>
              <input
                type="checkbox"
                checked={form.kvkkAccepted}
                onChange={(e) => setForm((prev) => ({ ...prev, kvkkAccepted: e.target.checked }))}
                disabled={busy}
                style={{ marginTop: 4 }}
              />
              <span>KVKK aydınlatma metnini okudum ve onaylıyorum.</span>
            </label>

            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontWeight: 700, color: "#dbe7ff" }}>
              <input
                type="checkbox"
                checked={form.contactPermission}
                onChange={(e) => setForm((prev) => ({ ...prev, contactPermission: e.target.checked }))}
                disabled={busy}
                style={{ marginTop: 4 }}
              />
              <span>İletişim izni veriyorum. Bu izin zorunlu değildir.</span>
            </label>
          </div>

          {error ? (
            <div className="card err" style={{ marginTop: 0 }}>
              {error}
            </div>
          ) : null}

          <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn" disabled={busy} onClick={() => onClose?.()}>
              Vazgeç
            </button>
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? "Gönderiliyor..." : submitLabel}
            </button>
          </div>

          <div className="panelMeta">
            Bu form otomatik üyelik açmaz. Ödeme / fatura / tahsilat ve invite gönderimi bu akışta yapılmaz.
          </div>
        </form>
      </div>
    </div>
  );
}
