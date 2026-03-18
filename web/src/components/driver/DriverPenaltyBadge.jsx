export default function DriverPenaltyBadge({ item }) {
  if (!item?.isActive && !item?.activePenalty && !item?.effectiveStatus) return null;
  const active = item?.isActive || item?.activePenalty || item?.effectiveStatus === 'ACTIVE';
  return (
    <span className="pill" data-status={active ? "REJECTED" : "DONE"} title={active ? "Aktif gelmedi kaydı var" : "Geçmiş gelmedi kaydı"} style={{ marginLeft: 8 }}>
      {active ? "Gelmedi kaydı" : "Geçmiş kayıt"}
    </span>
  );
}
