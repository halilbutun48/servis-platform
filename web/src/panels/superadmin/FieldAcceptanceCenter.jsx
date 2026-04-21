import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import PanelKvkkHint from "../shared/PanelKvkkHint";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { displayStatusLabel } from "../../utils/displayStatus";
import PanelChrome from "../../components/PanelChrome";

const CHECKLIST_STATUS_OPTIONS = ["PASS", "PENDING", "BLOCKED", "DONE"];

function Card({ title, children }) {
  return (
    <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, flex: "1 1 280px" }}>
      <div className="panelSectionTitle" style={{ marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function formatTR(iso) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  return date.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function unwrapManifest(payload) {
  return payload?.manifest || payload || null;
}

function unwrapSession(payload) {
  return payload?.session || payload?.currentSession || payload || null;
}

function cloneChecklist(items) {
  return Array.isArray(items) ? items.map((item) => ({ ...item })) : [];
}

function cloneSession(session) {
  if (!session) return null;
  return { ...session, checklist: cloneChecklist(session.checklist) };
}

function normalizeChecklistStatus(value) {
  return String(value || "PENDING").trim().toUpperCase() || "PENDING";
}

function getChecklist(session, manifest) {
  const fromSession = Array.isArray(session?.checklist) ? session.checklist : [];
  if (fromSession.length) return fromSession;
  return Array.isArray(manifest?.checklist) ? cloneChecklist(manifest.checklist) : [];
}

function getFirstPending(checklist) {
  return checklist.find((item) => normalizeChecklistStatus(item?.status) !== "PASS") || checklist[0] || null;
}

function summaryScore(total, passCount) {
  if (!total) return 40;
  return Math.max(38, Math.min(100, Math.round((passCount / total) * 100)));
}

function updateChecklistItem(session, itemId, key, value, manifest) {
  const baseChecklist = Array.isArray(session?.checklist) && session.checklist.length
    ? session.checklist
    : cloneChecklist(manifest?.checklist);
  return {
    ...(session || {}),
    checklist: baseChecklist.map((item) => {
      if (String(item?.id || "") !== String(itemId || "")) return item;
      return { ...item, [key]: value };
    }),
  };
}

export default function FieldAcceptanceCenter() {
  const [manifest, setManifest] = useState(null);
  const [session, setSession] = useState(null);
  const [err, setErr] = useState("");
  const [sessionBusy, setSessionBusy] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [checklistBusyId, setChecklistBusyId] = useState("");

  const load = async () => {
    setErr("");
    try {
      const [m, s] = await Promise.all([
        api("/api/field-acceptance/manifest"),
        api("/api/field-acceptance/session"),
      ]);
      setManifest(unwrapManifest(m));
      setSession(cloneSession(unwrapSession(s)));
    } catch (e) {
      setErr(e?.message || String(e));
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, s] = await Promise.all([
          api("/api/field-acceptance/manifest"),
          api("/api/field-acceptance/session"),
        ]);
        if (cancelled) return;
        setManifest(unwrapManifest(m));
        setSession(cloneSession(unwrapSession(s)));
      } catch (e) {
        if (cancelled) return;
        setErr(e?.message || String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const checklist = useMemo(() => getChecklist(session, manifest), [session, manifest]);
  const totalChecklist = checklist.length;
  const passChecklist = checklist.filter((item) => normalizeChecklistStatus(item?.status) === "PASS").length;
  const pendingChecklist = checklist.filter((item) => normalizeChecklistStatus(item?.status) !== "PASS");
  const firstPending = getFirstPending(checklist);
  const decisionValue = String(session?.decision || "LIMITED_GO").trim().toUpperCase() || "LIMITED_GO";
  const riskNote = String(session?.decisionReason || session?.note || "").trim();
  const currentSessionId = session?.sessionId || "-";
  const currentSessionCreatedBy = session?.createdByEmail || "-";
  const currentSessionUpdatedBy = session?.updatedByEmail || "-";

  useEffect(() => {
    if (!manifest && !session) {
      clearCopilotSelection("/superadmin/acceptance");
      return;
    }

    const readinessScore = summaryScore(totalChecklist, passChecklist);
    const facts = {
      screenType: "FIELD_ACCEPTANCE",
      stage: decisionValue,
      readiness: pendingChecklist.length === 0 && decisionValue === "GO" ? "READY" : "REVIEW_NEEDED",
      readinessScore,
      blockers: pendingChecklist.length > 0 ? ["Checklist içinde henüz PASS olmayan maddeler var."] : [],
      counters: { checklist: totalChecklist, pending: pendingChecklist.length, decision: decisionValue },
      evidence: [
        `Karar: ${decisionValue}`,
        `Checklist: ${totalChecklist}`,
        `Bekleyen: ${pendingChecklist.length}`,
        firstPending?.label ? `İlk açık madde: ${firstPending.label}` : "",
      ].filter(Boolean),
      reasoningLead: "Bu ekranda amaç sahaya çıkmadan önce checklist, karar ve oturum bilgisini aynı yerde görmektir.",
      nextBestAction: firstPending?.label
        ? `Önce ${firstPending.label} maddesini PASS yap.`
        : "Karar alanını ve oturum bilgisini son kez doğrula.",
      safestNextStep: "En risksiz adım, önce PASS olmayan maddeleri kapatıp kabul kararını en son vermektir.",
      compareHint: "Checklist PASS olması ile kabul kararının GO olması aynı şey değildir; ikisi birlikte okunmalıdır.",
    };

    setCopilotSelection({
      scopeKey: "/superadmin/acceptance",
      entityType: "screen",
      entityId: 6108,
      label: firstPending?.label || "Saha kabul özeti",
      summary: [
        currentSessionId !== "-" ? currentSessionId : null,
        decisionValue,
        totalChecklist ? `${totalChecklist} madde` : null,
        pendingChecklist.length ? `${pendingChecklist.length} bekleyen` : "hepsi PASS",
      ].filter(Boolean).join(" • "),
      fields: [
        { label: "Session", value: currentSessionId, help: "Tek currentSession kaydının kimliğini gösterir." },
        { label: "Karar", value: decisionValue, help: "Test oturumu için seçilen kabul kararını gösterir." },
        { label: "Checklist", value: String(totalChecklist), help: "Toplam checklist maddesi sayısını gösterir." },
        { label: "Bekleyen", value: String(pendingChecklist.length), help: "Henüz PASS olmayan checklist maddesi sayısını gösterir." },
        { label: "Cihaz", value: session?.deviceModel || "-", help: "Test oturumunda kullanılan cihaz modelini gösterir." },
        { label: "Build", value: session?.buildProfile || "-", help: "Test edilen mobil build profilini gösterir." },
        { label: "Oluşturan", value: currentSessionCreatedBy, help: "Tek currentSession kaydını oluşturan kullanıcıyı gösterir." },
        { label: "Güncelleyen", value: currentSessionUpdatedBy, help: "Tek currentSession kaydını son güncelleyen kullanıcıyı gösterir." },
        { label: "İlk Açık Madde", value: firstPending?.label || "-", help: "Henüz tamamlanmamış ilk checklist maddesini gösterir." },
      ],
      badges: [
        { label: "Alan", value: firstPending?.area || "-", help: "Açık checklist maddesinin ait olduğu alanı gösterir." },
        { label: "Oturum", value: currentSessionId, help: "Aktif saha kabul oturumunun kimliğini gösterir." },
      ],
      facts,
    });

    return () => clearCopilotSelection("/superadmin/acceptance");
  }, [manifest, session, currentSessionId, currentSessionCreatedBy, currentSessionUpdatedBy, decisionValue, firstPending, pendingChecklist.length, passChecklist, totalChecklist]);

  const setSessionField = (key, value) => {
    setSession((prev) => ({ ...(prev || {}), [key]: value }));
  };

  const setChecklistField = (itemId, key, value) => {
    setSession((prev) => updateChecklistItem(prev, itemId, key, value, manifest));
  };

  const createSession = async () => {
    if (sessionBusy) return;
    setSessionBusy(true);
    setErr("");
    try {
      const saved = await api("/api/field-acceptance/session", {
        method: "POST",
        body: session || { checklist: cloneChecklist(manifest?.checklist) },
      });
      setSession(cloneSession(unwrapSession(saved)));
    } finally {
      setSessionBusy(false);
    }
  };

  const saveSession = async () => {
    if (sessionBusy) return;
    setSessionBusy(true);
    setErr("");
    try {
      const saved = await api("/api/field-acceptance/session", {
        method: "PUT",
        body: session || { checklist: cloneChecklist(manifest?.checklist) },
      });
      setSession(cloneSession(unwrapSession(saved)));
    } finally {
      setSessionBusy(false);
    }
  };

  const saveDecision = async () => {
    if (decisionBusy) return;
    setDecisionBusy(true);
    setErr("");
    try {
      const saved = await api("/api/field-acceptance/session/decision", {
        method: "PATCH",
        body: {
          decision: session?.decision,
          decisionReason: session?.decisionReason,
        },
      });
      setSession(cloneSession(unwrapSession(saved)));
    } finally {
      setDecisionBusy(false);
    }
  };

  const saveChecklistItem = async (item) => {
    if (checklistBusyId || !item?.id) return;
    setChecklistBusyId(item.id);
    setErr("");
    try {
      const saved = await api(`/api/field-acceptance/session/checklist/${item.id}`, {
        method: "PATCH",
        body: {
          status: item.status,
          note: item.note,
        },
      });
      setSession(cloneSession(unwrapSession(saved)));
    } finally {
      setChecklistBusyId("");
    }
  };

  const loadError = err ? <div style={{ marginTop: 12, color: "#ff7b7b", whiteSpace: "pre-wrap" }}>{err}</div> : null;
  const sessionId = session?.sessionId || "-";
  const createdAt = session?.createdAt || "-";
  const updatedAt = session?.updatedAt || "-";

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <PanelChrome
        title="Saha Kabul Merkezi"
        subtitle="Sahaya çıkmadan önce kabul kararı, checklist durumu ve test oturumu özetini toplar."
        actions={(
          <>
            <button className="btn" onClick={createSession} disabled={sessionBusy || decisionBusy || checklistBusyId}>Yeni oturum oluştur</button>
            <button className="btn" onClick={saveSession} disabled={sessionBusy || decisionBusy || checklistBusyId}>Oturumu kaydet</button>
            <button className="btn" onClick={load} disabled={sessionBusy || decisionBusy || checklistBusyId}>Yenile</button>
          </>
        )}
      />

      {loadError}

      <PanelKvkkHint panelKey="fieldAcceptance" />

      <Card title="Canlı oturum">
        <div className="panelMeta">
          Tek currentSession kaydı buradan okunur; create, kaydet, karar ve checklist güncellemeleri aynı kaydı besler.
        </div>
        <div style={{ marginTop: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
          <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
            <div className="panelMeta">Session ID</div>
            <div className="panelBody" style={{ marginTop: 4 }}>{currentSessionId}</div>
          </div>
          <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
            <div className="panelMeta">Oluşturuldu</div>
            <div className="panelBody" style={{ marginTop: 4 }}>{formatTR(createdAt)}</div>
          </div>
          <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
            <div className="panelMeta">Güncellendi</div>
            <div className="panelBody" style={{ marginTop: 4 }}>{formatTR(updatedAt)}</div>
          </div>
          <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
            <div className="panelMeta">Karar</div>
            <div className="panelBody" style={{ marginTop: 4 }}>{decisionValue}</div>
          </div>
          <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
            <div className="panelMeta">Oluşturan</div>
            <div className="panelBody" style={{ marginTop: 4 }}>{currentSessionCreatedBy}</div>
          </div>
          <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
            <div className="panelMeta">Güncelleyen</div>
            <div className="panelBody" style={{ marginTop: 4 }}>{currentSessionUpdatedBy}</div>
          </div>
        </div>
        <div className="panelMeta" style={{ marginTop: 10 }}>
          Bu üst bant live currentSession snapshot'ıdır; manifest varsayılanları aşağıdaki kartlarda ayrı gösterilir.
        </div>
      </Card>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Varsayılanlar / manifest: karar seçenekleri">
          <div className="panelMeta">{(manifest?.decisions || []).join(", ") || "Henüz karar seçeneği yok"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Bu kart manifest varsayılanlarını gösterir; canlı karar currentSession içindedir.</div>
        </Card>
        <Card title="Varsayılanlar / manifest: checklist özeti">
          <div>{totalChecklist} madde</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            {(manifest?.checklist || []).slice(0, 3).map((item) => item.label).join(" • ") || "Henüz checklist maddesi yok"}
          </div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Bu kart manifest seed'ini gösterir; canlı durum currentSession checklist'inden okunur.</div>
        </Card>
        <Card title="Canlı currentSession özeti">
          <div>Karar: {session?.decision || "-"}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Cihaz: {session?.deviceModel || "-"} • Build: {session?.buildProfile || "-"} • Not: {riskNote || "-"}
          </div>
          <div className="panelMeta" style={{ marginTop: 6 }}>Bu kart currentSession snapshot'ının kısa özetidir.</div>
        </Card>
        <Card title="CurrentSession provenance">
          <div>{currentSessionId}</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Oluşturuldu: {formatTR(createdAt)} • Güncellendi: {formatTR(updatedAt)}
          </div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Oluşturan: {currentSessionCreatedBy} • Güncelleyen: {currentSessionUpdatedBy}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <Card title="Karar kaydı">
          <div className="muted">GO / LIMITED_GO / NO_GO kararını sahici state'e yazar.</div>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <select className="input" value={session?.decision || "LIMITED_GO"} onChange={(e) => setSessionField("decision", e.target.value)}>
              {(manifest?.decisions || ["GO", "LIMITED_GO", "NO_GO"]).map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Karar nedeni"
              value={session?.decisionReason || ""}
              onChange={(e) => setSessionField("decisionReason", e.target.value)}
            />
            <textarea
              className="input"
              rows={3}
              placeholder="Ek not"
              value={session?.note || ""}
              onChange={(e) => setSessionField("note", e.target.value)}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
            <div className="muted">Karar: {session?.decision || "-"} • currentSession kaydına yazılır</div>
            <button className="btn" onClick={saveDecision} disabled={decisionBusy}>
              {decisionBusy ? "Kaydediliyor..." : "Kararı kaydet"}
            </button>
          </div>
        </Card>

        <Card title="Oturum bilgisi">
          <div className="muted">Saha kabul currentSession kaydının kimlik ve cihaz alanları.</div>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <input className="input" value={sessionId} readOnly />
            <input className="input" placeholder="Sürücü etiketi" value={session?.driverLabel || ""} onChange={(e) => setSessionField("driverLabel", e.target.value)} />
            <input className="input" placeholder="Cihaz modeli" value={session?.deviceModel || ""} onChange={(e) => setSessionField("deviceModel", e.target.value)} />
            <input className="input" placeholder="OS sürümü" value={session?.osVersion || ""} onChange={(e) => setSessionField("osVersion", e.target.value)} />
            <input className="input" placeholder="Build profili" value={session?.buildProfile || ""} onChange={(e) => setSessionField("buildProfile", e.target.value)} />
            <input className="input" placeholder="Test eden kişi" value={session?.testerLabel || ""} onChange={(e) => setSessionField("testerLabel", e.target.value)} />
            <input className="input" type="number" min="0" placeholder="Kanıt sayısı" value={session?.evidenceCount ?? 0} onChange={(e) => setSessionField("evidenceCount", Number(e.target.value || 0))} />
          </div>
          <div className="panelMeta" style={{ marginTop: 10 }}>
            Bu alanlar sahadaki currentSession kaydının tek kayıt üzerinden korunmasına yardımcı olur.
          </div>
        </Card>
      </div>

      <div className="card" style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div className="panelSectionTitle">Checklist güncelleme</div>
          <div className="muted">
            {passChecklist}/{totalChecklist} PASS • {pendingChecklist.length} bekleyen
          </div>
        </div>
        {checklist.length > 0 ? checklist.map((item, idx) => {
          const status = normalizeChecklistStatus(item?.status);
          const busy = checklistBusyId === item.id;
          return (
            <div key={item.id || idx} className="card" style={{ display: "grid", gap: 10, padding: 12, borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div className="panelSectionTitle">{item.label}</div>
                  <div className="panelMeta" style={{ marginTop: 6 }}>Alan: {item.area || "genel"}</div>
                </div>
                <div className="pill">{displayStatusLabel(status)}</div>
              </div>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                <select
                  className="input"
                  value={status}
                  onChange={(e) => setChecklistField(item.id, "status", e.target.value)}
                >
                  {CHECKLIST_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <input
                  className="input"
                  placeholder="Kısa not"
                  value={item.note || ""}
                  onChange={(e) => setChecklistField(item.id, "note", e.target.value)}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div className="muted">Güncelleme: {item.updatedAt || "-"} • currentSession checklist alanı</div>
                <button className="btn" onClick={() => saveChecklistItem(item)} disabled={busy}>
                  {busy ? "Kaydediliyor..." : "Maddeyi güncelle"}
                </button>
              </div>
            </div>
          );
        }) : (
          <div className="muted">Henüz checklist maddesi yok.</div>
        )}
      </div>
    </div>
  );
}
