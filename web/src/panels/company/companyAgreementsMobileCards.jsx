import CommercialReadonlySummary from "../../components/CommercialReadonlySummary";
import { rowSelectionStyle } from "../../utils/listUi";
import { toHHMM, weekMaskToText } from "../../utils/agreementUi";
import { ymdTR } from "../../utils/time";
import {
  CompanyAgreementExtendPill,
  CompanyAgreementShiftSummary,
  CompanyAgreementStatusPill,
} from "./companyAgreementsSelectedSummarySection";

function stopCardClick(event) {
  event.stopPropagation();
}

function moneyTry(value) {
  if (value == null || value === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `${new Intl.NumberFormat("tr-TR").format(n)} ₺`;
}

function daysLeftYmd(ymd) {
  if (!ymd || String(ymd).length < 10) return null;
  const end = new Date(String(ymd).slice(0, 10) + "T23:59:59.999+03:00");
  const diff = end.getTime() - Date.now();
  const d = Math.ceil(diff / 86400000);
  return Number.isFinite(d) ? d : null;
}

function Field({ label, value, wide = false }) {
  return (
    <div className={`shiftCardField${wide ? " shiftCardField--wide" : ""}`}>
      <div className="shiftCardFieldLabel">{label}</div>
      <div className="shiftCardFieldValue">{value}</div>
    </div>
  );
}

function CardSection({ title, children }) {
  return (
    <div className="shiftCardSection" onClick={stopCardClick}>
      <div className="shiftCardSectionTitle">{title}</div>
      {children}
    </div>
  );
}

function ActionGroup({ title, note = null, children }) {
  return (
    <div className="shiftCardSection shiftActionGroup" onClick={stopCardClick}>
      <div className="shiftCardSectionTitle">{title}</div>
      <div className="shiftCardActions">{children}</div>
      {note ? <div className="shiftCardActionNote">{note}</div> : null}
    </div>
  );
}

function CardShell({ selected, children, onClick }) {
  return (
    <article
      className="card shiftCard shiftMobileCard companyAgreementsMobileCard"
      style={{ ...rowSelectionStyle(selected), overflow: "visible" }}
      onClick={onClick}
    >
      {children}
    </article>
  );
}

function CompanyAgreementMobileCard({
  agreement,
  room,
  selected,
  sourceShiftId = 0,
  shiftStats = null,
  busy = false,
  canRouteRefresh = false,
  hasPendingRouteRefresh = false,
  routeRefreshActionLabel = "Rota Güncelle",
  onSelectAgreement,
  onAcceptCounter,
  onRejectCounter,
  onAskCompanyCounter,
  onCancelAgreement,
  onAcceptExtendCounter,
  onRejectExtendCounter,
  onExtendByDays,
  onAskExtend,
  onStartRouteRefresh,
}) {
  if (!agreement) return null;

  const agreementId = Number(agreement?.id || 0);
  const status = String(agreement?.status || "").toUpperCase();
  const extendStatus = String(agreement?.extendStatus || "NONE").toUpperCase();
  const roomText = room ? `${room.name} (#${room.id})` : agreement?.roomId ? `#${agreement.roomId}` : "-";
  const startText = ymdTR(agreement?.startDate);
  const endText = ymdTR(agreement?.endDate);
  const daysLeft = daysLeftYmd(agreement?.endDate);
  const companyOfferText = moneyTry(agreement?.companyOfferAmount);
  const roomOfferText = moneyTry(agreement?.roomOfferAmount);
  const routeRefreshState = hasPendingRouteRefresh
    ? "Bekleyen rota güncellemesi var"
    : canRouteRefresh
      ? "Rota güncelleme açık"
      : "Rota kökü yok";
  const cancelDisabled = busy || ["CANCELLED", "DONE", "REJECTED"].includes(status);
  const extendActionLocked = busy || extendStatus === "COUNTERED";
  const routeRefreshDisabled = busy || hasPendingRouteRefresh || !canRouteRefresh;
  const actionNote = [
    !canRouteRefresh ? "Rota güncelleme için kaynak vardiya bağlantısı gerekir." : null,
    hasPendingRouteRefresh ? "Bu sözleşmede rota güncelleme talebi bekliyor." : null,
    extendStatus === "COUNTERED" ? "Uzatma karşı teklifi bekliyor." : null,
  ].filter(Boolean).join(" ");

  return (
    <CardShell selected={selected} onClick={() => onSelectAgreement?.(agreementId)}>
      <div className="shiftCardHeader">
        <div className="shiftCardHeaderMain">
          <div className="shiftCardTitleRow">
            <div className="shiftCardTitle">Sözleşme #{agreementId}</div>
            <CompanyAgreementStatusPill status={agreement?.status} />
            <CompanyAgreementExtendPill extendStatus={agreement?.extendStatus} requestedEndDate={agreement?.extendRequestedEndDate} />
          </div>
          <div className="shiftCardSubtle" style={{ marginTop: 4 }}>
            {roomText}
            {sourceShiftId ? ` • Kaynak vardiya #${sourceShiftId}` : ""}
          </div>
        </div>
        <span className="shiftCardSelectionHint" data-selected={selected ? "true" : "false"}>
          {selected ? "Seçili" : "Kart"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span className="pill" title="Çalışma günleri">{weekMaskToText(agreement?.weekMask) || "-"}</span>
        <span className="pill" title="Saat aralığı">{toHHMM(agreement?.startMin)} → {toHHMM(agreement?.endMin)}</span>
        <span className="pill" title="Yön / pattern">{String(agreement?.direction || "-").toUpperCase()} / {String(agreement?.pattern || "-").toUpperCase()}</span>
        {Number.isFinite(daysLeft) ? <span className="pill" title="Kalan gün">Kalan {daysLeft}g</span> : null}
        <span className="pill" title="Rota güncelleme durumu">{routeRefreshState}</span>
      </div>

      <div className="shiftCardMetaGrid shiftMetaGrid">
        <Field label="Oda" value={roomText} wide />
        <Field
          label="Tarih"
          value={(
            <div className="shiftCardValueStack">
              <div>{startText} → {endText}</div>
              {Number.isFinite(daysLeft) ? <div className="shiftCardSubtle">Kalan {daysLeft} gün</div> : null}
            </div>
          )}
          wide
        />
        <Field label="Günler" value={weekMaskToText(agreement?.weekMask) || "-"} />
        <Field label="Saat" value={`${toHHMM(agreement?.startMin)} → ${toHHMM(agreement?.endMin)}`} />
        <Field label="Yön / plan" value={`${String(agreement?.direction || "-").toUpperCase()} / ${String(agreement?.pattern || "-").toUpperCase()}`} />
      </div>

      <CardSection title="Teklif özeti">
        <div className="shiftCardInfoBlock">
          <div className="shiftCardInfoRow">
            <div className="shiftCardInfoTitle">Şirket teklifi</div>
            <span className="pill" title="Şirket teklif tutarı">{companyOfferText}</span>
          </div>
          <div className="shiftCardSubtle">Oda karşı teklifi: <b>{roomOfferText}</b></div>
          {agreement?.companyOfferNote ? <div className="shiftCardSubtle">Şirket notu: {agreement.companyOfferNote}</div> : null}
          {agreement?.roomOfferNote ? <div className="shiftCardSubtle">Oda notu: {agreement.roomOfferNote}</div> : null}
        </div>
      </CardSection>

      <CardSection title="Vardiya durumu">
        <CompanyAgreementShiftSummary st={shiftStats} />
        <div className="shiftCardSubtle" style={{ marginTop: 6 }}>
          {routeRefreshState}
        </div>
      </CardSection>

      <CardSection title="Ödeme / hakediş">
        <CommercialReadonlySummary item={agreement?.commercialBackbone} compact />
      </CardSection>

      <ActionGroup title="Karar" note={status !== "COUNTERED" ? "Aktif karşı teklif yok." : null}>
        {status === "COUNTERED" ? (
          <>
            <button type="button" className="btn sm primary" disabled={busy} onClick={(e) => { e.stopPropagation(); onAcceptCounter?.(agreementId); }}>
              Kabul Et
            </button>
            <button type="button" className="btn sm" disabled={busy} onClick={(e) => { e.stopPropagation(); onAskCompanyCounter?.(agreement); }}>
              Yeni Teklif Gönder
            </button>
            <button type="button" className="btn sm" disabled={busy} onClick={(e) => { e.stopPropagation(); onRejectCounter?.(agreementId); }}>
              Reddet
            </button>
          </>
        ) : null}
      </ActionGroup>

      <ActionGroup title="Operasyon / uzatma" note={actionNote || null}>
        <button
          type="button"
          className="btn sm"
          disabled={routeRefreshDisabled}
          title={!canRouteRefresh ? "Rota güncelleme için kaynak vardiya bağlantısı gerekir." : hasPendingRouteRefresh ? "Bekleyen rota güncelleme talebi var." : "Rota güncelleme başlat."}
          onClick={(e) => {
            e.stopPropagation();
            onStartRouteRefresh?.(agreement, room);
          }}
        >
          {routeRefreshActionLabel}
        </button>
        <button
          type="button"
          className="btn sm"
          disabled={cancelDisabled}
          title={cancelDisabled ? "İptal için kayıt aktif olmalı." : "Sözleşmeyi iptal et."}
          onClick={(e) => {
            e.stopPropagation();
            onCancelAgreement?.(agreementId);
          }}
        >
          İptal Et
        </button>

        {extendStatus === "COUNTERED" ? (
          <>
            <button type="button" className="btn sm" disabled={busy} onClick={(e) => { e.stopPropagation(); onAcceptExtendCounter?.(agreementId); }}>
              Uzatma Karşı Teklifini Kabul Et
            </button>
            <button type="button" className="btn sm" disabled={busy} onClick={(e) => { e.stopPropagation(); onRejectExtendCounter?.(agreementId); }}>
              Uzatma Karşı Teklifini Reddet
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn sm" disabled={extendActionLocked} onClick={(e) => { e.stopPropagation(); onExtendByDays?.(agreement, 7); }}>
              Uzat +7g
            </button>
            <button type="button" className="btn sm" disabled={extendActionLocked} onClick={(e) => { e.stopPropagation(); onExtendByDays?.(agreement, 30); }}>
              Uzat +30g
            </button>
            <button type="button" className="btn sm" disabled={extendActionLocked} onClick={(e) => { e.stopPropagation(); onAskExtend?.(agreement); }}>
              Tarih...
            </button>
          </>
        )}
      </ActionGroup>
    </CardShell>
  );
}

export default function CompanyAgreementsMobileCards({
  rows = [],
  selectedAgreementId = 0,
  shiftStats = {},
  agreementOrigins = {},
  busy = false,
  canRouteRefresh,
  hasPendingRouteRefresh,
  routeRefreshActionLabel,
  onSelectAgreement,
  onAcceptCounter,
  onRejectCounter,
  onAskCompanyCounter,
  onCancelAgreement,
  onAcceptExtendCounter,
  onRejectExtendCounter,
  onExtendByDays,
  onAskExtend,
  onStartRouteRefresh,
}) {
  if (!Array.isArray(rows) || !rows.length) {
    return <div className="muted">Filtreye uyan sözleşme yok.</div>;
  }

  return (
    <div className="mobileShiftCards shiftsMobileCards companyAgreementsMobileCards">
      {rows.map(({ a, room }) => {
        const agreementId = Number(a?.id || 0);
        const origin = agreementOrigins?.[String(agreementId)] || null;
        return (
          <CompanyAgreementMobileCard
            key={agreementId}
            agreement={a}
            room={room}
            selected={Number(selectedAgreementId || 0) === agreementId}
            sourceShiftId={Number(origin?.sourceShiftId || 0)}
            shiftStats={shiftStats?.[agreementId] || null}
            busy={busy}
            canRouteRefresh={typeof canRouteRefresh === "function" ? canRouteRefresh(a, origin) : false}
            hasPendingRouteRefresh={typeof hasPendingRouteRefresh === "function" ? hasPendingRouteRefresh(agreementId) : false}
            routeRefreshActionLabel={typeof routeRefreshActionLabel === "function" ? routeRefreshActionLabel(agreementId) : "Rota Güncelle"}
            onSelectAgreement={onSelectAgreement}
            onAcceptCounter={onAcceptCounter}
            onRejectCounter={onRejectCounter}
            onAskCompanyCounter={onAskCompanyCounter}
            onCancelAgreement={onCancelAgreement}
            onAcceptExtendCounter={onAcceptExtendCounter}
            onRejectExtendCounter={onRejectExtendCounter}
            onExtendByDays={onExtendByDays}
            onAskExtend={onAskExtend}
            onStartRouteRefresh={onStartRouteRefresh}
          />
        );
      })}
    </div>
  );
}
