import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";
import { getApiErrorMessage } from "../../utils/apiContract";
import { financeUserFacingError } from "../shared/financeUserFacingLabels.js";
import { getPreferredRouteTemplateId, getReadableRouteTemplateLabel } from "./routeEvidenceTemplates.js";

function numberOrNull(value) {
  const text = String(value ?? "").trim().replace(",", ".");
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function stopsFromResponse(response) {
  return Array.isArray(response) ? response : Array.isArray(response?.stops) ? response.stops : Array.isArray(response?.items) ? response.items : [];
}

function routeError(error, fallback) {
  return financeUserFacingError({ message: getApiErrorMessage(error, fallback) }, fallback);
}

export default function RouteEvidenceEditor({ token, shift, onClose, onChanged, returnPath = "" }) {
  const shiftId = Number(shift?.id || 0);
  const [stops, setStops] = useState([]);
  const [hubLat, setHubLat] = useState(shift?.hubLat == null ? "" : String(shift.hubLat));
  const [hubLng, setHubLng] = useState(shift?.hubLng == null ? "" : String(shift.hubLng));
  const [direction, setDirection] = useState(String(shift?.direction || "INBOUND").toUpperCase());
  const [pattern, setPattern] = useState(String(shift?.pattern || "ONE_WAY").toUpperCase());
  const [emptyDistanceKm, setEmptyDistanceKm] = useState(shift?.emptyDistanceKm == null ? "" : String(shift.emptyDistanceKm));
  const [emptyDistanceEvidenceRef, setEmptyDistanceEvidenceRef] = useState(String(shift?.emptyDistanceEvidenceRef || ""));
  const [emptyDistanceReason, setEmptyDistanceReason] = useState(String(shift?.emptyDistanceReason || ""));
  const [stopName, setStopName] = useState("");
  const [stopLat, setStopLat] = useState("");
  const [stopLng, setStopLng] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [routeSnapshot, setRouteSnapshot] = useState({ distanceM: shift?.routeSnapshotDistanceM ?? null, source: "PLANNED_ROUTE_INPUT" });
  const [routeTemplates, setRouteTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const stopCountLabel = useMemo(() => `${stops.length} durak`, [stops.length]);

  async function loadStops() {
    if (!shiftId) return;
    setLoading(true);
    try {
      const response = await api(`/api/shifts/${shiftId}/stops`, { token });
      setStops(stopsFromResponse(response));
    } catch (e) {
      setError(routeError(e, "Duraklar yüklenemedi."));
    } finally {
      setLoading(false);
    }
  }

  async function loadShiftDetails() {
    if (!shiftId) return;
    try {
      const latest = await api(`/api/shifts/${shiftId}`, { token });
      setHubLat(latest?.hubLat == null ? "" : String(latest.hubLat));
      setHubLng(latest?.hubLng == null ? "" : String(latest.hubLng));
      setDirection(String(latest?.direction || "INBOUND").toUpperCase());
      setPattern(String(latest?.pattern || "ONE_WAY").toUpperCase());
      setEmptyDistanceKm(latest?.emptyDistanceKm == null ? "" : String(latest.emptyDistanceKm));
      setEmptyDistanceEvidenceRef(String(latest?.emptyDistanceEvidenceRef || ""));
      setEmptyDistanceReason(String(latest?.emptyDistanceReason || ""));
      setRouteSnapshot({ distanceM: latest?.routeSnapshotDistanceM ?? null, source: "PLANNED_ROUTE_INPUT" });
    } catch {
      // The parent shift remains the safe fallback when the detail refresh fails.
    }
  }

  async function loadRouteTemplates() {
    try {
      const response = await api("/api/route-templates", { token });
      const items = Array.isArray(response) ? response : Array.isArray(response?.items) ? response.items : [];
      setRouteTemplates(items);
      const preferredId = getPreferredRouteTemplateId(items, shift?.startAt);
      setSelectedTemplateId(preferredId ? String(preferredId) : "");
    } catch {
      // The manual route form remains available when no template can be listed.
      setRouteTemplates([]);
      setSelectedTemplateId("");
    }
  }

  useEffect(() => {
    setHubLat(shift?.hubLat == null ? "" : String(shift.hubLat));
    setHubLng(shift?.hubLng == null ? "" : String(shift.hubLng));
    setDirection(String(shift?.direction || "INBOUND").toUpperCase());
    setPattern(String(shift?.pattern || "ONE_WAY").toUpperCase());
    setEmptyDistanceKm(shift?.emptyDistanceKm == null ? "" : String(shift.emptyDistanceKm));
    setEmptyDistanceEvidenceRef(String(shift?.emptyDistanceEvidenceRef || ""));
    setEmptyDistanceReason(String(shift?.emptyDistanceReason || ""));
    setRouteSnapshot({ distanceM: shift?.routeSnapshotDistanceM ?? null, source: "PLANNED_ROUTE_INPUT" });
    loadShiftDetails();
    loadStops();
    loadRouteTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftId]);

  async function applyRouteTemplate(event) {
    event.preventDefault();
    const templateId = Number(selectedTemplateId);
    if (!Number.isSafeInteger(templateId) || templateId <= 0) {
      setError("Önce uygulanacak kayıtlı rota planını seç.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await api(`/api/shifts/${shiftId}/stops/from-template`, {
        token,
        method: "POST",
        body: { templateId, mode: "REPLACE" },
      });
      const updated = response?.shift || null;
      setMessage("Seçilen rota planı bu vardiyaya uygulandı; OSRM mesafesi yeniden hesaplandı. Bu kayıt gerçek sürüş veya boş kilometre kanıtı değildir.");
      if (updated) {
        setRouteSnapshot({ distanceM: updated.routeSnapshotDistanceM ?? null, source: "PLANNED_ROUTE_INPUT" });
        await onChanged?.(updated);
      }
      await loadStops();
      await loadShiftDetails();
    } catch (e) {
      setError(routeError(e, "Rota planı uygulanamadı."));
    } finally {
      setBusy(false);
    }
  }

  async function saveRouteEvidence(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const lat = numberOrNull(hubLat);
    const lng = numberOrNull(hubLng);
    if ((hubLat.trim() && lat == null) || (hubLng.trim() && lng == null)) {
      setError("Toplanma konumu enlem ve boylamı geçerli sayı olmalı.");
      setBusy(false);
      return;
    }
    if ((lat == null) !== (lng == null)) {
      setError("Toplanma konumu enlem ve boylam birlikte girilmeli.");
      setBusy(false);
      return;
    }
    const emptyKm = numberOrNull(emptyDistanceKm);
    if (emptyDistanceKm.trim() && (emptyKm == null || emptyKm < 0)) {
      setError("Boş kilometre sıfır veya daha büyük bir sayı olmalı.");
      setBusy(false);
      return;
    }
    if (emptyKm != null && (!emptyDistanceEvidenceRef.trim() || !emptyDistanceReason.trim())) {
      setError("Boş kilometre girildiğinde kaynak ve kısa gerekçe de belirtilmeli.");
      setBusy(false);
      return;
    }
    try {
      const response = await api(`/api/shifts/${shiftId}/route-evidence`, {
        token,
        method: "PUT",
        body: {
          hubLat: lat,
          hubLng: lng,
          direction,
          pattern,
          emptyDistanceKm: emptyKm,
          emptyDistanceEvidenceRef: emptyKm == null ? null : emptyDistanceEvidenceRef.trim(),
          emptyDistanceReason: emptyKm == null ? null : emptyDistanceReason.trim(),
        },
      });
      const updated = response?.shift || response;
      setRouteSnapshot({ distanceM: updated?.routeSnapshotDistanceM ?? null, source: response?.source || "PLANNED_ROUTE_INPUT" });
      setMessage("Planlanan rota girdisi kaydedildi; OSRM mesafesi yeniden hesaplandı.");
      await loadStops();
      await onChanged?.(updated);
    } catch (e) {
      setError(routeError(e, "Rota girdisi kaydedilemedi."));
    } finally {
      setBusy(false);
    }
  }

  async function addStop(event) {
    event.preventDefault();
    const lat = numberOrNull(stopLat);
    const lng = numberOrNull(stopLng);
    const name = stopName.trim();
    if (!name || lat == null || lng == null) {
      setError("Durak adı, enlem ve boylam zorunlu.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await api(`/api/shifts/${shiftId}/stops`, {
        token,
        method: "POST",
        body: { name, lat, lng, type: "MANUAL" },
      });
      const updated = response?.shift || null;
      setStopName("");
      setStopLat("");
      setStopLng("");
      setMessage("Durak kaydedildi; planlanan rota yeniden hesaplandı.");
      if (updated) setRouteSnapshot({ distanceM: updated.routeSnapshotDistanceM ?? null, source: "PLANNED_ROUTE_INPUT" });
      await loadStops();
      await onChanged?.(updated);
    } catch (e) {
      setError(routeError(e, "Durak kaydedilemedi."));
    } finally {
      setBusy(false);
    }
  }

  async function removeStop(stopId) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await api(`/api/shifts/${shiftId}/stops/${Number(stopId)}`, { token, method: "DELETE" });
      const updated = response?.shift || null;
      setMessage("Durak kaldırıldı; planlanan rota yeniden hesaplandı.");
      if (updated) setRouteSnapshot({ distanceM: updated.routeSnapshotDistanceM ?? null, source: "PLANNED_ROUTE_INPUT" });
      await loadStops();
      await onChanged?.(updated);
    } catch (e) {
      setError(routeError(e, "Durak kaldırılamadı."));
    } finally {
      setBusy(false);
    }
  }

  if (!shiftId) return null;

  return (
    <section className="card" data-testid="route-evidence-editor" style={{ marginTop: 12 }}>
      <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0 }}>Eksik bilgiyi tamamla — Seçili vardiya</h3>
          <div className="muted" style={{ marginTop: 5 }}>
            Rota ve durak kaydı taşımacılık firması kapsamındadır. Yolcu/personel bağlantısı hizmet alan firma kullanıcısı tarafından yapılır.
          </div>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {returnPath ? <button type="button" className="btn sm primary" onClick={() => navigate(returnPath)}>Finans hesabına dön</button> : null}
          <button type="button" className="btn sm" onClick={onClose}>Kapat</button>
        </div>
      </div>

      {error ? <div className="roomInlineNotice roomInlineNotice--error" role="alert" style={{ marginTop: 10 }}>{error}</div> : null}
      {message ? <div className="roomInlineNotice roomInlineNotice--info" role="status" style={{ marginTop: 10 }}>{message}</div> : null}

      <form onSubmit={saveRouteEvidence} className="grid" style={{ marginTop: 12 }}>
        <div className="col">
          <label className="muted">Yön</label>
          <select value={direction} onChange={(e) => setDirection(e.target.value)} disabled={busy}>
            <option value="INBOUND">Toplama → Toplanma Konumu</option>
            <option value="OUTBOUND">Toplanma Konumu → Dağıtım</option>
          </select>
        </div>
        <div className="col">
          <label className="muted">Rota tipi</label>
          <select value={pattern} onChange={(e) => setPattern(e.target.value)} disabled={busy}>
            <option value="ONE_WAY">Tek yön</option>
            <option value="LOOP">Döngü</option>
          </select>
        </div>
        <div className="col">
          <label className="muted">Toplanma enlem</label>
          <input value={hubLat} onChange={(e) => setHubLat(e.target.value)} placeholder="41.0..." disabled={busy} inputMode="decimal" />
        </div>
        <div className="col">
          <label className="muted">Toplanma boylam</label>
          <input value={hubLng} onChange={(e) => setHubLng(e.target.value)} placeholder="29.0..." disabled={busy} inputMode="decimal" />
        </div>
        <div className="col" style={{ gridColumn: "1 / -1", display: "flex", alignItems: "end" }}>
          <button type="submit" className="btn primary" disabled={busy}>{busy ? "Kaydediliyor..." : "Rota planını kaydet"}</button>
        </div>
      </form>

      <details className="card" style={{ marginTop: 12 }} data-testid="empty-distance-completion">
        <summary>Yakıt hesabı için boş kilometreyi tamamla (isteğe bağlı)</summary>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>
          Bu bilgi yalnız yakıt veya rota maliyeti hesabını etkilediğinde gereklidir. Gelir-gider farkı ve diğer kârlılık sonuçları boş kilometre yok diye bloke edilmez.
        </div>
        <div className="grid" style={{ marginTop: 10 }}>
          <div className="col">
            <label className="muted">Boş kilometre</label>
            <input value={emptyDistanceKm} onChange={(e) => setEmptyDistanceKm(e.target.value)} placeholder="Örn. 12,5" disabled={busy} inputMode="decimal" />
          </div>
          <div className="col">
            <label className="muted">Kaynak</label>
            <input value={emptyDistanceEvidenceRef} onChange={(e) => setEmptyDistanceEvidenceRef(e.target.value)} placeholder="Sefer/rota kaydı" disabled={busy} />
          </div>
          <div className="col" style={{ gridColumn: "1 / -1" }}>
            <label className="muted">Kısa gerekçe</label>
            <input value={emptyDistanceReason} onChange={(e) => setEmptyDistanceReason(e.target.value)} placeholder="Örn. Garajdan alma mesafesi rota kaydında doğrulandı" disabled={busy} />
          </div>
        </div>
      </details>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <strong>Duraklar ({stopCountLabel})</strong>
          <span className="muted" data-testid="route-evidence-distance">
            {routeSnapshot.distanceM == null ? "Planlanan mesafe bekliyor" : `Planlanan yol ağı mesafesi: ${(Number(routeSnapshot.distanceM) / 1000).toFixed(2)} km`}
          </span>
        </div>
        <div className="muted" style={{ marginTop: 5, fontSize: 12 }}>
            Bu mesafe planlanan rota kanıtıdır; gerçek sürüş veya GPS kanıtı değildir. En az iki geçerli nokta olmadan mesafe hesaplanmaz.
        </div>
        {loading ? <div className="muted" style={{ marginTop: 10 }}>Duraklar yükleniyor…</div> : null}
        {!loading && !stops.length ? <div className="muted" style={{ marginTop: 10 }}>Henüz kayıtlı durak yok.</div> : null}
        {stops.length ? (
          <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
            {stops.map((stop, index) => (
              <div key={stop.id} className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <span>{index + 1}. {stop.name} <span className="muted">({Number(stop.lat).toFixed(5)}, {Number(stop.lng).toFixed(5)})</span></span>
                <button type="button" className="btn sm" disabled={busy} onClick={() => removeStop(stop.id)}>Kaldır</button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <form onSubmit={applyRouteTemplate} className="card" style={{ marginTop: 12 }} data-testid="route-evidence-template-bridge">
        <div className="panelSectionTitle">Kayıtlı rota planından tamamla</div>
        <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
          Aynı taşımacılık firmasına ait kayıtlı bir planı seçerek bu vardiyanın duraklarını tamamlayabilirsin. Seçim otomatik uygulanmaz; boş kilometre ve gerçek sürüş kanıtı ayrıca doğrulanmalıdır.
        </div>
        {routeTemplates.length ? (
          <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: "wrap" }}>
            <label className="muted" style={{ flex: "1 1 240px" }}>
              Rota planı
              <select
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
                disabled={busy}
                data-testid="route-evidence-template-select"
                style={{ display: "block", width: "100%", marginTop: 4 }}
              >
                <option value="">Rota planı seçin</option>
                {routeTemplates.map((template) => (
                  <option key={template.id} value={template.id}>{getReadableRouteTemplateLabel(template)}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn primary" disabled={busy || !selectedTemplateId} data-testid="route-evidence-apply-template">
              {busy ? "Uygulanıyor..." : "Seçili rota planını uygula"}
            </button>
          </div>
        ) : (
          <div className="muted" style={{ marginTop: 10 }}>Bu firma için kayıtlı rota planı bulunamadı. Rota ve durakları aşağıdaki formdan yetkili kullanıcı girmeli.</div>
        )}
      </form>

      <form onSubmit={addStop} className="grid" style={{ marginTop: 12 }}>
        <div className="col" style={{ gridColumn: "1 / -1" }}>
          <label className="muted">Durak adı</label>
          <input value={stopName} onChange={(e) => setStopName(e.target.value)} placeholder="Örn. DemoCompanyB ana giriş" disabled={busy} />
        </div>
        <div className="col">
          <label className="muted">Durak enlem</label>
          <input value={stopLat} onChange={(e) => setStopLat(e.target.value)} placeholder="41.0..." disabled={busy} inputMode="decimal" />
        </div>
        <div className="col">
          <label className="muted">Durak boylam</label>
          <input value={stopLng} onChange={(e) => setStopLng(e.target.value)} placeholder="29.0..." disabled={busy} inputMode="decimal" />
        </div>
        <div className="col" style={{ display: "flex", alignItems: "end" }}>
          <button type="submit" disabled={busy}>{busy ? "Kaydediliyor..." : "Durak ekle"}</button>
        </div>
      </form>
    </section>
  );
}
