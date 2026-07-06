import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";
import { useSession } from "../../state/session";
import { includesFilter, rowSelectionStyle } from "../../utils/listUi";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { displayStatusLabel } from "../../utils/displayStatus";
import { buildOperationHealthCopilotFacts } from "../../utils/copilotFacts";
import PanelSegmentTabs from "../../components/PanelSegmentTabs";
import RoomOperationsBoard from "./roomOperationsBoard";
import OperationProofMiniCard from "../../components/OperationProofMiniCard";
import { boardingChangeApplySuccessNote } from "../shared/boardingChangeUi";
import { cachedGet } from "../../utils/uiDataCache";

const ENTRY_HINT_KEY = "room:operationHealthHint";

function badgeStyle(kind, value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (kind === "live") {
    if (normalized === "LIVE") return { color: "#d1fadf", background: "rgba(18,183,106,0.16)", border: "1px solid rgba(18,183,106,0.45)" };
    if (normalized === "STALE") return { color: "#fedf89", background: "rgba(247,144,9,0.16)", border: "1px solid rgba(247,144,9,0.45)" };
    if (normalized === "OFFLINE") return { color: "#fecdca", background: "rgba(240,68,56,0.12)", border: "1px solid rgba(240,68,56,0.35)" };
  }
  if (kind === "session") {
    if (normalized === "OK") return { color: "#d1fadf", background: "rgba(18,183,106,0.16)", border: "1px solid rgba(18,183,106,0.45)" };
    if (normalized === "REFRESH_NEEDED") return { color: "#fedf89", background: "rgba(247,144,9,0.16)", border: "1px solid rgba(247,144,9,0.45)" };
  }
  if (kind === "permission") {
    if (normalized === "GRANTED") return { color: "#d1fadf", background: "rgba(18,183,106,0.16)", border: "1px solid rgba(18,183,106,0.45)" };
    if (normalized === "DENIED" || normalized === "UNKNOWN") return { color: "#fedf89", background: "rgba(247,144,9,0.16)", border: "1px solid rgba(247,144,9,0.45)" };
  }
  if (kind === "severity") {
    if (normalized === "HIGH") return { color: "#fecdca", background: "rgba(240,68,56,0.12)", border: "1px solid rgba(240,68,56,0.35)" };
    if (normalized === "MEDIUM") return { color: "#fedf89", background: "rgba(247,144,9,0.16)", border: "1px solid rgba(247,144,9,0.45)" };
    if (normalized === "LOW") return { color: "#b2ddff", background: "rgba(83,177,253,0.12)", border: "1px solid rgba(83,177,253,0.35)" };
  }
  return { color: "#d0d5dd", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" };
}

function StatusBadge({ kind, value }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
        ...badgeStyle(kind, value),
      }}
    >
      {displayStatusLabel(value)}
    </span>
  );
}

function MetricCard({ title, value, note }) {
  return (
    <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, flex: "1 1 180px" }}>
      <div className="muted" style={{ marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 800 }}>{value}</div>
      {note ? <div className="muted" style={{ marginTop: 8 }}>{note}</div> : null}
    </div>
  );
}

function buildGuideHint(title, detail, extras = {}) {
  return {
    source: "ROOM_OPERATION_HEALTH",
    title: String(title || "Operasyon sağlığı uyarısı"),
    detail: String(detail || ""),
    fromPath: "/room/operation-health",
    ...extras,
  };
}

function operationRouteKeyFromItem(item = {}) {
  if (String(item.sessionState || "") === "REFRESH_NEEDED") return "ROOM_DRIVERS";
  if (String(item.permissionState || "") !== "GRANTED") return "ROOM_DRIVERS";
  if (["STALE", "OFFLINE"].includes(String(item.liveState || ""))) return "ROOM_MAP";
  return "ROOM_COPILOT";
}

