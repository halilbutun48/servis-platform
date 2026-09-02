import React from "react";

export default function ListSelectionBanner({
  selectedLabel = "",
  selectedSummary = "",
  visibleCount = 0,
  totalCount = 0,
  filterValue = "",
  onClearFilter = null,
  helper = "Sefer Abi seçili kaydı kullanır.",
}) {
  const hasSelection = String(selectedLabel || "").trim();
  const hasSummary = String(selectedSummary || "").trim() && String(selectedSummary || "").trim() !== String(selectedLabel || "").trim();
  const hasFilter = String(filterValue || "").trim();

  return (
    <div className="listSelectionBanner">
      <div>
        <div className="listSelectionBannerTitle">
          {hasSelection ? (
            <>
              Seçili kayıt: <b>{selectedLabel}</b>
            </>
          ) : (
            "Seçili kayıt yok. Listeden bir satır veya kart seç."
          )}
        </div>
        <div className="listSelectionBannerMeta">
          Gösterilen: <b>{visibleCount}</b> / Toplam: <b>{totalCount}</b>
          {hasSummary ? <> • {selectedSummary}</> : null}
          {helper ? <> • {helper}</> : null}
        </div>
      </div>
      {hasFilter && typeof onClearFilter === "function" ? (
        <button type="button" className="btn sm ghost" onClick={onClearFilter}>
          Filtreyi Temizle
        </button>
      ) : null}
    </div>
  );
}
