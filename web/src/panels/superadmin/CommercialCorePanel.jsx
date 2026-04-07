import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";

function Card({ title, children }) {
  return (
    <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, flex: "1 1 280px" }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function fmtBps(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0 bps";
  return `${n} bps`;
}

function fmtDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("tr-TR");
}

function InputRow({ label, children, help }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontWeight: 600 }}>{label}</div>
      {children}
      {help ? <div className="muted">{help}</div> : null}
    </label>
  );
}

function stripHtmlNoise(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withoutTags = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return withoutTags || raw;
}

function promptMaybe(message, fallback = "") {
  if (typeof globalThis?.prompt !== "function") return fallback;
  const value = globalThis.prompt(message, fallback);
  return value == null ? fallback : String(value);
}

function buildOptionalEndpointState(kind, status) {
  const baseCards = { commercialSources: 0, agreementSources: 0, shiftSeriesSources: 0, settlementPlans: 0, paymentAccounts: 0, commissionRules: 0 };
  if (kind === "paymentBackbone") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        summary: "TOTP step-up tamamlanmadan payment backbone özeti okunamıyor.",
        activeMilestone: "Step-up gerekli",
        dormant: true,
        cards: baseCards,
        activeRule: null,
      };
    }
    return {
      endpointStatus: "missing",
      summary: "Bu backend sürümünde payment backbone status endpointi henüz yok veya sunucu yeniden başlatılmadı.",
      activeMilestone: "Endpoint bulunamadı",
      dormant: true,
      cards: baseCards,
      activeRule: null,
    };
  }
  if (kind === "pilotStatus") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        activeMilestone: "Step-up gerekli",
        candidateCount: 0,
        readyCount: 0,
        dormantCount: 0,
        activeSourceIds: [],
        summary: "TOTP step-up tamamlanmadan opsiyonel ödeme pilot özeti okunamıyor.",
      };
    }
    return {
      endpointStatus: "missing",
      activeMilestone: "Endpoint bulunamadı",
      candidateCount: 0,
      readyCount: 0,
      dormantCount: 0,
      activeSourceIds: [],
      summary: "Bu backend sürümünde opsiyonel ödeme pilot endpointi henüz yok veya sunucu yeniden başlatılmadı.",
    };
  }
  if (kind === "pilotCandidates") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        items: [],
        summary: "TOTP step-up tamamlanmadan opsiyonel pilot aday listesi okunamıyor.",
      };
    }
    return {
      endpointStatus: "missing",
      items: [],
      summary: "Bu backend sürümünde opsiyonel pilot aday endpointi henüz yok veya sunucu yeniden başlatılmadı.",
    };
  }
  if (kind === "requiredStatus") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        activeMilestone: "Step-up gerekli",
        candidateCount: 0,
        activeCount: 0,
        disabledCount: 0,
        waitingCount: 0,
        summary: "TOTP step-up tamamlanmadan zorunlu odeme rollout ozeti okunamiyor.",
      };
    }
    return {
      endpointStatus: "missing",
      activeMilestone: "Endpoint bulunamadi",
      candidateCount: 0,
      activeCount: 0,
      disabledCount: 0,
      waitingCount: 0,
      summary: "Bu backend surumunde zorunlu odeme rollout endpointi henuz yok veya sunucu yeniden baslatilmadi.",
    };
  }
  if (kind === "requiredCandidates") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        items: [],
        summary: "TOTP step-up tamamlanmadan zorunlu rollout aday listesi okunamiyor.",
      };
    }
    return {
      endpointStatus: "missing",
      items: [],
      summary: "Bu backend surumunde zorunlu rollout aday endpointi henuz yok veya sunucu yeniden baslatilmadi.",
    };
  }
  if (kind === "accountStatus") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        activeMilestone: "Step-up gerekli",
        companyCandidateCount: 0,
        roomCandidateCount: 0,
        companyReadyCount: 0,
        roomReadyCount: 0,
        companyMissingCount: 0,
        roomMissingCount: 0,
        companyErrorCount: 0,
        roomErrorCount: 0,
        summary: "TOTP step-up tamamlanmadan odeme hesabi hazirlik ozeti okunamiyor.",
      };
    }
    return {
      endpointStatus: "missing",
      activeMilestone: "Endpoint bulunamadi",
      companyCandidateCount: 0,
      roomCandidateCount: 0,
      companyReadyCount: 0,
      roomReadyCount: 0,
      companyMissingCount: 0,
      roomMissingCount: 0,
      companyErrorCount: 0,
      roomErrorCount: 0,
      summary: "Bu backend surumunde odeme hesabi hazirlik endpointi henuz yok veya sunucu yeniden baslatilmadi.",
    };
  }
  if (kind === "accountCandidates") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        items: [],
        summary: "TOTP step-up tamamlanmadan odeme hesabi aday listesi okunamiyor.",
      };
    }
    return {
      endpointStatus: "missing",
      items: [],
      summary: "Bu backend surumunde odeme hesabi aday endpointi henuz yok veya sunucu yeniden baslatilmadi.",
    };
  }
  if (kind === "settlementStatus") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        activeMilestone: "Step-up gerekli",
        candidateCount: 0,
        readyCount: 0,
        plannedCount: 0,
        executedCount: 0,
        blockedCount: 0,
        financeReadyCount: 0,
        summary: "TOTP step-up tamamlanmadan settlement operasyon ozeti okunamiyor.",
      };
    }
    return {
      endpointStatus: "missing",
      activeMilestone: "Endpoint bulunamadi",
      candidateCount: 0,
      readyCount: 0,
      plannedCount: 0,
      executedCount: 0,
      blockedCount: 0,
      financeReadyCount: 0,
      summary: "Bu backend surumunde settlement operasyon endpointi henuz yok veya sunucu yeniden baslatilmadi.",
    };
  }
  if (kind === "settlementQueue") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        items: [],
        summary: "TOTP step-up tamamlanmadan settlement operasyon kuyrugu okunamiyor.",
      };
    }
    return {
      endpointStatus: "missing",
      items: [],
      summary: "Bu backend surumunde settlement operasyon kuyruk endpointi henuz yok veya sunucu yeniden baslatilmadi.",
    };
  }
  if (kind === "reconciliationStatus") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        activeMilestone: "Step-up gerekli",
        candidateCount: 0,
        pendingCount: 0,
        matchedCount: 0,
        reviewCount: 0,
        mismatchCount: 0,
        closedCount: 0,
        overduePlannedCount: 0,
        missingProviderRefCount: 0,
        summary: "TOTP step-up tamamlanmadan settlement mutabakat ozeti okunamiyor.",
      };
    }
    return {
      endpointStatus: "missing",
      activeMilestone: "Endpoint bulunamadi",
      candidateCount: 0,
      pendingCount: 0,
      matchedCount: 0,
      reviewCount: 0,
      mismatchCount: 0,
      closedCount: 0,
      overduePlannedCount: 0,
      missingProviderRefCount: 0,
      summary: "Bu backend surumunde settlement mutabakat endpointi henuz yok veya sunucu yeniden baslatilmadi.",
    };
  }
  if (kind === "reconciliationQueue") {
    if (status === 403) {
      return {
        endpointStatus: "forbidden",
        items: [],
        summary: "TOTP step-up tamamlanmadan settlement mutabakat kuyrugu okunamiyor.",
      };
    }
    return {
      endpointStatus: "missing",
      items: [],
      summary: "Bu backend surumunde settlement mutabakat kuyruk endpointi henuz yok veya sunucu yeniden baslatilmadi.",
    };
  }
  if (status === 403) {
    return {
      endpointStatus: "forbidden",
      summary: "TOTP step-up tamamlanmadan ticari ayarlar okunamıyor.",
      paymentModes: ["OFF", "OPTIONAL", "REQUIRED"],
      globalRule: { paymentMode: "OFF", commissionBps: 0, note: "", updatedAt: null },
      roomOverrides: [],
      roomOverrideCount: 0,
    };
  }
  return {
    endpointStatus: "missing",
    summary: "Bu backend sürümünde payment backbone settings endpointi henüz yok veya sunucu yeniden başlatılmadı.",
    paymentModes: ["OFF", "OPTIONAL", "REQUIRED"],
    globalRule: { paymentMode: "OFF", commissionBps: 0, note: "", updatedAt: null },
    roomOverrides: [],
    roomOverrideCount: 0,
  };
}

