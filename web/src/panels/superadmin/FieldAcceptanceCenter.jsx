import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import PanelKvkkHint from "../shared/PanelKvkkHint";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import PanelChrome from "../../components/PanelChrome";
import PanelSegmentTabs from "../../components/PanelSegmentTabs";
import { humanizeUserFacingText } from "../../utils/terminology";

const CHECKLIST_STATUS_OPTIONS = ["PASS", "PENDING", "BLOCKED", "DONE"];

function Card({ title, children }) {
  return (
    <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, flex: "1 1 280px" }}>
      <div className="panelSectionTitle" style={{ marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function TabPanel({ active, children }) {
  if (!active) return null;
  return <div style={{ minWidth: 0 }}>{children}</div>;
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

function checklistStatusLabel(value) {
  const status = normalizeChecklistStatus(value);
  return {
    PASS: "Tamamlandı",
    DONE: "Tamamlandı",
    PENDING: "Bekliyor",
    BLOCKED: "Bloklu",
  }[status] || "Kontrol gerekli";
}

function checklistItemLabel(value) {
  return String(value || "")
    .replace(/Offline toparlama anlasilir/gi, "Çevrim dışı toparlama anlaşılır")
    .replace(/Today ekrani net/gi, "Bugün ekranı net")
    .replace(/Giris akisi tamamlandi/gi, "Giriş akışı tamamlandı")
    .replace(/Ilk PIN degisimi anlasilir/gi, "İlk PIN değişimi anlaşılır")
    .replace(/GPS izin akisi net/gi, "Konum izni akışı net")
    .replace(/Surucunun telefon GPS'i yayin verdi/gi, "Sürücünün telefonundan konum paylaşımı çalışıyor")
    .replace(/KVKK blocking dili net/gi, "KVKK görünürlük dili net")
    .replace(/ETA ve sesli rehber yeterli/gi, "Tahmini varış ve sesli rehber yeterli")
    .replace(/\bPASS\b/gi, "tamamlandı")
    .replace(/\bCHECKLIST\b/gi, "kontrol listesi")
    .trim() || "Kontrol maddesi";
}

function checklistAreaLabel(value) {
  return {
    auth: "Giriş ve güvenlik",
    gps: "Konum",
    ux: "Kullanım kolaylığı",
    resilience: "Bağlantı kesintisi",
    kvkk: "KVKK",
    route: "Rota",
  }[String(value || "").trim().toLowerCase()] || "Genel";
}

function evidenceTypeLabel(value) {
  return {
    CHECKLIST_NOTE: "Kontrol listesi notu",
    DEVICE_INFO: "Cihaz bilgisi",
    BUILD_INFO: "Sürüm bilgisi",
    GPS_SAMPLE: "Konum örneği",
    SCREEN_NOTE: "Ekran notu",
    OPERATOR_NOTE: "Operatör notu",
  }[String(value || "").trim().toUpperCase()] || "Kanıt türü";
}

function decisionLabel(value) {
  return {
    GO: "Uygun",
    LIMITED_GO: "Sınırlı uygun",
    NO_GO: "Uygun değil",
  }[String(value || "").trim().toUpperCase()] || "Karar bekliyor";
}

function getChecklist(session, manifest) {
  const fromSession = Array.isArray(session?.checklist) ? session.checklist : [];
  if (fromSession.length) return fromSession;
  return Array.isArray(manifest?.checklist) ? cloneChecklist(manifest.checklist) : [];
}

function userFacingSessionId(value) {
  const text = String(value || "").trim();
  if (!text || text === "-") return "-";
  return /^M\d+-SKELETON-/i.test(text) ? "Saha kabul oturumu" : humanizeUserFacingText(text, "Saha kabul oturumu");
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
  const [activeTab, setActiveTab] = useState("overview");

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
  const riskNote = humanizeUserFacingText(String(session?.decisionReason || session?.note || "").trim(), "");
  const currentSessionId = userFacingSessionId(session?.sessionId);
  const currentSessionCreatedBy = session?.createdByEmail || "-";
  const currentSessionUpdatedBy = session?.updatedByEmail || "-";
  const sessionId = userFacingSessionId(session?.sessionId);
  const createdAt = session?.createdAt || "-";
  const updatedAt = session?.updatedAt || "-";
  const manifestDecisionOptions = Array.isArray(manifest?.decisions) ? manifest.decisions : ["GO", "LIMITED_GO", "NO_GO"];
  const manifestChecklistItems = Array.isArray(manifest?.checklist) ? manifest.checklist : [];
  const manifestEvidenceTypes = Array.isArray(manifest?.evidenceTypes) ? manifest.evidenceTypes : [];
  const checklistProgressText = `${passChecklist}/${totalChecklist} tamamlandı • ${pendingChecklist.length} bekleyen`;
  const checklistStateText = checklistItemLabel(firstPending?.label || "Tüm maddeler tamamlandı");
  const overviewNextControl = firstPending?.label
    ? `Önce “${checklistItemLabel(firstPending.label)}” maddesini tamamla.`
    : "Karar alanını ve oturum bilgisini son kez doğrula.";

  const historyEntries = useMemo(() => {
    const entries = [];
    if (currentSessionId !== "-") {
      entries.push({
        id: "session-created",
        title: "Oturum oluşturuldu",
        meta: `${formatTR(createdAt)} • ${currentSessionCreatedBy}`,
        value: currentSessionId,
        note: session?.driverLabel || "Sürücü etiketi girilmemiş",
      });
    }
    if (updatedAt && updatedAt !== createdAt) {
      entries.push({
        id: "session-updated",
        title: "Oturum güncellendi",
        meta: `${formatTR(updatedAt)} • ${currentSessionUpdatedBy}`,
        value: decisionValue,
        note: riskNote || "Karar notu kaydedilmemiş",
      });
    }
    entries.push({
      id: "decision",
      title: "Karar kaydı",
      meta: decisionValue,
      value: riskNote || "Karar notu yok",
        note: `Kontrol listesi sonucu: ${passChecklist}/${totalChecklist} tamamlandı`,
    });

    const checklistUpdates = checklist
      .filter((item) => item?.updatedAt || item?.updatedByEmail || item?.note)
      .slice()
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
      .map((item) => ({
        id: `check-${item.id}`,
        title: checklistItemLabel(item.label),
        meta: `${checklistStatusLabel(item.status)} • ${checklistAreaLabel(item.area)}`,
        value: humanizeUserFacingText(item.note, "Not yok"),
        note: item.updatedAt ? `${formatTR(item.updatedAt)} • ${item.updatedByEmail || "-"}` : "Zaman bilgisi yok",
      }));

    return [...entries, ...checklistUpdates];
  }, [
    checklist,
    createdAt,
    currentSessionCreatedBy,
    currentSessionId,
    currentSessionUpdatedBy,
    decisionValue,
    passChecklist,
    riskNote,
    totalChecklist,
    updatedAt,
    session?.driverLabel,
  ]);

  const tabs = useMemo(() => ([
    { key: "overview", label: "Özet", badge: pendingChecklist.length ? String(pendingChecklist.length) : `${passChecklist}/${totalChecklist}` },
    { key: "manifest", label: "Varsayılanlar", badge: `${manifestDecisionOptions.length}/${manifestChecklistItems.length}` },
    { key: "decision", label: "Karar kaydı", badge: decisionLabel(decisionValue) },
    { key: "session", label: "Oturum Bilgisi", badge: currentSessionId !== "-" ? "1" : "-" },
    { key: "checklist", label: "Kontrol listesi", badge: `${passChecklist}/${totalChecklist}` },
    { key: "history", label: "Geçmiş / kayıt", badge: String(historyEntries.length) },
  ]), [
    currentSessionId,
    decisionValue,
    historyEntries.length,
    manifestChecklistItems.length,
    manifestDecisionOptions.length,
    passChecklist,
    pendingChecklist.length,
    totalChecklist,
  ]);

  useEffect(() => {
    if (!manifest && !session) {
      clearCopilotSelection("/superadmin/acceptance");
      return;
    }

    const readinessScore = summaryScore(totalChecklist, passChecklist);
    const facts = {
      screenType: "FIELD_ACCEPTANCE",
      stage: decisionValue,
      readiness: pendingChecklist.length === 0 && decisionValue === "GO" ? "Hazır" : "İnceleme gerekli",
      readinessScore,
      blockers: pendingChecklist.length > 0 ? ["Kontrol listesinde henüz tamamlanmamış maddeler var."] : [],
      counters: { checklist: totalChecklist, pending: pendingChecklist.length, decision: decisionValue },
      evidence: [
        `Karar: ${decisionLabel(decisionValue)}`,
        `Kontrol listesi: ${totalChecklist}`,
        `Bekleyen: ${pendingChecklist.length}`,
        firstPending?.label ? `İlk açık madde: ${checklistItemLabel(firstPending.label)}` : "",
      ].filter(Boolean),
      reasoningLead: "Bu ekranda amaç sahaya çıkmadan önce kontrol listesi, karar ve oturum bilgisini aynı yerde görmektir.",
      nextBestAction: firstPending?.label
        ? `Önce “${checklistItemLabel(firstPending.label)}” maddesini tamamla.`
        : "Karar alanını ve oturum bilgisini son kez doğrula.",
      safestNextStep: "En risksiz adım, önce tamamlanmamış maddeleri kapatıp kabul kararını en son vermektir.",
      compareHint: "Kontrol listesinin tamamlanması ile kabul kararının uygun olması aynı şey değildir; ikisi birlikte okunmalıdır.",
    };

    setCopilotSelection({
      scopeKey: "/superadmin/acceptance",
      entityType: "screen",
      entityId: 6108,
      label: checklistItemLabel(firstPending?.label || "Saha kabul özeti"),
      summary: [
        currentSessionId !== "-" ? currentSessionId : null,
        decisionValue,
        totalChecklist ? `${totalChecklist} madde` : null,
        pendingChecklist.length ? `${pendingChecklist.length} bekleyen` : "hepsi tamamlandı",
      ].filter(Boolean).join(" • "),
      fields: [
        { label: "Oturum", value: currentSessionId, help: "Tek saha kabul oturumunun kimliğini gösterir." },
        { label: "Karar", value: decisionLabel(decisionValue), help: "Test oturumu için seçilen kabul kararını gösterir." },
        { label: "Kontrol listesi", value: String(totalChecklist), help: "Toplam kontrol maddesi sayısını gösterir." },
        { label: "Bekleyen", value: String(pendingChecklist.length), help: "Henüz tamamlanmamış kontrol maddesi sayısını gösterir." },
        { label: "Cihaz", value: session?.deviceModel || "-", help: "Test oturumunda kullanılan cihaz modelini gösterir." },
        { label: "Sürüm", value: session?.buildProfile || "-", help: "Test edilen mobil sürüm profilini gösterir." },
        { label: "Oluşturan", value: currentSessionCreatedBy, help: "Tek saha kabul oturumunu oluşturan kullanıcıyı gösterir." },
        { label: "Güncelleyen", value: currentSessionUpdatedBy, help: "Tek saha kabul oturumunu son güncelleyen kullanıcıyı gösterir." },
        { label: "İlk açık madde", value: checklistItemLabel(firstPending?.label), help: "Henüz tamamlanmamış ilk kontrol maddesini gösterir." },
      ],
      badges: [
        { label: "Alan", value: checklistAreaLabel(firstPending?.area), help: "Açık kontrol maddesinin ait olduğu alanı gösterir." },
        { label: "Oturum", value: currentSessionId, help: "Aktif saha kabul oturumunun kimliğini gösterir." },
      ],
      facts,
    });

    return () => clearCopilotSelection("/superadmin/acceptance");
  }, [manifest, session, currentSessionId, currentSessionCreatedBy, currentSessionUpdatedBy, decisionValue, firstPending, pendingChecklist.length, passChecklist, totalChecklist, checklist, createdAt, updatedAt, riskNote]);

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

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <PanelChrome
        title="Saha Kabul Merkezi"
        subtitle="Sahaya çıkmadan önce kabul kararı, kontrol listesi durumu ve test oturumu özetini toplar."
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

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <Card title="Canlı oturum özeti">
          <div className="panelMeta">
            Tek saha kabul oturumu buradan okunur; oluşturma, kaydetme, karar ve kontrol listesi güncellemeleri aynı kaydı besler.
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
              <div className="panelMeta">Oturum kayıt no</div>
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
              <div className="panelBody" style={{ marginTop: 4 }}>{decisionLabel(decisionValue)}</div>
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
            Bu üst bant güncel saha kabul oturumunun kısa görünümüdür; varsayılanlar ayrı gösterilir.
          </div>
        </Card>

        <Card title="Kontrol listesi özeti">
          <div className="panelMeta">Güncel kontrol listesi ve sıradaki doğru kontrol burada görünür.</div>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
              <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
                <div className="panelMeta">Durum</div>
                <div className="panelBody" style={{ marginTop: 4 }}>{checklistProgressText}</div>
              </div>
              <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
                <div className="panelMeta">Karar</div>
                <div className="panelBody" style={{ marginTop: 4 }}>{decisionLabel(decisionValue)}</div>
              </div>
              <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
                <div className="panelMeta">İlk açık madde</div>
                <div className="panelBody" style={{ marginTop: 4 }}>{checklistStateText}</div>
              </div>
            </div>
            <div className="panelMeta">
              Sıradaki doğru kontrol: {overviewNextControl}
            </div>
                <div className="panelMeta">
              Durum notu: {riskNote || "Karar notu henüz girilmedi."}
            </div>
          </div>
        </Card>
      </div>

      {/* FIELD ACCEPTANCE DISCOVERY / INVENTORY
          Üst: başlık, canlı oturum mini bandı, checklist mini durum ve global aksiyonlar.
          Özet: currentSession kısa özeti, karar durumu, checklist sonucu, sıradaki doğru kontrol.
          Varsayılanlar: karar seçenekleri, kontrol listesi başlangıç maddeleri, kanıt türleri ve oturum kaynağı.
          Karar Kaydı: kabul kararını ve kaydetme akışını yönetir.
          Oturum Bilgisi: oturum kayıt no, sürücü, cihaz, platform ve operatör alanları.
          Kontrol Listesi Güncelleme: tüm maddeler, durum, kısa not ve güncelleme akışı.
          Geçmiş / Kayıt: karar, oturum ve değişiklik geçmişi.
          Veri kaybı yok; mevcut kayıtlar sadece düzenli sekmelere ayrılıyor. */}
      <PanelSegmentTabs
        tabs={tabs}
        value={activeTab}
        onChange={setActiveTab}
        ariaLabel="Saha Kabul Merkezi sekmeleri"
        compact
      />

      <TabPanel active={activeTab === "overview"} label="Özet">
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <Card title="Kısa özet">
            <div className="muted">Güncel saha kabul oturumunun kısa özeti ve karar durumu.</div>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <div>
                <div className="panelMeta">Oturum kayıt no</div>
                <div className="panelBody" style={{ marginTop: 4 }}>{currentSessionId}</div>
              </div>
              <div>
                <div className="panelMeta">Karar</div>
                <div className="panelBody" style={{ marginTop: 4 }}>{decisionLabel(decisionValue)}</div>
              </div>
              <div>
                <div className="panelMeta">Kontrol listesi</div>
                <div className="panelBody" style={{ marginTop: 4 }}>{checklistProgressText}</div>
              </div>
              <div>
                <div className="panelMeta">İlk açık madde</div>
                <div className="panelBody" style={{ marginTop: 4 }}>{checklistStateText}</div>
              </div>
              <div className="panelMeta">
                Bu özet, kabul kararını ve kontrol listesi durumunu aynı ekranda okur; uzun form burada yer almaz.
              </div>
            </div>
          </Card>

          <Card title="Sıradaki doğru kontrol">
            <div className="muted">Kabul akışında bir sonraki güvenli adım.</div>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <div className="panelBody">{overviewNextControl}</div>
              <div className="panelMeta">
                En güvenli adım: önce tamamlanmamış maddeleri kapat, sonra kabul kararını gözden geçir.
              </div>
              <div className="panelMeta">
                Oturum notu: {riskNote || "Karar notu girilmemiş."}
              </div>
            </div>
          </Card>
        </div>
      </TabPanel>

      <TabPanel active={activeTab === "manifest"} label="Varsayılanlar">
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <Card title="Varsayılanlar: karar seçenekleri">
            <div className="panelMeta">{manifestDecisionOptions.map(decisionLabel).join(", ") || "Henüz karar seçeneği yok"}</div>
            <div className="panelMeta" style={{ marginTop: 6 }}>
              Bu kart varsayılan karar seçeneklerini gösterir; güncel karar oturum içindedir.
            </div>
          </Card>

          <Card title="Varsayılanlar: kontrol listesi özeti">
            <div>{manifestChecklistItems.length} madde</div>
            <div className="panelMeta" style={{ marginTop: 6 }}>
              {manifestChecklistItems.slice(0, 3).map((item) => checklistItemLabel(item.label)).join(" • ") || "Henüz kontrol maddesi yok"}
            </div>
            <div className="panelMeta" style={{ marginTop: 6 }}>
              Bu kart başlangıç maddelerini gösterir; güncel durum saha kabul oturumundan okunur.
            </div>
          </Card>

          <Card title="Varsayılan kanıt türleri">
            <div className="panelMeta">{manifestEvidenceTypes.map(evidenceTypeLabel).join(" • ") || "Henüz kanıt türü yok"}</div>
            <div className="panelMeta" style={{ marginTop: 6 }}>
              Bu liste, kabul sırasında kullanılabilecek kanıt türlerini gösterir.
            </div>
          </Card>

          <Card title="Oturum kaynağı">
            <div>{currentSessionId}</div>
            <div className="panelMeta" style={{ marginTop: 6 }}>
              Oluşturuldu: {formatTR(createdAt)} • Güncellendi: {formatTR(updatedAt)}
            </div>
            <div className="panelMeta" style={{ marginTop: 6 }}>
              Oluşturan: {currentSessionCreatedBy} • Güncelleyen: {currentSessionUpdatedBy}
            </div>
          </Card>
        </div>
      </TabPanel>

      <TabPanel active={activeTab === "decision"} label="Karar Kaydı">
        <Card title="Karar kaydı">
          <div className="muted">Kabul kararını güncel saha kabul oturumuna kaydeder.</div>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <select className="input" value={session?.decision || "LIMITED_GO"} onChange={(e) => setSessionField("decision", e.target.value)}>
              {manifestDecisionOptions.map((option) => (
                <option key={option} value={option}>{decisionLabel(option)}</option>
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
            <div className="muted">Karar: {decisionLabel(session?.decision)} • güncel oturuma yazılır</div>
            <button className="btn" onClick={saveDecision} disabled={decisionBusy}>
              {decisionBusy ? "Kaydediliyor..." : "Kararı kaydet"}
            </button>
          </div>
        </Card>
      </TabPanel>

      <TabPanel active={activeTab === "session"} label="Oturum Bilgisi">
        <Card title="Oturum bilgisi">
          <div className="muted">Saha kabul oturumunun kimlik ve cihaz alanları.</div>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <input className="input" aria-label="Oturum kayıt no" value={sessionId} readOnly />
            <input className="input" placeholder="Sürücü etiketi" value={session?.driverLabel || ""} onChange={(e) => setSessionField("driverLabel", e.target.value)} />
            <input className="input" placeholder="Cihaz modeli" value={session?.deviceModel || ""} onChange={(e) => setSessionField("deviceModel", e.target.value)} />
            <input className="input" placeholder="OS sürümü" value={session?.osVersion || ""} onChange={(e) => setSessionField("osVersion", e.target.value)} />
            <input className="input" placeholder="Sürüm profili" value={session?.buildProfile || ""} onChange={(e) => setSessionField("buildProfile", e.target.value)} />
            <input className="input" placeholder="Test eden kişi" value={session?.testerLabel || ""} onChange={(e) => setSessionField("testerLabel", e.target.value)} />
            <input className="input" type="number" min="0" placeholder="Kanıt sayısı" value={session?.evidenceCount ?? 0} onChange={(e) => setSessionField("evidenceCount", Number(e.target.value || 0))} />
          </div>
          <div className="panelMeta" style={{ marginTop: 10 }}>
            Bu alanlar tek saha kabul oturumunun korunmasına yardımcı olur.
          </div>
        </Card>
      </TabPanel>

      <TabPanel active={activeTab === "checklist"} label="Kontrol listesi güncelleme">
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div className="panelSectionTitle">Kontrol listesi güncelleme</div>
            <div className="muted">
              {checklistProgressText}
            </div>
          </div>
          {checklist.length > 0 ? checklist.map((item, idx) => {
            const status = normalizeChecklistStatus(item?.status);
            const busy = checklistBusyId === item.id;
            return (
              <div key={item.id || idx} className="card" style={{ display: "grid", gap: 10, padding: 12, borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div className="panelSectionTitle">{checklistItemLabel(item.label)}</div>
                    <div className="panelMeta" style={{ marginTop: 6 }}>Alan: {checklistAreaLabel(item.area)}</div>
                  </div>
                  <div className="pill">{checklistStatusLabel(status)}</div>
                </div>
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                  <select
                    className="input"
                    value={status}
                    onChange={(e) => setChecklistField(item.id, "status", e.target.value)}
                  >
                    {CHECKLIST_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>{checklistStatusLabel(option)}</option>
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
                <div className="muted">Güncelleme: {item.updatedAt || "-"} • saha kabul oturumu kontrol alanı</div>
                  <button className="btn" onClick={() => saveChecklistItem(item)} disabled={busy}>
                    {busy ? "Kaydediliyor..." : "Maddeyi güncelle"}
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="muted">Henüz kontrol maddesi yok.</div>
          )}
        </div>
      </TabPanel>

      <TabPanel active={activeTab === "history"} label="Geçmiş / İşlem kayıtları">
        <Card title="Karar / oturum geçmişi">
          <div className="panelMeta">
            Karar, oturum ve değişiklik geçmişi bu alanda okunur.
          </div>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {historyEntries.length > 0 ? historyEntries.map((item, idx) => (
              <div key={item.id || idx} style={{ padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div className="panelSectionTitle">{item.title}</div>
                  <div className="panelMeta">{item.meta}</div>
                </div>
                <div className="panelBody" style={{ marginTop: 6 }}>{humanizeUserFacingText(item.value)}</div>
                <div className="panelMeta" style={{ marginTop: 6 }}>{humanizeUserFacingText(item.note)}</div>
              </div>
            )) : (
              <div className="muted">Henüz geçmiş kaydı yok.</div>
            )}
          </div>
        </Card>
      </TabPanel>
    </div>
  );
}
