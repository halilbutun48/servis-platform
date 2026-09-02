import { useEffect, useMemo, useState } from "react";
import { generateAccountingExport, previewAccountingExport } from "../../api";
import { getApiErrorInfo } from "../../utils/apiContract";

const FORMAT_OPTIONS = [
  { value: "XLSX", label: "Excel / XLSX" },
  { value: "CSV", label: "CSV" },
  { value: "JSON", label: "JSON" },
];

function text(value, fallback = "-") {
  const valueText = String(value ?? "").replace(/\s+/g, " ").trim();
  return valueText || fallback;
}

function statusLabel(value) {
  return {
    READY: "Hazır",
    WARNING: "Uyarı",
    BLOCKED: "Engelli",
  }[String(value || "").toUpperCase()] || "Kontrol bekliyor";
}

function statusTone(value) {
  return {
    READY: "good",
    WARNING: "warn",
    BLOCKED: "danger",
  }[String(value || "").toUpperCase()] || "neutral";
}

function initialPeriod(preview) {
  const budgetPeriod = preview?.budgetPlan?.current || preview?.budgetPlan?.draft || preview?.budgetPlan?.active || null;
  return {
    periodStart: budgetPeriod?.periodStart || preview?.period?.periodStart || "",
    periodEnd: budgetPeriod?.periodEnd || preview?.period?.periodEnd || "",
  };
}

function formatLabel(value) {
  return FORMAT_OPTIONS.find((item) => item.value === value)?.label || value;
}

