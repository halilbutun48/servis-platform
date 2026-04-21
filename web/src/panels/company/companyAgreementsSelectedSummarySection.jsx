import ListSelectionBanner from "../../components/ListSelectionBanner";
import { agreementExtendStatusPillLabel, agreementStatusPillLabel, agreementStatusText } from "../../utils/agreementLabels";

export function CompanyAgreementShiftSummary({ st }) {
  const tTot = Number(st?.todayTotal ?? 0);
  const tDone = Number(st?.todayDone ?? 0);
  const h = Number(st?.horizonOpen ?? 0);
  return (
    <div className="muted" style={{ lineHeight: 1.2 }}>
      <div>Bugün: {tTot ? (tDone + "/" + tTot + " tamamlandı") : "-"}</div>
      <div>Ufuk: {h ? (h + " kabul edildi") : "-"}</div>
    </div>
  );
}

export function CompanyAgreementStatusPill({ status }) {
  const s = String(status || "").toUpperCase();
  return (
    <span className="pill" data-status={s} title={agreementStatusText(s)}>
      {agreementStatusPillLabel(s)}
    </span>
  );
}

export function CompanyAgreementExtendPill({ extendStatus, requestedEndDate }) {
  const s = String(extendStatus || "NONE").toUpperCase();
  if (s === "NONE" || !s) return null;

  const label = agreementExtendStatusPillLabel(s);
  const date = String(requestedEndDate || "").slice(0, 10);
  return (
    <span className="pill" data-status={s} title={date ? `${label} → ${date}` : label} style={{ marginLeft: 8 }}>
      {date ? `${label} (${date})` : label}
    </span>
  );
}

export default function CompanyAgreementsSelectedSummarySection({
  selectedLabel = "",
  selectedSummary = "",
  visibleCount = 0,
  totalCount = 0,
  filterValue = "",
  onClearFilter,
}) {
  return (
    <ListSelectionBanner
      selectedLabel={selectedLabel}
      selectedSummary={selectedSummary}
      visibleCount={visibleCount}
      totalCount={totalCount}
      filterValue={filterValue}
      onClearFilter={onClearFilter}
      helper="Copilot seçili sözleşmeyi kullanır."
    />
  );
}