async function readOptional(path, fallbackKind) {
  try {
    const result = await api(path);
    return { ok: true, data: result };
  } catch (e) {
    const status = Number(e?.status || 0);
    if (status === 403 || status === 404) {
      return { ok: false, data: buildOptionalEndpointState(fallbackKind, status), status };
    }
    throw e;
  }
}

export default function CommercialCorePanel() {
  const [manifest, setManifest] = useState(null);
  const [lifecycle, setLifecycle] = useState(null);
  const [paymentBackbone, setPaymentBackbone] = useState(null);
  const [settings, setSettings] = useState(null);
  const [pilotStatus, setPilotStatus] = useState(null);
  const [pilotCandidatesMeta, setPilotCandidatesMeta] = useState({ endpointStatus: "ok", summary: "" });
  const [pilotCandidates, setPilotCandidates] = useState([]);
  const [requiredStatus, setRequiredStatus] = useState(null);
  const [requiredCandidatesMeta, setRequiredCandidatesMeta] = useState({ endpointStatus: "ok", summary: "" });
  const [requiredCandidates, setRequiredCandidates] = useState([]);
  const [accountStatus, setAccountStatus] = useState(null);
  const [accountCandidatesMeta, setAccountCandidatesMeta] = useState({ endpointStatus: "ok", summary: "" });
  const [accountCandidates, setAccountCandidates] = useState([]);
  const [settlementStatus, setSettlementStatus] = useState(null);
  const [settlementQueueMeta, setSettlementQueueMeta] = useState({ endpointStatus: "ok", summary: "" });
  const [settlementQueue, setSettlementQueue] = useState([]);
  const [reconciliationStatus, setReconciliationStatus] = useState(null);
  const [reconciliationQueueMeta, setReconciliationQueueMeta] = useState({ endpointStatus: "ok", summary: "" });
  const [reconciliationQueue, setReconciliationQueue] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomQuery, setRoomQuery] = useState("");
  const [globalForm, setGlobalForm] = useState({ paymentMode: "OFF", commissionBps: 0, note: "" });
  const [roomForm, setRoomForm] = useState({ roomId: "", paymentMode: "OFF", commissionBps: 0, note: "" });
  const [accountForm, setAccountForm] = useState({ ownerType: "COMPANY", ownerId: "", providerKey: "DORMANT", status: "INACTIVE", label: "", maskedIban: "", accountRef: "", note: "" });
  const [busyKey, setBusyKey] = useState("");
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  async function load() {
    setErr("");
    try {
      const [m, l, pbRes, cfgRes, pilotRes, pilotCandidatesRes, requiredRes, requiredCandidatesRes, accountStatusRes, accountCandidatesRes, settlementStatusRes, settlementQueueRes, reconciliationStatusRes, reconciliationQueueRes, roomRes] = await Promise.all([
        api("/api/commercial-core/manifest"),
        api("/api/commercial-core/lifecycle-template"),
        readOptional("/api/commercial-core/payment-backbone/status", "paymentBackbone"),
        readOptional("/api/commercial-core/payment-backbone/settings", "settings"),
        readOptional("/api/commercial-core/payment-backbone/pilot/status", "pilotStatus"),
        readOptional("/api/commercial-core/payment-backbone/pilot/candidates?take=30", "pilotCandidates"),
        readOptional("/api/commercial-core/payment-backbone/required/status", "requiredStatus"),
        readOptional("/api/commercial-core/payment-backbone/required/candidates?take=30", "requiredCandidates"),
        readOptional("/api/commercial-core/payment-backbone/accounts/status", "accountStatus"),
        readOptional("/api/commercial-core/payment-backbone/accounts/candidates?take=30", "accountCandidates"),
        readOptional("/api/commercial-core/payment-backbone/settlement/status", "settlementStatus"),
        readOptional("/api/commercial-core/payment-backbone/settlement/queue?take=40", "settlementQueue"),
        readOptional("/api/commercial-core/payment-backbone/reconciliation/status", "reconciliationStatus"),
        readOptional("/api/commercial-core/payment-backbone/reconciliation/queue?take=40", "reconciliationQueue"),
        readOptional("/api/rooms?take=500", "rooms"),
      ]);
      const pb = pbRes?.data || null;
      const cfg = cfgRes?.data || null;
      const pilot = pilotRes?.data || null;
      const pilotItems = pilotCandidatesRes?.ok ? (pilotCandidatesRes?.data?.items || []) : [];
      const required = requiredRes?.data || null;
      const requiredItems = requiredCandidatesRes?.ok ? (requiredCandidatesRes?.data?.items || []) : [];
      const accounts = accountStatusRes?.data || null;
      const accountItems = accountCandidatesRes?.ok ? (accountCandidatesRes?.data?.items || []) : [];
      const settlement = settlementStatusRes?.data || null;
      const settlementItems = settlementQueueRes?.ok ? (settlementQueueRes?.data?.items || []) : [];
      const reconciliation = reconciliationStatusRes?.data || null;
      const reconciliationItems = reconciliationQueueRes?.ok ? (reconciliationQueueRes?.data?.items || []) : [];
      const roomItems = roomRes?.ok ? (roomRes?.data?.items || []) : [];
      setManifest(m || null);
      setLifecycle(l || null);
      setPaymentBackbone(pb);
      setSettings(cfg);
      setPilotStatus(pilot);
      setPilotCandidatesMeta(pilotCandidatesRes?.ok ? { endpointStatus: "ok", summary: "" } : (pilotCandidatesRes?.data || { endpointStatus: "missing", summary: "Opsiyonel pilot aday endpointi okunamadı." }));
      setPilotCandidates(pilotItems);
      setRequiredStatus(required);
      setRequiredCandidatesMeta(requiredCandidatesRes?.ok ? { endpointStatus: "ok", summary: "" } : (requiredCandidatesRes?.data || { endpointStatus: "missing", summary: "Zorunlu rollout aday endpointi okunamadı." }));
      setRequiredCandidates(requiredItems);
      setAccountStatus(accounts);
      setAccountCandidatesMeta(accountCandidatesRes?.ok ? { endpointStatus: "ok", summary: "" } : (accountCandidatesRes?.data || { endpointStatus: "missing", summary: "Odeme hesabi aday endpointi okunamadi." }));
      setAccountCandidates(accountItems);
      setSettlementStatus(settlement);
      setSettlementQueueMeta(settlementQueueRes?.ok ? { endpointStatus: "ok", summary: "" } : (settlementQueueRes?.data || { endpointStatus: "missing", summary: "Settlement operasyon kuyrugu endpointi okunamadi." }));
      setSettlementQueue(settlementItems);
      setReconciliationStatus(reconciliation);
      setReconciliationQueueMeta(reconciliationQueueRes?.ok ? { endpointStatus: "ok", summary: "" } : (reconciliationQueueRes?.data || { endpointStatus: "missing", summary: "Settlement mutabakat kuyrugu endpointi okunamadi." }));
      setReconciliationQueue(reconciliationItems);
      setRooms(roomItems);
      setGlobalForm({
        paymentMode: cfg?.globalRule?.paymentMode || "OFF",
        commissionBps: Number(cfg?.globalRule?.commissionBps || 0),
        note: cfg?.globalRule?.note || "",
      });
      if (!pbRes?.ok || !cfgRes?.ok || !pilotRes?.ok || !pilotCandidatesRes?.ok || !requiredRes?.ok || !requiredCandidatesRes?.ok || !accountStatusRes?.ok || !accountCandidatesRes?.ok || !settlementStatusRes?.ok || !settlementQueueRes?.ok || !reconciliationStatusRes?.ok || !reconciliationQueueRes?.ok) {
        const reasons = [];
        if (!pbRes?.ok) reasons.push(pbRes?.status === 403 ? "payment backbone özeti step-up bekliyor" : "payment backbone özeti endpointi bulunamadı");
        if (!cfgRes?.ok) reasons.push(cfgRes?.status === 403 ? "ticari ayarlar step-up bekliyor" : "ticari ayarlar endpointi bulunamadı");
        if (!pilotRes?.ok) reasons.push(pilotRes?.status === 403 ? "opsiyonel ödeme pilot özeti step-up bekliyor" : "opsiyonel ödeme pilot özeti endpointi bulunamadı");
        if (!pilotCandidatesRes?.ok) reasons.push(pilotCandidatesRes?.status === 403 ? "opsiyonel ödeme pilot aday listesi step-up bekliyor" : "opsiyonel ödeme pilot aday listesi endpointi bulunamadı");
        if (!requiredRes?.ok) reasons.push(requiredRes?.status === 403 ? "zorunlu ödeme rollout özeti step-up bekliyor" : "zorunlu ödeme rollout özeti endpointi bulunamadı");
        if (!requiredCandidatesRes?.ok) reasons.push(requiredCandidatesRes?.status === 403 ? "zorunlu ödeme rollout aday listesi step-up bekliyor" : "zorunlu ödeme rollout aday listesi endpointi bulunamadı");
        if (!accountStatusRes?.ok) reasons.push(accountStatusRes?.status === 403 ? "odeme hesabi hazirlik ozeti step-up bekliyor" : "odeme hesabi hazirlik ozeti endpointi bulunamadi");
        if (!accountCandidatesRes?.ok) reasons.push(accountCandidatesRes?.status === 403 ? "odeme hesabi aday listesi step-up bekliyor" : "odeme hesabi aday listesi endpointi bulunamadi");
        if (!settlementStatusRes?.ok) reasons.push(settlementStatusRes?.status === 403 ? "settlement operasyon ozeti step-up bekliyor" : "settlement operasyon ozeti endpointi bulunamadi");
        if (!settlementQueueRes?.ok) reasons.push(settlementQueueRes?.status === 403 ? "settlement operasyon kuyrugu step-up bekliyor" : "settlement operasyon kuyrugu endpointi bulunamadi");
        if (!reconciliationStatusRes?.ok) reasons.push(reconciliationStatusRes?.status === 403 ? "settlement mutabakat ozeti step-up bekliyor" : "settlement mutabakat ozeti endpointi bulunamadi");
        if (!reconciliationQueueRes?.ok) reasons.push(reconciliationQueueRes?.status === 403 ? "settlement mutabakat kuyrugu step-up bekliyor" : "settlement mutabakat kuyrugu endpointi bulunamadi");
        setErr(reasons.join(" • "));
      }
    } catch (e) {
      setErr(stripHtmlNoise(e?.message || String(e)));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const steps = manifest?.steps || [];
  const route = lifecycle?.route || [];
  const cards = paymentBackbone?.cards || {};
  const activeRule = paymentBackbone?.activeRule || null;
  const roomOverrides = settings?.roomOverrides || [];
  const paymentBackboneEndpointStatus = String(paymentBackbone?.endpointStatus || "ok");
  const settingsEndpointStatus = String(settings?.endpointStatus || "ok");
  const pilotEndpointStatus = String(pilotStatus?.endpointStatus || "ok");
  const pilotCandidatesEndpointStatus = String(pilotCandidatesMeta?.endpointStatus || "ok");
  const requiredEndpointStatus = String(requiredStatus?.endpointStatus || "ok");
  const requiredCandidatesEndpointStatus = String(requiredCandidatesMeta?.endpointStatus || "ok");
  const accountEndpointStatus = String(accountStatus?.endpointStatus || "ok");
  const accountCandidatesEndpointStatus = String(accountCandidatesMeta?.endpointStatus || "ok");
  const settlementEndpointStatus = String(settlementStatus?.endpointStatus || "ok");
  const settlementQueueEndpointStatus = String(settlementQueueMeta?.endpointStatus || "ok");
  const reconciliationEndpointStatus = String(reconciliationStatus?.endpointStatus || "ok");
  const reconciliationQueueEndpointStatus = String(reconciliationQueueMeta?.endpointStatus || "ok");
  const settingsWritable = settingsEndpointStatus === "ok";
  const pilotWritable = pilotEndpointStatus === "ok" && pilotCandidatesEndpointStatus === "ok";
  const requiredWritable = requiredEndpointStatus === "ok" && requiredCandidatesEndpointStatus === "ok";
  const accountWritable = accountEndpointStatus === "ok" && accountCandidatesEndpointStatus === "ok";
  const settlementWritable = settlementEndpointStatus === "ok" && settlementQueueEndpointStatus === "ok";
  const reconciliationWritable = reconciliationEndpointStatus === "ok" && reconciliationQueueEndpointStatus === "ok";

  const filteredRooms = useMemo(() => {
    const q = String(roomQuery || "").trim().toLowerCase();
    const base = Array.isArray(rooms) ? rooms : [];
    if (!q) return base.slice(0, 60);
    return base.filter((item) => String(item?.name || "").toLowerCase().includes(q)).slice(0, 60);
  }, [rooms, roomQuery]);

  async function saveGlobal() {
    setBusyKey("global");
    setErr("");
    setOkMsg("");
    try {
      await api.post("/api/commercial-core/payment-backbone/settings/global", {
        paymentMode: globalForm.paymentMode,
        commissionBps: Number(globalForm.commissionBps || 0),
        note: globalForm.note || "",
      });
      setOkMsg("Global ticari ayar kaydedildi.");
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusyKey("");
    }
  }

  async function saveRoomOverride() {
    setBusyKey("room");
    setErr("");
    setOkMsg("");
    try {
      await api.post("/api/commercial-core/payment-backbone/settings/room", {
        roomId: Number(roomForm.roomId || 0),
        paymentMode: roomForm.paymentMode,
        commissionBps: Number(roomForm.commissionBps || 0),
        note: roomForm.note || "",
      });
      setOkMsg("Oda bazlı ticari ayar kaydedildi.");
      setRoomForm({ roomId: "", paymentMode: globalForm.paymentMode || "OFF", commissionBps: Number(globalForm.commissionBps || 0), note: "" });
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusyKey("");
    }
  }

  async function disableRoomOverride(roomId) {
    if (!roomId) return;
    setBusyKey(`disable:${roomId}`);
    setErr("");
    setOkMsg("");
    try {
      await api.del(`/api/commercial-core/payment-backbone/settings/room/${roomId}`);
      setOkMsg("Oda override kapatıldı.");
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusyKey("");
    }
  }

  async function activatePilot(sourceId) {
    if (!sourceId) return;
    setBusyKey(`pilot:on:${sourceId}`);
    setErr("");
    setOkMsg("");
    try {
      await api.post("/api/commercial-core/payment-backbone/pilot/activate", { sourceIds: [Number(sourceId)] });
      setOkMsg("Opsiyonel ödeme pilotu READY durumuna alındı.");
      await load();
    } catch (e) {
      setErr(stripHtmlNoise(e?.message || String(e)));
    } finally {
      setBusyKey("");
    }
  }

  async function deactivatePilot(sourceId) {
    if (!sourceId) return;
    setBusyKey(`pilot:off:${sourceId}`);
    setErr("");
    setOkMsg("");
    try {
      await api.post("/api/commercial-core/payment-backbone/pilot/deactivate", { sourceIds: [Number(sourceId)] });
      setOkMsg("Opsiyonel ödeme pilotu DORMANT durumuna alındı.");
      await load();
    } catch (e) {
      setErr(stripHtmlNoise(e?.message || String(e)));
    } finally {
      setBusyKey("");
    }
  }


async function activateRequired(sourceId) {
  if (!sourceId) return;
  setBusyKey(`required:on:${sourceId}`);
  setErr("");
  setOkMsg("");
  try {
    await api.post("/api/commercial-core/payment-backbone/required/activate", { sourceIds: [Number(sourceId)] });
    setOkMsg("Zorunlu ödeme rollout'u ACTIVE durumuna alındı.");
    await load();
  } catch (e) {
    setErr(stripHtmlNoise(e?.message || String(e)));
  } finally {
    setBusyKey("");
  }
}

async function deactivateRequired(sourceId) {
  if (!sourceId) return;
  setBusyKey(`required:off:${sourceId}`);
  setErr("");
  setOkMsg("");
  try {
    await api.post("/api/commercial-core/payment-backbone/required/deactivate", { sourceIds: [Number(sourceId)] });
    setOkMsg("Zorunlu ödeme rollout'u DISABLED durumuna alındı.");
    await load();
  } catch (e) {
    setErr(stripHtmlNoise(e?.message || String(e)));
  } finally {
    setBusyKey("");
  }
}

  function applyAccountCandidate(item) {
    if (!item) return;
    setAccountForm({
      ownerType: item.ownerType || "COMPANY",
      ownerId: String(item.ownerId || ""),
      providerKey: item?.account?.providerKey || "DORMANT",
      status: item?.account?.status || (item?.accountReady ? "ACTIVE" : "INACTIVE"),
      label: item?.account?.label || item?.ownerName || "",
      maskedIban: item?.account?.maskedIban || "",
      accountRef: item?.account?.accountRef || "",
      note: item?.account?.note || "",
    });
  }

  async function savePaymentAccount() {
    setBusyKey("account");
    setErr("");
    setOkMsg("");
    try {
      await api.post("/api/commercial-core/payment-backbone/accounts/upsert", {
        ownerType: accountForm.ownerType,
        companyId: accountForm.ownerType === "COMPANY" ? Number(accountForm.ownerId || 0) : null,
        roomId: accountForm.ownerType === "ROOM" ? Number(accountForm.ownerId || 0) : null,
        providerKey: accountForm.providerKey || "DORMANT",
        status: accountForm.status || "INACTIVE",
        label: accountForm.label || "",
        maskedIban: accountForm.maskedIban || "",
        accountRef: accountForm.accountRef || "",
        note: accountForm.note || "",
      });
      setOkMsg("Ödeme hesabı metadata kaydedildi.");
      await load();
    } catch (e) {
      setErr(stripHtmlNoise(e?.message || String(e)));
    } finally {
      setBusyKey("");
    }
  }

  async function settlementAction(path, entryId, successMessage, busyToken, extra = {}) {
    if (!entryId) return;
    setBusyKey(busyToken);
    setErr("");
    setOkMsg("");
    try {
      await api.post(path, { entryIds: [Number(entryId)], ...extra });
      setOkMsg(successMessage);
      await load();
    } catch (e) {
      setErr(stripHtmlNoise(e?.message || String(e)));
    } finally {
      setBusyKey("");
    }
  }

  async function markSettlementPlanned(item) {
    const dueAt = promptMaybe("İsteğe bağlı plan tarihi gir (örn: 2026-04-08T10:00:00). Boş bırakabilirsin.", item?.dueAt || "");
    const note = promptMaybe("İsteğe bağlı plan notu", item?.note || "");
    return settlementAction(
      "/api/commercial-core/payment-backbone/settlement/entries/plan",
      item?.entryId,
      "Settlement satırı PLANNED durumuna alındı.",
      `settlement:plan:${item?.entryId}`,
      { dueAt: dueAt || null, note: note || null },
    );
  }

  async function markSettlementReady(item) {
    const note = promptMaybe("İsteğe bağlı READY notu", item?.note || "");
    return settlementAction(
      "/api/commercial-core/payment-backbone/settlement/entries/ready",
      item?.entryId,
      "Settlement satırı READY durumuna alındı.",
      `settlement:ready:${item?.entryId}`,
      { note: note || null },
    );
  }

  async function markSettlementExecuted(item) {
    const providerRef = promptMaybe("Provider ref / manuel referans", item?.providerRef || `MANUAL:${item?.entryId}`);
    const note = promptMaybe("İsteğe bağlı execute notu", item?.note || "");
    return settlementAction(
      "/api/commercial-core/payment-backbone/settlement/entries/execute",
      item?.entryId,
      "Settlement satırı EXECUTED durumuna alındı.",
      `settlement:execute:${item?.entryId}`,
      { providerRef: providerRef || `MANUAL:${item?.entryId}`, note: note || null },
    );
  }

  async function markSettlementCancelled(item) {
    const note = promptMaybe("İsteğe bağlı iptal notu", item?.note || "");
    return settlementAction(
      "/api/commercial-core/payment-backbone/settlement/entries/cancel",
      item?.entryId,
      "Settlement satırı CANCELLED durumuna alındı.",
      `settlement:cancel:${item?.entryId}`,
      { note: note || null },
    );
  }

  async function saveReconciliation(item, status) {
    if (!item?.entryId) return;
    setBusyKey(`recon:${status}:${item.entryId}`);
    setErr("");
    setOkMsg("");
    try {
      const providerRef = promptMaybe("Provider ref / banka referansı", item?.providerRef || item?.reconciliationExternalRef || "");
      const externalRef = promptMaybe("Harici mutabakat referansı", item?.reconciliationExternalRef || providerRef || "");
      const note = promptMaybe("Mutabakat notu", item?.reconciliationNote || "");
      const expectedAmount = item?.reconciliationExpectedAmount ?? item?.amount ?? 0;
      const amountSeed = item?.reconciliationReceivedAmount ?? expectedAmount;
      const receivedAmountRaw = promptMaybe("Gerçekte görülen tutar", String(amountSeed));
      const receivedAmount = Number(receivedAmountRaw || amountSeed || 0);
      await api.post("/api/commercial-core/payment-backbone/reconciliation/records/upsert", {
        entryId: Number(item.entryId),
        status,
        providerRef: providerRef || null,
        externalRef: externalRef || null,
        note: note || null,
        expectedAmount: Number(expectedAmount || 0),
        receivedAmount: Number.isFinite(receivedAmount) ? receivedAmount : Number(expectedAmount || 0),
      });
      setOkMsg("Settlement mutabakat kaydı güncellendi.");
      await load();
    } catch (e) {
      setErr(stripHtmlNoise(e?.message || String(e)));
    } finally {
      setBusyKey("");
    }
  }

  function applyRoom(room) {
    setRoomForm((prev) => ({
      ...prev,
      roomId: String(room?.id || ""),
      paymentMode: prev.paymentMode || globalForm.paymentMode || "OFF",
      commissionBps: Number(prev.commissionBps || globalForm.commissionBps || 0),
    }));
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Ticari Akış</h2>
          <div className="muted" style={{ marginTop: 6 }}>
            Talebin teklif, karşı teklif, uzlaşma ve sözleşmeye geçiş yolunu özetler.
          </div>
        </div>
        <button className="btn" onClick={load}>Yenile</button>
      </div>

      {err ? <div style={{ marginTop: 12, color: "#ffb17b", whiteSpace: "pre-wrap" }}>{stripHtmlNoise(err)}</div> : null}
      {okMsg ? <div style={{ marginTop: 12, color: "#7bffb2", whiteSpace: "pre-wrap" }}>{okMsg}</div> : null}

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Aktif durum">
          <div>{manifest?.title || "Henüz ticari özet yok"}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {manifest?.activeMilestone || "Aktif durum bilgisi gelmedi"}
          </div>
        </Card>
        <Card title="İzlenen adımlar">
          <div>{steps.length} adım</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {steps.map((item) => item.label).join(" • ") || "Henüz adım listesi yok"}
          </div>
        </Card>
        <Card title="Sözleşmeye geçiş">
          <div>{route.join(" → ") || "Henüz geçiş yolu yok"}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {lifecycle?.summary || "Bu ekran ticari sürecin hangi kapılardan geçtiğini anlatır"}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Dormant payment backbone">
          <div>{paymentBackbone?.summary || "Henüz payment backbone özeti yok"}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {paymentBackbone?.activeMilestone || "-"} • {paymentBackbone?.dormant ? "Dormant" : "Açık"}
          </div>
        </Card>
        <Card title="Aktif komisyon kuralı">
          <div>{activeRule ? `${activeRule.paymentMode} • ${fmtBps(activeRule.commissionBps)}` : "Henüz aktif kural yok"}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {activeRule ? `Kaynak: ${activeRule.scopeType}${activeRule.roomId ? ` #${activeRule.roomId}` : ""}${activeRule.ruleId ? ` • Kural #${activeRule.ruleId}` : ""}` : "M82.10 ile yönetim yüzeyi açılacak"}
          </div>
        </Card>
        <Card title="Kaynak sayaçları">
          <div>Toplam kaynak: {cards.commercialSources || 0}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Agreement: {cards.agreementSources || 0} • Shift series: {cards.shiftSeriesSources || 0}
          </div>
        </Card>
        <Card title="Settlement hazırlığı">
          <div>Plan: {cards.settlementPlans || 0}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Hesap: {cards.paymentAccounts || 0} • Kural: {cards.commissionRules || 0}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Super Admin ticari ayarlar</div>
        <div className="muted">
          {settings?.summary || "Global payment mode ve oda bazlı komisyon override ayarları dormant omurgaya yazılır."}
        </div>
        {paymentBackboneEndpointStatus !== "ok" || settingsEndpointStatus !== "ok" ? (
          <div className="muted" style={{ color: "#ffb17b" }}>
            {settingsEndpointStatus === "forbidden"
              ? "Bu yüzeyin tam okunması için önce TOTP step-up doğrulamasını tamamla."
              : settingsEndpointStatus === "missing"
              ? "Backend ticari ayar endpointi bu çalışmakta olan sunucuda yok görünüyor. Sunucuyu yeniden başlat veya son backend kodunu ayağa kaldır."
              : paymentBackboneEndpointStatus === "missing"
              ? "Payment backbone status endpointi bu çalışmakta olan sunucuda yok görünüyor. Sunucuyu yeniden başlat veya son backend kodunu ayağa kaldır."
              : "Bazı ticari endpointler şu an sınırlı erişimde."}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Global ayar">
          <div style={{ display: "grid", gap: 12 }}>
            <InputRow label="Payment mode" help="Tüm sistem için varsayılan mod.">
              <select value={globalForm.paymentMode} onChange={(e) => setGlobalForm((prev) => ({ ...prev, paymentMode: e.target.value }))}>
                {(settings?.paymentModes || ["OFF", "OPTIONAL", "REQUIRED"]).map((mode) => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </InputRow>
            <InputRow label="Global komisyon (bps)" help="Örnek: 250 = %2.50">
              <input
                type="number"
                min="0"
                max="10000"
                value={globalForm.commissionBps}
                onChange={(e) => setGlobalForm((prev) => ({ ...prev, commissionBps: e.target.value }))}
              />
            </InputRow>
            <InputRow label="Not" help="İç not. Ticari snapshot içine doğrudan yazılmaz.">
              <textarea rows="3" value={globalForm.note} onChange={(e) => setGlobalForm((prev) => ({ ...prev, note: e.target.value }))} />
            </InputRow>
            <div className="muted">Son güncelleme: {fmtDateTime(settings?.globalRule?.updatedAt)}</div>
            <button className="btn" onClick={saveGlobal} disabled={busyKey === "global" || !settingsWritable}>
              {busyKey === "global" ? "Kaydediliyor..." : "Global ayarı kaydet"}
            </button>
          </div>
        </Card>

        <Card title="Oda bazlı override">
          <div style={{ display: "grid", gap: 12 }}>
            <InputRow label="Oda ara" help="Önce odayı seç, sonra override kaydet.">
              <input value={roomQuery} onChange={(e) => setRoomQuery(e.target.value)} placeholder="Oda adı yaz" disabled={!settingsWritable} />
            </InputRow>
            <div style={{ maxHeight: 180, overflow: "auto", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 8 }}>
              {!settingsWritable ? <div className="muted">Ayar endpointi hazır olmadan oda override seçimi kapalı.</div> : filteredRooms.length ? filteredRooms.map((room) => (
                <button
                  key={room.id}
                  className="btn sm"
                  style={{ width: "100%", justifyContent: "space-between", marginBottom: 6 }}
                  onClick={() => applyRoom(room)}
                  disabled={!settingsWritable}
                >
                  <span>{room.name}</span>
                  <span>#{room.id}</span>
                </button>
              )) : <div className="muted">Eşleşen oda bulunamadı.</div>}
            </div>
            <InputRow label="Seçili oda">
              <input value={roomForm.roomId} readOnly placeholder="Önce oda seç" />
            </InputRow>
            <InputRow label="Payment mode">
              <select value={roomForm.paymentMode} onChange={(e) => setRoomForm((prev) => ({ ...prev, paymentMode: e.target.value }))}>
                {(settings?.paymentModes || ["OFF", "OPTIONAL", "REQUIRED"]).map((mode) => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </InputRow>
            <InputRow label="Oda komisyonu (bps)">
              <input
                type="number"
                min="0"
                max="10000"
                value={roomForm.commissionBps}
                onChange={(e) => setRoomForm((prev) => ({ ...prev, commissionBps: e.target.value }))}
              />
            </InputRow>
            <InputRow label="Not">
              <textarea rows="3" value={roomForm.note} onChange={(e) => setRoomForm((prev) => ({ ...prev, note: e.target.value }))} />
            </InputRow>
            <button className="btn" onClick={saveRoomOverride} disabled={busyKey === "room" || !roomForm.roomId || !settingsWritable}>
              {busyKey === "room" ? "Kaydediliyor..." : "Oda override kaydet"}
            </button>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 14 }}>
        <Card title={`Aktif oda override listesi (${settings?.roomOverrideCount || 0})`}>
          {roomOverrides.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {roomOverrides.map((item) => (
                <div key={item.id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 10, display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700 }}>{item.roomName || `Oda #${item.roomId}`}</div>
                    <button className="btn sm" disabled={busyKey === `disable:${item.roomId}` || !settingsWritable} onClick={() => disableRoomOverride(item.roomId)}>
                      {busyKey === `disable:${item.roomId}` ? "Kapatılıyor..." : "Override kapat"}
                    </button>
                  </div>
                  <div>{item.paymentMode} • {fmtBps(item.commissionBps)}</div>
                  <div className="muted">Room #{item.roomId} • Son güncelleme: {fmtDateTime(item.updatedAt)}</div>
                  {item.note ? <div className="muted">Not: {item.note}</div> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="muted">Aktif oda override yok. Tüm yeni ticari kaynaklar global ayarı kullanır.</div>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>M85 opsiyonel ödeme pilotu</div>
        <div className="muted">
          {pilotStatus?.summary || "OPTIONAL moddaki ticari kaynaklar pilot listesine alınabilir. READY olanlar yalnız pilot hazırlık görünürlüğü taşır; gerçek charge/payout hala dormant kalır."}
        </div>
        {pilotEndpointStatus !== "ok" || pilotCandidatesEndpointStatus !== "ok" ? (
          <div className="muted" style={{ color: "#ffb17b" }}>
            {pilotEndpointStatus === "forbidden"
              ? "Opsiyonel ödeme pilot yüzeyi için önce TOTP step-up doğrulamasını tamamla."
              : pilotEndpointStatus === "missing"
              ? "Opsiyonel ödeme pilot endpointi bu çalışmakta olan sunucuda yok görünüyor. Sunucuyu yeniden başlat veya son backend kodunu ayağa kaldır."
              : "Opsiyonel ödeme pilot yüzeyi şu an sınırlı erişimde."}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Pilot özeti">
          <div>{pilotStatus?.activeMilestone || "M85"}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Hazır: {pilotStatus?.readyCount || 0} • Bekleyen: {pilotStatus?.dormantCount || 0}
          </div>
        </Card>
        <Card title="OPTIONAL adaylar">
          <div>{pilotStatus?.candidateCount || 0} kaynak</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Global veya oda override OPTIONAL ise yeni ticari kaynak burada görünür.
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 14 }}>
        <Card title="Opsiyonel ödeme pilot listesi">
          {Array.isArray(pilotCandidates) && pilotCandidates.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {pilotCandidates.map((item) => {
                const settlementStatus = String(item?.settlementStatus || item?.settlementPlan?.status || "DORMANT").toUpperCase();
                const isReady = settlementStatus === "READY";
                const busyOn = busyKey === `pilot:on:${item.id}`;
                const busyOff = busyKey === `pilot:off:${item.id}`;
                return (
                  <div key={item.id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 10, display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{item.sourceKey}</div>
                      <div>{isReady ? "READY" : settlementStatus}</div>
                    </div>
                    <div>{item.sourceType} • {item.roomName || `Oda #${item.roomId || "-"}`} • {item.companyName || `Şirket #${item.companyId || "-"}`}</div>
                    <div className="muted">Mode: {item.paymentModeSnapshot} • Komisyon: {fmtBps(item.commissionBpsSnapshot)} • Son güncelleme: {fmtDateTime(item.updatedAt)}</div>
                    <div className="muted">Brüt: {item?.settlementPlan?.grossAmount ?? item?.amountCompanySnapshot ?? 0} • Komisyon: {item?.settlementPlan?.commissionAmount ?? 0} • Sağlayıcı net: {item?.settlementPlan?.providerNetAmount ?? item?.amountProviderSnapshot ?? 0}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn sm" disabled={!pilotWritable || isReady || busyOn} onClick={() => activatePilot(item.id)}>
                        {busyOn ? "Hazırlanıyor..." : "Pilot READY yap"}
                      </button>
                      <button className="btn sm" disabled={!pilotWritable || !isReady || busyOff} onClick={() => deactivatePilot(item.id)}>
                        {busyOff ? "Kapatılıyor..." : "Pilot DORMANT yap"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="muted">OPTIONAL modda pilot adayı kaynak yok. Önce payment mode OPTIONAL olacak şekilde yeni sözleşme veya vardiya serisi üret.</div>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>M86 zorunlu ödeme rollout'u</div>
        <div className="muted">
          {requiredStatus?.summary || "REQUIRED moddaki ticari kaynaklar ACTIVE/DISABLED akışıyla yönetilir. ACTIVE durumda settlement planı aktif, entry satırları READY görünür; gerçek provider entegrasyonu hala dormant adapter üstünden temsil edilir."}
        </div>
        {requiredEndpointStatus !== "ok" || requiredCandidatesEndpointStatus !== "ok" ? (
          <div className="muted" style={{ color: "#ffb17b" }}>
            {requiredEndpointStatus === "forbidden"
              ? "Zorunlu ödeme rollout yüzeyi için önce TOTP step-up doğrulamasını tamamla."
              : requiredEndpointStatus === "missing"
              ? "Zorunlu ödeme rollout endpointi bu çalışmakta olan sunucuda yok görünüyor. Sunucuyu yeniden başlat veya son backend kodunu ayağa kaldır."
              : "Zorunlu ödeme rollout yüzeyi şu an sınırlı erişimde."}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Rollout özeti">
          <div>{requiredStatus?.activeMilestone || "M86"}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Aktif: {requiredStatus?.activeCount || 0} • Bekleyen: {requiredStatus?.waitingCount || 0} • Durdurulan: {requiredStatus?.disabledCount || 0}
          </div>
        </Card>
        <Card title="REQUIRED adaylar">
          <div>{requiredStatus?.candidateCount || 0} kaynak</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Global veya oda override REQUIRED ise yeni ticari kaynak burada zorunlu rollout adayı olarak görünür.
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 14 }}>
        <Card title="Zorunlu ödeme rollout listesi">
          {Array.isArray(requiredCandidates) && requiredCandidates.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {requiredCandidates.map((item) => {
                const settlementStatus = String(item?.settlementStatus || item?.settlementPlan?.status || "DORMANT").toUpperCase();
                const isActive = settlementStatus === "ACTIVE";
                const isDisabled = settlementStatus === "DISABLED";
                const busyOn = busyKey === `required:on:${item.id}`;
                const busyOff = busyKey === `required:off:${item.id}`;
                return (
                  <div key={item.id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 10, display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{item.sourceKey}</div>
                      <div>{settlementStatus}</div>
                    </div>
                    <div>{item.sourceType} • {item.roomName || `Oda #${item.roomId || "-"}`} • {item.companyName || `Şirket #${item.companyId || "-"}`}</div>
                    <div className="muted">Mode: {item.paymentModeSnapshot} • Komisyon: {fmtBps(item.commissionBpsSnapshot)} • Son güncelleme: {fmtDateTime(item.updatedAt)}</div>
                    <div className="muted">Brüt: {item?.settlementPlan?.grossAmount ?? item?.amountCompanySnapshot ?? 0} • Komisyon: {item?.settlementPlan?.commissionAmount ?? 0} • Sağlayıcı net: {item?.settlementPlan?.providerNetAmount ?? item?.amountProviderSnapshot ?? 0}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn sm" disabled={!requiredWritable || isActive || busyOn} onClick={() => activateRequired(item.id)}>
                        {busyOn ? "Aktifleştiriliyor..." : "Rollout ACTIVE yap"}
                      </button>
                      <button className="btn sm" disabled={!requiredWritable || (!isActive && isDisabled) || busyOff} onClick={() => deactivateRequired(item.id)}>
                        {busyOff ? "Durduruluyor..." : "Rollout DISABLED yap"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="muted">REQUIRED modda rollout adayı kaynak yok. Önce payment mode REQUIRED olacak şekilde yeni sözleşme veya vardiya serisi üret.</div>
          )}
        </Card>
      </div>
      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>M87 ödeme hesabı hazırlığı</div>
        <div className="muted">
          {accountStatus?.summary || "Şirket ve oda tarafındaki ödeme hesabı metadata/readiness durumu bu yüzeyde görünür. Bu faz gerçek charge/payout açmaz."}
        </div>
        {accountEndpointStatus !== "ok" || accountCandidatesEndpointStatus !== "ok" ? (
          <div className="muted" style={{ color: "#ffb17b" }}>
            {accountEndpointStatus === "forbidden"
              ? "Ödeme hesabı hazırlık yüzeyi için önce TOTP step-up doğrulamasını tamamla."
              : accountEndpointStatus === "missing"
              ? "Ödeme hesabı hazırlık endpointi bu çalışmakta olan sunucuda yok görünüyor. Sunucuyu yeniden başlat veya son backend kodunu ayağa kaldır."
              : "Ödeme hesabı hazırlık yüzeyi şu an sınırlı erişimde."}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Hesap hazırlık özeti">
          <div>{accountStatus?.activeMilestone || "M87"}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Şirket hazır: {accountStatus?.companyReadyCount || 0}/{accountStatus?.companyCandidateCount || 0} • Oda hazır: {accountStatus?.roomReadyCount || 0}/{accountStatus?.roomCandidateCount || 0}
          </div>
        </Card>
        <Card title="Eksik / hata">
          <div>Eksik: {(accountStatus?.companyMissingCount || 0) + (accountStatus?.roomMissingCount || 0)}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Hata: {(accountStatus?.companyErrorCount || 0) + (accountStatus?.roomErrorCount || 0)} • Platform hesabı: {accountStatus?.platformAccountCount || 0}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Ödeme hesabı metadata formu">
          <div style={{ display: "grid", gap: 12 }}>
            <InputRow label="Sahip tipi" help="Company veya Room için owner id girilir.">
              <select value={accountForm.ownerType} onChange={(e) => setAccountForm((prev) => ({ ...prev, ownerType: e.target.value }))}>
                {["COMPANY", "ROOM", "PLATFORM"].map((mode) => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            </InputRow>
            <InputRow label="Owner id" help="PLATFORM için boş bırakabilirsin.">
              <input value={accountForm.ownerId} onChange={(e) => setAccountForm((prev) => ({ ...prev, ownerId: e.target.value }))} placeholder="ör: 12" />
            </InputRow>
            <InputRow label="Provider key" help="Şimdilik DORMANT kalabilir.">
              <input value={accountForm.providerKey} onChange={(e) => setAccountForm((prev) => ({ ...prev, providerKey: e.target.value }))} />
            </InputRow>
            <InputRow label="Durum">
              <select value={accountForm.status} onChange={(e) => setAccountForm((prev) => ({ ...prev, status: e.target.value }))}>
                {["INACTIVE", "ACTIVE", "VERIFIED", "ERROR"].map((mode) => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            </InputRow>
            <InputRow label="Etiket">
              <input value={accountForm.label} onChange={(e) => setAccountForm((prev) => ({ ...prev, label: e.target.value }))} placeholder="ör: Şirket ana hesap" />
            </InputRow>
            <InputRow label="Maskeli IBAN">
              <input value={accountForm.maskedIban} onChange={(e) => setAccountForm((prev) => ({ ...prev, maskedIban: e.target.value }))} placeholder="TR** **** **** 1234" />
            </InputRow>
            <InputRow label="Account ref">
              <input value={accountForm.accountRef} onChange={(e) => setAccountForm((prev) => ({ ...prev, accountRef: e.target.value }))} placeholder="provider ref" />
            </InputRow>
            <InputRow label="Not">
              <textarea rows="3" value={accountForm.note} onChange={(e) => setAccountForm((prev) => ({ ...prev, note: e.target.value }))} />
            </InputRow>
            <button className="btn" onClick={savePaymentAccount} disabled={busyKey === "account" || !accountWritable}>
              {busyKey === "account" ? "Kaydediliyor..." : "Hesap metadata kaydet"}
            </button>
          </div>
        </Card>

        <Card title="Ödeme hesabı aday listesi">
          {Array.isArray(accountCandidates) && accountCandidates.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {accountCandidates.map((item) => (
                <div key={item.key} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 10, display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700 }}>{item.ownerName}</div>
                    <div>{item.accountStatus || "MISSING"}</div>
                  </div>
                  <div>{item.ownerType} • Mode: {item.paymentModeHint} • Settlement: {item.settlementStatusHint}</div>
                  <div className="muted">Kaynak: {item.sourceType} • {item.sourceKey} • Son güncelleme: {fmtDateTime(item.updatedAt)}</div>
                  <div className="muted">Hesap: {item?.account?.label || "-"} • Provider: {item?.account?.providerKey || "-"} • IBAN: {item?.account?.maskedIban || "-"}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn sm" disabled={!accountWritable} onClick={() => applyAccountCandidate(item)}>Forma al</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="muted">OPTIONAL/REQUIRED modda hesap hazırlık adayı kaynak yok.</div>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>M88 settlement operasyon masası</div>
        <div className="muted">
          {settlementStatus?.summary || "READY/PLANNED/EXECUTED settlement entry satırları Super Admin yüzeyinde görünür ve manuel operasyon akışıyla yönetilir."}
        </div>
        {settlementEndpointStatus !== "ok" || settlementQueueEndpointStatus !== "ok" ? (
          <div className="muted" style={{ color: "#ffb17b" }}>
            {settlementEndpointStatus === "forbidden"
              ? "Settlement operasyon yüzeyi için önce TOTP step-up doğrulamasını tamamla."
              : settlementEndpointStatus === "missing"
              ? "Settlement operasyon endpointi bu çalışmakta olan sunucuda yok görünüyor. Sunucuyu yeniden başlat veya son backend kodunu ayağa kaldır."
              : "Settlement operasyon yüzeyi şu an sınırlı erişimde."}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Settlement özet">
          <div>{settlementStatus?.activeMilestone || "M88"}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            READY: {settlementStatus?.readyCount || 0} • PLANNED: {settlementStatus?.plannedCount || 0} • EXECUTED: {settlementStatus?.executedCount || 0}
          </div>
        </Card>
        <Card title="Hazırlık / blok">
          <div>Finans hazır: {settlementStatus?.financeReadyCount || 0}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Bloklu: {settlementStatus?.blockedCount || 0} • Kuyruk: {settlementStatus?.candidateCount || 0}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 14 }}>
        <Card title="Settlement operasyon kuyruğu">
          {Array.isArray(settlementQueue) && settlementQueue.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {settlementQueue.map((item) => {
                const status = String(item?.entryStatus || "DORMANT").toUpperCase();
                const busyPlan = busyKey === `settlement:plan:${item.entryId}`;
                const busyReady = busyKey === `settlement:ready:${item.entryId}`;
                const busyExecute = busyKey === `settlement:execute:${item.entryId}`;
                const busyCancel = busyKey === `settlement:cancel:${item.entryId}`;
                const canPlan = settlementWritable && item.financeReady && ["READY", "PLANNED"].includes(status);
                const canExecute = settlementWritable && item.financeReady && ["READY", "PLANNED"].includes(status);
                const canReady = settlementWritable && ["PLANNED", "CANCELLED", "READY"].includes(status);
                const canCancel = settlementWritable && ["READY", "PLANNED", "CANCELLED"].includes(status);
                return (
                  <div key={item.entryId} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 10, display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{item.entryKind} • {item.sourceKey}</div>
                      <div>{status}</div>
                    </div>
                    <div>{item.sourceType} • {item.roomName || `Oda #${item.roomId || "-"}`} • {item.companyName || `Şirket #${item.companyId || "-"}`}</div>
                    <div className="muted">Tutar: {item.amount || 0} {item.currencyCode || "TRY"} • Mode: {item.paymentModeSnapshot} • Plan: {item.settlementPlanStatus}</div>
                    <div className="muted">Finans hazırlık: {item.financeReady ? "Hazır" : "Bloklu"} • Şirket hesap: {item?.companyAccount?.status || "MISSING"} • Oda hesap: {item.roomId ? (item?.roomAccount?.status || "MISSING") : "N/A"}</div>
                    <div className="muted">Provider ref: {item.providerRef || "-"} • Vade: {fmtDateTime(item.dueAt)} • Son güncelleme: {fmtDateTime(item.updatedAt)}</div>
                    {item.note ? <div className="muted">Not: {item.note}</div> : null}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn sm" disabled={!canPlan || busyPlan} onClick={() => markSettlementPlanned(item)}>
                        {busyPlan ? "Planlanıyor..." : "PLANNED yap"}
                      </button>
                      <button className="btn sm" disabled={!canReady || busyReady} onClick={() => markSettlementReady(item)}>
                        {busyReady ? "Hazırlanıyor..." : "READY yap"}
                      </button>
                      <button className="btn sm" disabled={!canExecute || busyExecute} onClick={() => markSettlementExecuted(item)}>
                        {busyExecute ? "İşleniyor..." : "EXECUTED yap"}
                      </button>
                      <button className="btn sm" disabled={!canCancel || busyCancel} onClick={() => markSettlementCancelled(item)}>
                        {busyCancel ? "İptal ediliyor..." : "CANCELLED yap"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="muted">Settlement operasyon kuyruğunda görünür satır yok.</div>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 18, padding: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>M89 settlement mutabakat masası</div>
        <div className="muted">
          {reconciliationStatus?.summary || "PLANNED/EXECUTED satırlar için bekliyor-eşleşti-inceleme-uyuşmazlık-kapandı döngüsü görünür olur. Bu faz gerçek provider webhook yerine manuel mutabakat izi tutar."}
        </div>
        {reconciliationEndpointStatus !== "ok" || reconciliationQueueEndpointStatus !== "ok" ? (
          <div className="muted" style={{ color: "#ffb17b" }}>
            {reconciliationEndpointStatus === "forbidden"
              ? "Settlement mutabakat yüzeyi için önce TOTP step-up doğrulamasını tamamla."
              : reconciliationEndpointStatus === "missing"
              ? "Settlement mutabakat endpointi bu çalışmakta olan sunucuda yok görünüyor. Sunucuyu yeniden başlat veya son backend kodunu ayağa kaldır."
              : "Settlement mutabakat yüzeyi şu an sınırlı erişimde."}
          </div>
        ) : null}
        <div style={{ marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Card title="Mutabakat özet">
            <div>{reconciliationStatus?.activeMilestone || "M89"}</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Bekliyor: {reconciliationStatus?.pendingCount || 0} • Eşleşti: {reconciliationStatus?.matchedCount || 0}
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              İnceleme: {reconciliationStatus?.reviewCount || 0} • Uyuşmazlık: {reconciliationStatus?.mismatchCount || 0} • Kapandı: {reconciliationStatus?.closedCount || 0}
            </div>
          </Card>
          <Card title="Risk sinyali">
            <div>Eksik provider ref: {reconciliationStatus?.missingProviderRefCount || 0}</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Vadesi geçen planlı: {reconciliationStatus?.overduePlannedCount || 0} • Kuyruk: {reconciliationStatus?.candidateCount || 0}
            </div>
          </Card>
        </div>
        <Card title="Settlement mutabakat kuyruğu">
          {Array.isArray(reconciliationQueue) && reconciliationQueue.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {reconciliationQueue.map((item) => {
                const state = String(item?.reconciliationStatus || "BEKLIYOR").toUpperCase();
                const busyMatched = busyKey === `recon:ESLESTI:${item.entryId}`;
                const busyReview = busyKey === `recon:INCELEME_GEREKLI:${item.entryId}`;
                const busyMismatch = busyKey === `recon:UYUSMAZLIK:${item.entryId}`;
                const busyClosed = busyKey === `recon:KAPANDI:${item.entryId}`;
                return (
                  <div key={`recon-${item.entryId}`} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 10, display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{item.entryKind} • {item.sourceKey}</div>
                      <div>{state}</div>
                    </div>
                    <div>{item.sourceType} • {item.roomName || `Oda #${item.roomId || "-"}`} • {item.companyName || `Şirket #${item.companyId || "-"}`}</div>
                    <div className="muted">Beklenen: {item.reconciliationExpectedAmount ?? item.amount ?? 0} • Gelen: {item.reconciliationReceivedAmount ?? item.amount ?? 0} • Delta: {item.reconciliationDeltaAmount ?? 0}</div>
                    <div className="muted">Provider ref: {item.providerRef || "-"} • Harici ref: {item.reconciliationExternalRef || "-"} • Son güncelleme: {fmtDateTime(item.reconciliationLastUpdatedAt)}</div>
                    <div className="muted">{item.missingProviderRef ? "Eksik provider ref var. " : ""}{item.overduePlanned ? "Plan vadesi geçti. " : ""}{item.reconciliationNote ? `Not: ${item.reconciliationNote}` : "Mutabakat notu yok."}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn sm" disabled={!reconciliationWritable || busyMatched} onClick={() => saveReconciliation(item, "ESLESTI")}>{busyMatched ? "Kaydediliyor..." : "Eşleşti"}</button>
                      <button className="btn sm" disabled={!reconciliationWritable || busyReview} onClick={() => saveReconciliation(item, "INCELEME_GEREKLI")}>{busyReview ? "Kaydediliyor..." : "İnceleme"}</button>
                      <button className="btn sm" disabled={!reconciliationWritable || busyMismatch} onClick={() => saveReconciliation(item, "UYUSMAZLIK")}>{busyMismatch ? "Kaydediliyor..." : "Uyuşmazlık"}</button>
                      <button className="btn sm" disabled={!reconciliationWritable || busyClosed} onClick={() => saveReconciliation(item, "KAPANDI")}>{busyClosed ? "Kaydediliyor..." : "Kapandı"}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="muted">Settlement mutabakat kuyruğunda görünür satır yok.</div>
          )}
        </Card>
      </div>

    </div>
  );
}