export default function AccountingExportPanel({ scope = "COMPANY", me = null, preview = null, token = "" }) {
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [format, setFormat] = useState("XLSX");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [approvalChecked, setApprovalChecked] = useState(false);
  const [generated, setGenerated] = useState(null);

  useEffect(() => {
    const initial = initialPeriod(preview);
    setPeriodStart((value) => value || initial.periodStart);
    setPeriodEnd((value) => value || initial.periodEnd);
  }, [preview]);

  const role = String(me?.role || "").toUpperCase();
  const companyKind = String(me?.companyKind || "").toUpperCase();
  const allowed = scope === "ROOM"
    ? role === "ROOM" || role === "SUPER_ADMIN"
    : (role === "COMPANY" || role === "SUPER_ADMIN") && !["SCHOOL", "ORGANIZATION"].includes(companyKind);
  const validation = result?.contract?.validation || null;
  const status = validation?.status || "";
  const canGenerate = Boolean(validation && status !== "BLOCKED" && approvalChecked && !busy);
  const recordCount = result?.contract?.records?.length ?? 0;
  const periodLabel = periodStart && periodEnd ? `${periodStart} - ${periodEnd}` : "Dönem seçilmedi";
  const scopeLabel = scope === "ROOM" ? "Taşımacılık Firması" : "Hizmet Alan Firma";
  const findings = useMemo(() => Array.isArray(validation?.findings) ? validation.findings : [], [validation]);

  async function handlePreview() {
    setBusy("preview");
    setError("");
    setGenerated(null);
    setApprovalChecked(false);
    try {
      const next = await previewAccountingExport({ scope, periodStart, periodEnd, format }, { token });
      setResult(next);
    } catch (e) {
      const info = getApiErrorInfo(e, "Dışa aktarım önizlemesi okunamadı.");
      setError(info.message || "Dışa aktarım önizlemesi okunamadı.");
      setResult(null);
    } finally {
      setBusy("");
    }
  }

  async function handleGenerate() {
    if (!canGenerate) return;
    setBusy("generate");
    setError("");
    try {
      const artifact = await generateAccountingExport({
        scope,
        periodStart,
        periodEnd,
        format,
        userApproval: true,
      }, { token });
      const objectUrl = URL.createObjectURL(artifact.blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = artifact.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setGenerated(artifact);
    } catch (e) {
      const info = getApiErrorInfo(e, "Dışa aktarım dosyası oluşturulamadı.");
      setError(info.message || "Dışa aktarım dosyası oluşturulamadı.");
    } finally {
      setBusy("");
    }
  }

  if (!allowed) {
    return (
      <section className="card" data-testid="accounting-export-panel" style={{ marginTop: 12, border: "1px solid rgba(240,68,56,0.28)" }}>
        <div className="panelSectionTitle">Muhasebe Dışa Aktarımı</div>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
          Bu hesap türü için muhasebe dışa aktarımı uygulanamaz. Finansal veri üretilmedi ve dış sisteme gönderim yapılmadı.
        </div>
      </section>
    );
  }

  return (
    <section className="card" data-testid="accounting-export-panel" style={{ marginTop: 12, border: "1px solid rgba(58,102,255,0.28)", background: "rgba(58,102,255,0.04)" }}>
      <div className="panelSectionTitle">Muhasebe Dışa Aktarımı</div>
      <div className="muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
        Yetkili {scopeLabel.toLowerCase()} verilerini kontrol edilebilir bir dışa aktarım paketi olarak hazırlar. Bu işlem muhasebe kaydı, ödeme veya ERP gönderimi yapmaz.
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
        <label className="muted">
          Dönem başlangıcı
          <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} style={{ width: "100%", marginTop: 6 }} />
        </label>
        <label className="muted">
          Dönem bitişi
          <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} style={{ width: "100%", marginTop: 6 }} />
        </label>
        <label className="muted">
          Format
          <select value={format} onChange={(event) => setFormat(event.target.value)} style={{ width: "100%", marginTop: 6 }}>
            {FORMAT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className="btn primary" onClick={handlePreview} disabled={busy.length > 0 || !periodStart || !periodEnd}>
          {busy === "preview" ? "Kontrol ediliyor..." : "Önizle"}
        </button>
        {validation ? <span className="pill" data-status={statusTone(status).toUpperCase()}>{statusLabel(status)}</span> : null}
        {result ? <span className="pill">{recordCount} kayıt • {formatLabel(format)}</span> : null}
      </div>

      {error ? <div className="card" style={{ marginTop: 10, border: "1px solid rgba(240,68,56,0.28)", color: "#fecaca" }}>{error}</div> : null}

      <div className="card" style={{ marginTop: 12, background: "rgba(255,255,255,0.03)" }}>
        <div style={{ fontWeight: 800 }}>Özet</div>
        <div className="muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
          Dönem: <b>{periodLabel}</b> • Kapsam: <b>{scopeLabel}</b> • Kayıt: <b>{recordCount}</b> • Durum: <b>{statusLabel(status)}</b>
        </div>
        <div className="muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
          Önizleme / dry-run. Dosya oluşturma yalnızca bu kontrolden sonra kullanıcı onayıyla yapılır.
        </div>
      </div>

      {findings.length ? (
        <div className="card" style={{ marginTop: 10, background: "rgba(255,255,255,0.025)" }}>
          <div style={{ fontWeight: 800 }}>Doğrulama bulguları</div>
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            {findings.map((item, index) => (
              <div key={`${item.code}-${index}`} className="muted" style={{ lineHeight: 1.45 }}>
                <b>{item.severity}</b> · {text(item.message)}{item.field ? ` (${item.field})` : ""}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {validation && status !== "BLOCKED" ? (
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          <label className="muted" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <input type="checkbox" checked={approvalChecked} onChange={(event) => setApprovalChecked(event.target.checked)} />
            <span>Dışa aktarmadan önce kontrol ettim; bu dosyanın yalnızca hazırlık/önizleme paketi olduğunu biliyorum. Kullanıcı onayı veriyorum.</span>
          </label>
          <button type="button" className="btn" onClick={handleGenerate} disabled={!canGenerate}>
            {busy === "generate" ? "Dosya hazırlanıyor..." : "Dışa Aktarım Dosyası Oluştur"}
          </button>
        </div>
      ) : null}

      {generated ? (
        <div className="card" style={{ marginTop: 10, border: "1px solid rgba(18,183,106,0.35)" }}>
          <div style={{ fontWeight: 800 }}>Dosya hazırlandı</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>{generated.filename}</div>
          <div className="muted" style={{ marginTop: 4, lineHeight: 1.45 }}>Bu bir export önizleme paketidir; muhasebe kaydı veya ödeme yapılmadı.</div>
        </div>
      ) : null}

      <details style={{ marginTop: 12 }}>
        <summary className="muted" style={{ cursor: "pointer" }}>Ayrıntılar / izlenebilirlik</summary>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
          Sözleşme: ACCOUNTING_EXPORT_CONTRACT_V1 • Kaynak sistem: SeferPakt • İdempotency ve kaynak referansları JSON sözleşmesinde korunur.
          {result?.contract?.exportId ? ` Export ID: ${result.contract.exportId}.` : ""}
        </div>
      </details>
    </section>
  );
}
