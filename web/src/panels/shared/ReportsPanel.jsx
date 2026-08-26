import { useEffect, useMemo, useState } from "react";
import { useSession } from "../../state/session";
import { formatDateTimeTR, ymdTR } from "../../utils/time";
import { cachedGet } from "../../utils/uiDataCache";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { includesFilter, rowSelectionStyle } from "../../utils/listUi";
import ListSelectionBanner from "../../components/ListSelectionBanner";
import PanelChrome from "../../components/PanelChrome";
import { roleLabelForUser } from "../../utils/labels";
import { displayStatusLabel } from "../../utils/displayStatus";

const TABS = [
  ["shifts", "Vardiyalar"],
  ["drivers", "Sürücüler"],
  ["vehicles", "Araçlar"],
  ["stops", "Duraklar"],
];

const EMPTY_FILTERS = {
  shifts: {},
  drivers: {},
  vehicles: {},
  stops: {},
};

const NON_SHIFT_LABELS = {
  drivers: {
    driverId: "Sürücü ID",
    driverName: "Sürücü",
    totalAssigned: "Toplam Atama",
    totalCompleted: "Tamamlanan",
    totalCancelled: "İptal / Reddedilen",
    noShowCount: "Gelmedi",
    activePenalty: "Aktif Ceza",
  },
  vehicles: {
    vehicleId: "Araç ID",
    plate: "Plaka",
    shiftCount: "Vardiya Sayısı",
    personelCount: "Toplam Personel",
    avgRequiredPax: "Ort. Gerekli Kapasite",
    maxRequiredPax: "Maks. Gerekli Kapasite",
  },
  stops: {
    stopId: "Durak ID",
    stopName: "Durak",
    shiftCount: "Vardiya Sayısı",
    passengerCount: "Toplam Yolcu",
  },
};

const SHIFT_COLUMNS = [
  ["id", "ID"],
  ["status", "Durum"],
  ["companyName", "Hizmet Alan Firma"],
  ["roomName", "Taşımacılık Firması"],
  ["vehiclePlate", "Araç"],
  ["driverName", "Sürücü"],
  ["startAt", "Başlangıç"],
  ["endAt", "Bitiş"],
  ["direction", "Yön"],
  ["pattern", "Rota düzeni"],
  ["stopCount", "Durak"],
  ["personCount", "Kişi"],
  ["requiredPax", "Gerekli Kapasite"],
  ["splitTotal", "Paket"],
  ["createdAt", "Oluşturma"],
];

const DIRECTION_LABELS = {
  INBOUND: "Toplama",
  OUTBOUND: "Dağıtım",
};

const PATTERN_LABELS = {
  ONE_WAY: "Tek yön",
  ROUND_TRIP: "Gidiş-dönüş",
};

function reportEnumLabel(value, labels, fallback = "-") {
  const key = String(value || "").trim().toUpperCase();
  return labels[key] || (key ? String(value) : fallback);
}

function fmtDateInput(d) {
  return ymdTR(d);
}

function fmtCellDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return formatDateTimeTR(d);
}

function normalizeShiftRows(rows) {
  return rows.map((row) => ({
    id: row.id,
    status: row.status ? displayStatusLabel(row.status) : "-",
    companyName: row.company?.name || (row.companyId ? `#${row.companyId}` : "-"),
    roomName: row.room?.name || (row.roomId ? `#${row.roomId}` : "-"),
    vehiclePlate: row.vehicle?.plate || "-",
    driverName: row.driver?.fullName || "-",
    startAt: fmtCellDate(row.startAt),
    endAt: fmtCellDate(row.endAt),
    direction: reportEnumLabel(row.direction, DIRECTION_LABELS),
    pattern: reportEnumLabel(row.pattern, PATTERN_LABELS),
    stopCount: Array.isArray(row.stops) ? row.stops.length : 0,
    personCount: Array.isArray(row.people) ? row.people.length : 0,
    requiredPax: Math.max(Number(row.requiredPaxOverride || 0), Array.isArray(row.people) ? row.people.length : 0, 0),
    splitTotal: Number(row.splitTotal || 0) || "-",
    createdAt: fmtCellDate(row.createdAt),
  }));
}

function buildSelectedSummary(headers, row) {
  return headers.slice(0, 4).map(({ key, label }) => `${label}: ${String(row?.[key] ?? "-")}`).join(" • ");
}