function issueRouteKey(issue = {}) {
  const title = String(issue.title || "").toLowerCase();
  if (title.includes("oturum")) return "ROOM_DRIVERS";
  if (title.includes("izin")) return "ROOM_DRIVERS";
  if (title.includes("canlılık") || title.includes("konum")) return "ROOM_MAP";
  return "ROOM_COPILOT";
}

function openRoomCopilotWithHint(hint) {
  try {
    sessionStorage.setItem(ENTRY_HINT_KEY, JSON.stringify(hint));
  } catch { /* no-op: session storage may be unavailable */ }
  navigate("/room/copilot");
}

function DriverRow({ item, selected, onSelect }) {
  const issueText = String(item.issueSummary || "").trim();
  return (
    <tr onClick={() => onSelect?.(item)} style={rowSelectionStyle(selected)}>
      <td>{item.driverName}</td>
      <td>{item.vehiclePlate}</td>
      <td><StatusBadge kind="live" value={item.liveState} /></td>
      <td>{item.gpsReliabilityScore ?? "-"}</td>
      <td>{item.lastGpsAt || "-"}</td>
      <td><StatusBadge kind="permission" value={item.permissionState || "-"} /></td>
      <td><StatusBadge kind="session" value={item.sessionState || "-"} /></td>
      <td>
        <div>{issueText || "-"}</div>
        {issueText ? (
          <button
            type="button"
            style={{ marginTop: 8 }}
            onClick={(e) => {
              e.stopPropagation();
              openRoomCopilotWithHint(
                buildGuideHint(
                  item.driverName ? `${item.driverName} için durum özeti` : "Sürücü durum özeti",
                  issueText,
                  {
                    driverId: item.driverId || item.id || null,
                    driverName: item.driverName,
                    vehicleId: item.vehicleId || null,
                    vehiclePlate: item.vehiclePlate,
                    liveState: item.liveState,
                    sessionState: item.sessionState,
                    permissionState: item.permissionState,
                    suggestedRouteKey: operationRouteKeyFromItem(item),
                  }
                )
              );
            }}
          >
            Rehberde aç
          </button>
        ) : null}
      </td>
    </tr>
  );
}

