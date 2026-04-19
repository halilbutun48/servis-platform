import { ProviderScoreBadge } from "../../components/ProviderScoreBadge";
import { formatTRY, offerGapMeta, roomLabel } from "./shiftsPanelOfferUtils";
import { displayStatusLabel } from "../../utils/displayStatus";

function RecommendationBadge({ reason = "" }) {
  return (
    <span
      title={reason || "Bu vardiya için otomatik öne çıktı"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 999,
        border: "1px solid rgba(83,177,253,0.35)",
        background: "rgba(83,177,253,0.12)",
        color: "#b2ddff",
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      Önerilen
    </span>
  );
}

function RecommendationReasons({ reasons = [] }) {
  if (!Array.isArray(reasons) || !reasons.length) return null;
  return (
    <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 8 }}>
      {reasons.slice(0, 3).map((reason, idx) => (
        <span
          key={`${reason}-${idx}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid rgba(83,177,253,0.20)",
            background: "rgba(83,177,253,0.08)",
            color: "#d6efff",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {reason}
        </span>
      ))}
    </div>
  );
}

export function OfferSignalPill({ label, value, tone = "neutral" }) {
  const palette =
    tone === "good"
      ? { border: "1px solid rgba(18,183,106,0.35)", background: "rgba(18,183,106,0.10)", color: "#d1fadf" }
      : tone === "warn"
      ? { border: "1px solid rgba(242,153,74,0.35)", background: "rgba(242,153,74,0.10)", color: "#fbd5a5" }
      : { border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", color: "#d0d5dd" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
        ...palette,
      }}
    >
      <span style={{ opacity: 0.82 }}>{label}</span>
      <span>{value}</span>
    </span>
  );
}

export function CompanyOfferDecisionCard({
  offer,
  fallbackShiftId,
  packageSize,
  roomScore,
  busy,
  counterState,
  onOpenPreview,
  onAcceptOffer,
  onAcceptOfferPackage,
  onSetOfferCounter,
  onCounterOffer,
  onCounterPackage,
}) {
  const offerStatus = String(offer.status || "").toUpperCase();
  const canAccept = offerStatus === "COUNTERED";
  const gap = offerGapMeta(offer.amountCompany, offer.amountRoom);
  const note = String(offer.noteRoom || offer.noteCompany || "").trim();
  const isRecommended = !!offer.__recommended;
  const recommendationReason = String(offer.__recommendationReason || "").trim();
  const recommendationShort = String(offer.__recommendationShort || recommendationReason || "").trim();
  const recommendationReasons = Array.isArray(offer.__recommendationReasons) ? offer.__recommendationReasons : [];
  const isClosed = offerStatus === "ACCEPTED" || offerStatus === "CANCELLED";

  return (
    <div
      className="card"
      style={{
        border: isRecommended
          ? "1px solid rgba(83,177,253,0.40)"
          : canAccept
          ? "1px solid rgba(242,153,74,0.35)"
          : "1px solid rgba(255,255,255,0.08)",
        background: isRecommended
          ? "linear-gradient(180deg, rgba(83,177,253,0.10), rgba(255,255,255,0.02))"
          : canAccept
          ? "rgba(242,153,74,0.07)"
          : "rgba(255,255,255,0.02)",
        boxShadow: isRecommended ? "0 0 0 1px rgba(83,177,253,0.08) inset" : "none",
      }}
    >
      <div className="row" style={{ justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 800 }}>
            {offer.room ? `${roomLabel(offer.room)} (#${offer.room.id})` : `Room #${offer.roomId}`}
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {isRecommended ? <RecommendationBadge reason={recommendationReason} /> : null}
            <ProviderScoreBadge score={roomScore || null} prominent showLabel />
            <span className="pill" data-status={offerStatus}>{displayStatusLabel(offerStatus)}</span>
            <OfferSignalPill label="Karar" value={canAccept ? "Verilebilir" : "Beklemede"} tone={canAccept ? "warn" : "neutral"} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn sm" disabled={busy} onClick={() => onOpenPreview(Number(offer.shiftId || fallbackShiftId || 0))}>
            Harita / Navigasyon Önizle
          </button>
          <button type="button" disabled={busy || !canAccept} onClick={() => onAcceptOffer(offer.id)}>
            {isRecommended ? "Önerileni Kabul Et" : "Kabul Et"}
          </button>
          {packageSize > 1 ? (
            <button
              type="button"
              disabled={busy || !canAccept}
              title={`Pakete uygula (${packageSize} shift)`}
              onClick={() => onAcceptOfferPackage(offer.roomId)}
            >
              {isRecommended ? "Önerileni Pakete Uygula" : "Paketi Kabul Et"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <OfferSignalPill label="Company" value={offer.amountCompany != null ? `${formatTRY(offer.amountCompany)} ₺` : "-"} tone="neutral" />
        <OfferSignalPill label="Room" value={offer.amountRoom != null ? `${formatTRY(offer.amountRoom)} ₺` : "-"} tone={canAccept ? "warn" : "neutral"} />
        <OfferSignalPill label={gap.label} value={gap.value} tone={gap.tone} />
      </div>

      <RecommendationReasons reasons={isRecommended ? recommendationReasons : []} />
      <div className="muted" style={{ marginTop: 8 }}>{gap.note}</div>
      {isRecommended ? (
        <div className="muted" style={{ marginTop: 6, color: "#b2ddff" }}>
          <b>Neden önerildi?</b> {recommendationShort || recommendationReason || "Bu vardiya için otomatik öne çıktı."}
        </div>
      ) : null}
      {note ? (
        <div className="muted" style={{ marginTop: 4 }} title={note}>
          <b>Not:</b> {note}
        </div>
      ) : null}

      {!isClosed ? (
        <div className="card" style={{ marginTop: 10, border: "1px dashed rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.01)" }}>
          <div className="muted" style={{ marginBottom: 6 }}>
            {packageSize > 1 ? "Bu room için pakete karşı teklif ver." : "Bu teklif için company karşı teklif ver."}
          </div>
          <div className="row" style={{ gap: 8, alignItems: "end", flexWrap: "wrap" }}>
            <div className="col" style={{ minWidth: 160 }}>
              <label className="muted">Company Karşı Teklif (₺)</label>
              <input
                value={counterState?.amountCompany ?? ""}
                onChange={(e) => onSetOfferCounter(offer.id, { amountCompany: e.target.value })}
                placeholder="örn 12500"
                disabled={busy}
              />
            </div>
            <div className="col" style={{ flex: 1, minWidth: 220 }}>
              <label className="muted">Not</label>
              <input
                value={counterState?.noteCompany ?? ""}
                onChange={(e) => onSetOfferCounter(offer.id, { noteCompany: e.target.value })}
                placeholder="opsiyonel"
                disabled={busy}
              />
            </div>
            <button type="button" disabled={busy} onClick={() => (packageSize > 1 ? onCounterPackage(offer) : onCounterOffer(offer))}>
              {packageSize > 1 ? "Pakete Karşı Teklif Ver" : "Karşı Teklif Ver"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CompanyVehicleDetailGrid({ data, fmtTR, vehicleMetaLine }) {
  return (
    <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
      <div><b>Plaka:</b> {data?.plate || "-"}</div>
      <div><b>Tip / Model:</b> {vehicleMetaLine(data) || "-"}</div>
      <div><b>Durum:</b> {data?.status || "-"}</div>
      <div><b>Kapasite:</b> {Number.isFinite(data?.capacity) ? `${data.capacity} koltuk` : "-"}</div>
      <div><b>KM:</b> {Number.isFinite(data?.odometerKm) ? `${data.odometerKm} km` : "-"}</div>
      <div><b>Hız limiti:</b> {Number.isFinite(data?.speedLimitKmh) ? `${data.speedLimitKmh} km/s` : "-"}</div>
      <div><b>Renk:</b> {data?.color || "-"}</div>
      <div><b>Son km güncelleme:</b> {data?.odometerUpdatedAt ? fmtTR(data.odometerUpdatedAt) : "-"}</div>
      <div><b>Not:</b> {data?.note || "-"}</div>
    </div>
  );
}

export function CompanyDriverDetailGrid({ data }) {
  return (
    <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
      <div><b>Ad Soyad:</b> {data?.fullName || "-"}</div>
      <div><b>Telefon:</b> {data?.phone || "-"}</div>
      <div><b>E-posta:</b> {data?.user?.email || "-"}</div>
      <div><b>Cihaz:</b> {data?.deviceInfo || "-"}</div>
      <div><b>Bağlı araç:</b> {data?.currentVehiclePlate || "-"}</div>
    </div>
  );
}

export function CompanyOfferRoomCard({ room, selected, score, onToggle }) {
  return (
    <label className="muted" style={{
      display: "grid",
      gap: 8,
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.06)",
      background: selected ? "rgba(18,183,106,0.05)" : "rgba(255,255,255,0.02)",
      marginBottom: 8,
    }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", justifyContent: "space-between" }}>
        <span style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            style={{ marginTop: 4 }}
          />
          <span style={{ display: "grid", gap: 4 }}>
            <span>
              <b>{roomLabel(room)}</b> (#{room.id})
            </span>
            <span className="muted">{room?.hubLat != null && room?.hubLng != null ? "Hub konumu hazır" : "Hub yok"}</span>
          </span>
        </span>
        <ProviderScoreBadge score={score} prominent showLabel />
      </div>
    </label>
  );
}