export default function ReportsPanel() {
  const { token, me } = useSession();
  const [tab, setTab] = useState("shifts");
  const [from, setFrom] = useState(fmtDateInput(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [to, setTo] = useState(fmtDateInput(new Date()));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState({});
  const [selectedRowKey, setSelectedRowKey] = useState("");
  const [filterQ, setFilterQ] = useState("");
  const [columnFiltersByTab, setColumnFiltersByTab] = useState(EMPTY_FILTERS);

  async function load(activeTab = tab, signal) {
    setLoading(true);
    setErr("");
    try {
      const q = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const json = await cachedGet(`/api/reports/${activeTab}/summary${q}`, { token, ttlMs: 25000, signal, delayMs: 260 });
      if (signal?.aborted) return;
      setData((p) => ({ ...p, [activeTab]: json }));
    } catch (e) {
      if (e?.name !== "AbortError") setErr("Raporlar şu anda okunamadı. Tarih aralığını genişletip tekrar deneyin.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) load(tab, controller.signal);
    }, 420);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [tab, from, to, token]); // eslint-disable-line

  const rawRows = useMemo(() => (Array.isArray(data?.[tab]?.rows) ? data[tab].rows : []), [data, tab]);
  const rows = useMemo(() => (tab === "shifts" ? normalizeShiftRows(rawRows) : rawRows), [tab, rawRows]);
  const headers = useMemo(() => {
    if (tab === "shifts") return SHIFT_COLUMNS.map(([key, label]) => ({ key, label }));
    const tabLabels = NON_SHIFT_LABELS[tab] || {};
    return rows.length
      ? Object.keys(rows[0]).map((key) => ({ key, label: tabLabels[key] || key }))
      : [];
  }, [tab, rows]);

  const currentColumnFilters = useMemo(() => (columnFiltersByTab?.[tab] || {}), [columnFiltersByTab, tab]);
  const hasColumnFilter = useMemo(
    () => Object.values(currentColumnFilters).some((value) => String(value || "").trim()),
    [currentColumnFilters],
  );

  const base = me?.role === "ROOM"
    ? "/room"
    : me?.companyKind === "SCHOOL"
      ? "/school"
      : me?.companyKind === "ORGANIZATION"
        ? "/organization"
        : "/company";

  const filteredRows = useMemo(() => rows.filter((row, idx) => {
    if (!includesFilter([
      tab,
      row?.id,
      ...headers.map(({ key }) => row?.[key]),
      idx,
    ], filterQ)) {
      return false;
    }
    return headers.every(({ key }) => includesFilter(row?.[key], currentColumnFilters?.[key] || ""));
  }), [rows, headers, filterQ, tab, currentColumnFilters]);

  const selectedRow = useMemo(
    () => filteredRows.find((row, idx) => String(selectedRowKey || "") === String(row?.id || idx)) || null,
    [filteredRows, selectedRowKey],
  );

  const wideDataTab = tab === "shifts";
  const tableMinWidth = wideDataTab
    ? Math.max(headers.length * 160, 1900)
    : Math.max(headers.length * 180, 1100);
  const tableWrapClassName = wideDataTab ? "reportsTableWrap reportsTableWrap--shifts" : "reportsTableWrap";

  function setColumnFilterValue(key, value) {
    setColumnFiltersByTab((prev) => ({
      ...prev,
      [tab]: {
        ...(prev?.[tab] || {}),
        [key]: value,
      },
    }));
  }

  function clearColumnFilters(activeTab = tab) {
    setColumnFiltersByTab((prev) => ({
      ...prev,
      [activeTab]: {},
    }));
  }

  useEffect(() => {
    const scopeKey = `${base}/reports`;
    if (!selectedRow) {
      clearCopilotSelection(scopeKey);
      return;
    }
    const rowLabel = tab === "shifts"
      ? `Rapor satırı #${selectedRow.id || "-"}`
      : `${TABS.find(([k]) => k === tab)?.[1] || "Rapor"} satırı`;
    setCopilotSelection({
      scopeKey,
      entityType: "screen",
      entityId: Number(selectedRow?.id || 2116) || 2116,
      label: rowLabel,
      summary: buildSelectedSummary(headers, selectedRow),
      fields: headers.slice(0, 6).map(({ key, label }) => ({
        label,
        value: String(selectedRow?.[key] ?? "-"),
        help: "Seçili rapor satırındaki özet bilgiyi gösterir.",
      })),
      facts: {
        screenType: "REPORTS",
        stage: String(tab || "").toUpperCase(),
        nextBestAction: "Önce bu satırın neyi saydığını oku. Sonra ilgili ekranı açarak aynı kaydı operasyon tarafından doğrula.",
      },
      badges: [{
        label: "Sekme",
        value: TABS.find(([k]) => k === tab)?.[1] || "-",
        help: "Seçili satırın hangi rapor sekmesinde olduğunu gösterir.",
      }],
    });
    return () => clearCopilotSelection(scopeKey);
  }, [base, headers, selectedRow, tab]);

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <PanelChrome
        title="Raporlar"
        subtitle="Operasyon özeti ve CSV dışa aktarma"
      >
        <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", minWidth: 0 }}>
            {TABS.map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={tab === k ? "btn primary" : "btn"}
                onClick={() => {
                  setTab(k);
                  setSelectedRowKey("");
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", alignItems: "end", minWidth: 0 }}>
            <div>
              <label className="panelMeta">Genel filtre</label>
              <input value={filterQ} onChange={(e) => setFilterQ(e.target.value)} placeholder="Satır içinde ara" style={{ width: "100%" }} />
            </div>
            <div>
              <label className="panelMeta">Başlangıç</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div>
              <label className="panelMeta">Bitiş</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
              <button className="btn" onClick={() => { setSelectedRowKey(""); load(tab); }} disabled={loading}>Yenile</button>
              {(tab === "shifts" || tab === "drivers") ? (
                <a className="btn" href={`/api/reports/${tab}/export.csv?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`} target="_blank" rel="noreferrer">
                  CSV indir
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </PanelChrome>
      {err ? <div className="card err" style={{ minWidth: 0 }}>{err}</div> : null}
      <div className="card" style={{ minWidth: 0 }}>
        <div className="panelMeta">Rol: {roleLabelForUser(me)} • Ekran: {base}/reports</div>
        <ListSelectionBanner
          selectedLabel={selectedRow ? `${TABS.find(([k]) => k === tab)?.[1] || "Rapor"} satırı` : ""}
          selectedSummary={selectedRow ? buildSelectedSummary(headers, selectedRow) : ""}
          visibleCount={filteredRows.length}
          totalCount={Number(data?.[tab]?.total || rows.length || 0)}
          filterValue={filterQ}
          onClearFilter={() => setFilterQ("")}
          helper={hasColumnFilter ? "Genel filtreye ek olarak sütun filtreleri de aktif." : "Copilot seçili rapor satırını kullanır."}
        />
      </div>
      <div className="card reportsCard" style={{ minWidth: 0 }}>
        {loading ? <div>Yükleniyor...</div> : filteredRows.length ? (
          <div className={tableWrapClassName} style={{ minWidth: 0 }}>
            <table className="tbl reportsTable" style={{ minWidth: `${tableMinWidth}px`, width: wideDataTab ? "max-content" : "100%" }}>
              <thead>
                <tr>
                  {headers.map(({ key, label }) => (
                    <th key={key} style={{ whiteSpace: "nowrap", verticalAlign: "bottom" }}>{label}</th>
                  ))}
                </tr>
                <tr>
                  {headers.map(({ key, label }) => (
                    <th key={`${key}-filter`} style={{ whiteSpace: "nowrap", paddingTop: 6, paddingBottom: 6 }}>
                      <input
                        value={currentColumnFilters?.[key] || ""}
                        onChange={(e) => setColumnFilterValue(key, e.target.value)}
                        placeholder={`${label} filtre`}
                        style={{ minWidth: 110, width: "100%" }}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => {
                  const rowKey = String(row?.id || idx);
                  const isSelected = String(selectedRowKey || "") === rowKey;
                  return (
                    <tr key={rowKey} onClick={() => setSelectedRowKey(rowKey)} style={rowSelectionStyle(isSelected)}>
                      {headers.map(({ key }) => (
                        <td key={key} style={{ whiteSpace: "nowrap" }}>
                          {typeof row[key] === "boolean" ? (row[key] ? "Evet" : "Hayır") : String(row[key] ?? "")}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="muted">
            {rows.length
              ? (
                <>
                  Filtreye uyan satır yok. Aramayı biraz gevşet, sütun filtrelerini temizle veya Yenile ile tekrar dene.
                  {(filterQ || hasColumnFilter) ? (
                    <button className="btn" style={{ marginLeft: 10 }} onClick={() => { setFilterQ(""); clearColumnFilters(); }}>
                      Filtreleri temizle
                    </button>
                  ) : null}
                </>
              )
              : "Bu tarih aralığında kayıt yok. Tarihi genişlet, sekmeyi değiştir veya Yenile ile tekrar dene."}
          </div>
        )}
      </div>
    </div>
  );
}