export default function OperationHealthPanel() {
  const { token } = useSession();
  const [summary, setSummary] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [roomOperations, setRoomOperations] = useState(null);
  const [filterQ, setFilterQ] = useState("");
  const [driverStatusFilter, setDriverStatusFilter] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState(0);
  const [selectedIssueKey, setSelectedIssueKey] = useState("");
  const [activeTab, setActiveTab] = useState("summary");
  const [applyingRequestId, setApplyingRequestId] = useState(null);
  const [applyNotice, setApplyNotice] = useState("");

  const refreshRoomState = useCallback(async ({ force = false } = {}) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [s, d, i] = await Promise.all([
        cachedGet("/api/observability/room/summary", { token, force, ttlMs: 10 * 60 * 1000, delayMs: 120 }),
        cachedGet("/api/observability/room/drivers", { token, force, ttlMs: 10 * 60 * 1000, delayMs: 120 }),
        cachedGet("/api/observability/room/issues", { token, force, ttlMs: 10 * 60 * 1000, delayMs: 120 }),
      ]);
      const [driverSignals, shiftSummary, vehicleSummary, driverSummary, requestsResp] = await Promise.all([
        cachedGet("/api/drivers?take=200", { token, force, ttlMs: 10 * 60 * 1000, delayMs: 120 }).catch(() => []),
        cachedGet(`/api/reports/shifts/summary?from=${encodeURIComponent(today)}&to=${encodeURIComponent(today)}`, { token, force, ttlMs: 10 * 60 * 1000, delayMs: 120 }).catch(() => null),
        cachedGet(`/api/reports/vehicles/summary?from=${encodeURIComponent(today)}&to=${encodeURIComponent(today)}`, { token, force, ttlMs: 10 * 60 * 1000, delayMs: 120 }).catch(() => null),
        cachedGet(`/api/reports/drivers/summary?from=${encodeURIComponent(today)}&to=${encodeURIComponent(today)}`, { token, force, ttlMs: 10 * 60 * 1000, delayMs: 120 }).catch(() => null),
        cachedGet("/api/requests", { token, force, ttlMs: 10 * 60 * 1000, delayMs: 120 }).catch(() => []),
      ]);
      setSummary(s || null);
      setDrivers(Array.isArray(d?.items) ? d.items : []);
      setIssues(Array.isArray(i?.items) ? i.items : []);
      setRoomOperations({
        driverSignals: Array.isArray(driverSignals) ? driverSignals : [],
        shiftSummary: shiftSummary || null,
        vehicleSummary: vehicleSummary || null,
        driverSummary: driverSummary || null,
        requests: Array.isArray(requestsResp?.items) ? requestsResp.items : Array.isArray(requestsResp) ? requestsResp : [],
      });
    } catch (error) {
      console.error(error);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    refreshRoomState();
  }, [token, refreshRoomState]);

  const handleApplyAcceptedRequest = useCallback(async (requestId) => {
    const id = Number(requestId || 0);
    if (!id) return;
    setApplyingRequestId(id);
    setApplyNotice("");
    try {
      const result = await api(`/api/requests/${id}/apply-boarding-change`, { token, method: "POST" });
      setApplyNotice(result?.applicationBoundaryNote || result?.applicationText || boardingChangeApplySuccessNote());
      await refreshRoomState({ force: true });
    } catch (error) {
      console.error(error);
    } finally {
      setApplyingRequestId(null);
    }
  }, [refreshRoomState, token]);

  const statusOptions = useMemo(() => {
    return Array.from(
      new Set(
        drivers
          .map((item) => String(item?.liveState || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "tr"));
  }, [drivers]);

  const filteredDrivers = useMemo(() => drivers.filter((item) => {
    if (!includesFilter([
      item?.id, item?.driverName, item?.vehiclePlate, item?.liveState, item?.issueSummary, item?.permissionState, item?.sessionState,
    ], filterQ)) return false;
    if (String(driverStatusFilter || "").trim()) {
      return String(item?.liveState || "").trim().toUpperCase() === String(driverStatusFilter || "").trim().toUpperCase();
    }
    return true;
  }), [drivers, filterQ, driverStatusFilter]);
  const filteredIssues = useMemo(() => issues.filter((item) => includesFilter([
    item?.title, item?.detail, item?.severity,
  ], filterQ)), [issues, filterQ]);
  const copilotDriver = useMemo(() => filteredDrivers.find((item) => Number(item?.driverId || item?.id || 0) === Number(selectedDriverId || 0)) || filteredDrivers[0] || null, [filteredDrivers, selectedDriverId]);
  const copilotIssue = useMemo(() => filteredIssues.find((item, idx) => `${idx}:${item?.title || ''}` === String(selectedIssueKey || '')) || filteredIssues[0] || null, [filteredIssues, selectedIssueKey]);
  const facts = useMemo(() => buildOperationHealthCopilotFacts({
    summary,
    copilotDriver,
    copilotIssue,
  }), [summary, copilotDriver, copilotIssue]);

  useEffect(() => {
    setCopilotSelection({
      scopeKey: '/room/operation-health',
      entityType: 'screen',
      entityId: 1114,
      label: copilotIssue?.title || copilotDriver?.driverName || 'Operasyon sağlığı özeti',
      summary: [copilotDriver?.liveState || null, copilotDriver?.issueSummary || null, copilotIssue?.severity || null].filter(Boolean).join(' • '),
      fields: [
        { label: 'Aktif Sürücü', value: String(summary?.cards?.activeDrivers ?? '-'), help: 'Room içinde şu an görünen aktif sürücü sayısını gösterir.' },
        { label: 'Riskli Cihaz', value: String(summary?.cards?.riskyDevices ?? '-'), help: 'İzin, oturum veya GPS riski taşıyan cihaz sayısını gösterir.' },
        { label: 'Düşük canlılık / Çevrim dışı', value: String(summary?.cards?.staleOrOffline ?? '-'), help: 'Canlı konum akışı zayıf olan sürücü sayısını gösterir.' },
        { label: 'Açık Sorun', value: String(summary?.cards?.openIssues ?? '-'), help: 'Takip edilmesi gereken açık sorun sayısını gösterir.' },
        { label: 'Örnek Sürücü', value: copilotDriver?.driverName || '-', help: 'İlk riskli sürücüyü örnek odak olarak gösterir.' },
        { label: 'Örnek Sorun', value: copilotIssue?.title || '-', help: 'İlk açık sorun başlığını gösterir.' },
      ],
      badges: [
        { label: 'Canlılık', value: copilotDriver?.liveState || '-', help: 'İlk sürücünün canlılık durumunu gösterir.' },
        { label: 'Önem', value: copilotIssue?.severity || '-', help: 'İlk açık sorunun önem seviyesini gösterir.' },
      ],
      facts,
    });
    return () => clearCopilotSelection('/room/operation-health');
  }, [summary, copilotDriver, copilotIssue, facts]);

  const cards = useMemo(() => {
    const c = summary?.cards || {};
    return [
      { title: "Aktif Sürücü", value: c.activeDrivers ?? "-", note: "Kendi operasyon alanınız" },
      { title: "Riskli Cihaz", value: c.riskyDevices ?? "-", note: "İzin, oturum veya GPS sorunu" },
      { title: "Zayıf / Çevrim dışı", value: c.staleOrOffline ?? "-", note: "Son konum akışı zayıf" },
      { title: "Açık Sorun", value: c.openIssues ?? "-", note: "Takip edilmesi gereken durum" },
    ];
  }, [summary]);

  const tabs = useMemo(() => [
    {
      key: "proof",
      label: "Şartlı Küme · Kanıt / Rehber",
      badge: summary?.cards?.openIssues ?? 0,
    },
    {
      key: "summary",
      label: "Oda Operasyon Özeti",
      badge: summary?.cards?.activeDrivers ?? "-",
    },
    {
      key: "problems",
      label: "Sürücü & Sorunlar",
      badge: `${filteredDrivers.length + filteredIssues.length}`,
    },
  ], [summary, filteredDrivers.length, filteredIssues.length]);

  return (
    <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="panelTitle">Oda Operasyon Paneli</div>
            <div className="panelMeta" style={{ marginTop: 6 }}>
              Canlı Sağlık ve Risk Özeti. Özet üstte; ayrıntılar tablarda kalır.
              {/* Room için görev, servis, sürücü, araç ve biniş değişikliği görünürlüğü */}
            </div>
          </div>
          <div className="muted">Kapsam: Kendi operasyon alanınız</div>
        </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {cards.map((card) => (
            <MetricCard key={card.title} {...card} />
          ))}
        </div>
      </div>

      {applyNotice ? <div className="card" style={{ marginTop: 14, borderColor: "rgba(18, 183, 106, 0.28)", background: "rgba(18, 183, 106, 0.08)" }}>{applyNotice}</div> : null}

      <div className="card" style={{ marginTop: 14, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <div>
          <div className="muted">Filtre</div>
          <input value={filterQ} onChange={(e) => setFilterQ(e.target.value)} placeholder="Sürücü / araç / canlılık / sorun" />
        </div>
        <div className="muted">Sürücü: <b>{filteredDrivers.length}</b> / {drivers.length} • Sorun: <b>{filteredIssues.length}</b> / {issues.length}</div>
      </div>

      <PanelSegmentTabs
        ariaLabel="Oda operasyon bölümleri"
        tabs={tabs}
        value={activeTab}
        onChange={(next) => {
          setActiveTab(next);
        }}
        compact
        className="panelSegmentTabs--roomOps"
      />

      {activeTab === "proof" ? (
        <section role="tabpanel" aria-label="Şartlı Küme · Kanıt / Rehber" style={{ marginTop: 14 }}>
          <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Şartlı Küme · Kanıt / Rehber</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Operasyon kanıtı ve hızlı aksiyon köprüsü. Bu bölüm seçili değilken gizli kalır.
                </div>
              </div>
              <div className="muted">Kapanan / bekleyen aksiyonlar burada kısa okunur.</div>
            </div>

            <div style={{ marginTop: 14 }}>
              <OperationProofMiniCard
                manualNoteScopeType="SHIFT"
                manualNoteScopeId="room-operation-health"
              />
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "summary" ? (
        <section role="tabpanel" aria-label="Oda Operasyon Özeti" style={{ marginTop: 14 }}>
          <RoomOperationsBoard
            roomSummary={summary}
            roomData={roomOperations}
            onApplyAcceptedRequest={handleApplyAcceptedRequest}
            applyingRequestId={applyingRequestId}
            decisionOwnerNote="Readonly önizleme"
          />
        </section>
      ) : null}

      {activeTab === "problems" ? (
        <section role="tabpanel" aria-label="Sürücü & Sorunlar" style={{ marginTop: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.55fr) minmax(320px, 1fr)", gap: 14, alignItems: "start" }}>
            <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>Sorunlu Sürücüler / Canlılık Listesi</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    Canlılık, izin ve oturum riskleri. Ana filtreler açık; detay tablo bu görünümde toplanır.
                  </div>
                </div>
                <div className="muted">Filtreye uyan: {filteredDrivers.length}</div>
              </div>
              <div style={{ overflowX: "auto", marginTop: 14 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left" }}>
                      <th>Sürücü</th>
                      <th>Araç</th>
                      <th>Durum</th>
                      <th>GPS Skoru</th>
                      <th>Son Konum</th>
                      <th>İzin</th>
                      <th>Oturum</th>
                      <th>Özet</th>
                    </tr>
                    <tr>
                      <th></th>
                      <th></th>
                      <th>
                        <select value={driverStatusFilter} onChange={(e) => setDriverStatusFilter(e.target.value)}>
                          <option value="">Tüm durumlar</option>
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </th>
                      <th></th>
                      <th></th>
                      <th></th>
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrivers.length ? filteredDrivers.map((item) => (
                      <DriverRow key={item.id} item={item} selected={Number(selectedDriverId || 0) === Number(item?.driverId || item?.id || 0)} onSelect={(row) => setSelectedDriverId(Number(row?.driverId || row?.id || 0))} />
                    )) : (
                      <tr>
                        <td colSpan={8} className="muted" style={{ paddingTop: 12 }}>Filtreye uyan sorunlu sürücü yok.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>Açık Sorunlar</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    Sürücü ve sorunlar için takip edilmesi gereken tanı ve rehber önerileri.
                  </div>
                </div>
                <div className="muted">Filtreye uyan: {filteredIssues.length}</div>
              </div>
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {filteredIssues.length ? filteredIssues.map((issue, idx) => {
                  const issueKey = `${idx}:${issue?.title || ''}`;
                  const isSelected = String(selectedIssueKey || '') === issueKey;
                  return (
                    <div key={issueKey} onClick={() => setSelectedIssueKey(issueKey)} style={{ padding: 12, borderRadius: 12, background: isSelected ? 'rgba(61, 122, 255, 0.10)' : 'rgba(255,255,255,0.03)', outline: isSelected ? '1px solid rgba(59,130,246,.35)' : undefined, cursor: 'pointer' }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 700 }}>{issue.title}</div>
                        <StatusBadge kind="severity" value={issue.severity} />
                      </div>
                      <div className="muted" style={{ marginTop: 8 }}>{issue.detail}</div>
                      <div style={{ marginTop: 10 }}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openRoomCopilotWithHint(buildGuideHint(issue.title, issue.detail, { severity: issue.severity, suggestedRouteKey: issueRouteKey(issue) })); }}
                        >
                          Rehberde ne yapacağımı göster
                        </button>
                      </div>
                    </div>
                  );
                }) : <div className="muted">{issues.length ? 'Filtreye uyan açık sorun yok.' : 'Açık sorun yok.'}</div>}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
