// web/src/panels/company/GeoReviewPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { getPath, navigate } from "../../router";
import { resolveRuntimeScopeKey } from "../../copilot/screenRegistry";
import { useSession } from "../../state/session";
import GeoLocationPicker from "../../components/geo/GeoLocationPicker";
import { companyPath } from "../../utils/paths";
import { isSchool, personLabel } from "../../utils/labels";
import { clearCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { buildGeoReviewFacts } from "../../utils/copilotFacts";
import { getCompanyGeoNeedsReview, getCompanyPersonels } from "../../utils/companyDataHub";
import { clearUiDataCache } from "../../utils/uiDataCache";
import { rowSelectionStyle } from "../../utils/listUi";

const GUIDED_TEMP_STORAGE_KEY = "psv1:guidedTempShiftIds:v1";
const GUIDED_RESUME_KEY = "psv1:guidedResume:v1";
const GEOREVIEW_OPEN_MODE_KEY = "psv1:georeview:openMode:v1";
const REASON_OPTIONS = [
  { value: "", label: "Tüm nedenler" },
  { value: "ADDRESS_ONLY", label: "Adres var, koordinat yok" },
  { value: "INVALID_COORD", label: "Koordinat eksik/geçersiz" },
  { value: "MISSING_ADDRESS", label: "Adres ve koordinat yok" },
  { value: "MANUAL_OVERRIDE", label: "Elle doğrulandı" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Tüm durumlar" },
  { value: "NEEDS_REVIEW", label: "İncelenecek" },
  { value: "OK", label: "Hazır" },
  { value: "FAILED", label: "Başarısız" },
];

function sanitizeAddress(v) {
  return String(v || "").trim().replace(/\s+/g, " ");
}

function normalizeCoord(v, kind) {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (kind === "lat" && Math.abs(n) > 90) return null;
  if (kind === "lng" && Math.abs(n) > 180) return null;
  return n;
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "OK") return { color: "#22c55e", bg: "rgba(34,197,94,.14)" };
  if (s === "NEEDS_REVIEW") return { color: "#f59e0b", bg: "rgba(245,158,11,.14)" };
  if (s === "FAILED") return { color: "#ef4444", bg: "rgba(239,68,68,.14)" };
  return { color: "#cbd5e1", bg: "rgba(148,163,184,.12)" };
}

function readGuidedResume(basePath) {
  try {
    const raw = localStorage.getItem(GUIDED_RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (String(parsed.basePath || "") !== String(basePath || "")) return null;
    const ts = Number(parsed.ts || 0);
    if (Number.isFinite(ts) && ts > 0 && Date.now() - ts > 1000 * 60 * 60 * 12) return null;
    return {
      step: Number(parsed.step || 2) || 2,
      personId: Number(parsed.personId || 0) || null,
      source: String(parsed.source || ""),
    };
  } catch {
    return null;
  }
}

function readGuidedTempShiftIds() {
  try {
    const raw = localStorage.getItem(GUIDED_TEMP_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => Number(x || 0))
      .filter((x) => Number.isFinite(x) && x > 0);
  } catch {
    return [];
  }
}

function readSessionPersonIds(companyKey) {
  const ids = new Set();
  try {
    const shiftIds = readGuidedTempShiftIds();
    shiftIds.forEach((sid) => {
      const key = `psv1:company:${companyKey}:shift:${sid}:people:v1`;
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      parsed.forEach((p) => {
        const pid = Number(p?.personelId ?? p?.id ?? 0);
        if (Number.isFinite(pid) && pid > 0) ids.add(pid);
      });
    });
  } catch {
    // ignore
  }
  return Array.from(ids);
}

function readOpenIntent() {
  try {
    const raw = String(localStorage.getItem(GEOREVIEW_OPEN_MODE_KEY) || "").trim();
    localStorage.removeItem(GEOREVIEW_OPEN_MODE_KEY);
    if (!raw) return { mode: "", source: "", forceRefresh: false };
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw);
      return {
        mode: String(parsed?.mode || "").trim().toUpperCase(),
        source: String(parsed?.source || "").trim().toLowerCase(),
        forceRefresh: parsed?.forceRefresh === true,
      };
    }
    return { mode: raw.toUpperCase(), source: "", forceRefresh: false };
  } catch {
    return { mode: "", source: "", forceRefresh: false };
  }
}

function formatGeoReason(item) {
  return item?.geoReasonText || item?.geoNote || "Neden yok";
}

export default function GeoReviewPanel() {
  const { me, token } = useSession();
  const who = personLabel(me);
  const school = isSchool(me);
  const basePath = companyPath(me, "");
  const companyKey = String(me?.companyId ?? me?.id ?? "unknown");
  const guidedResume = useMemo(() => readGuidedResume(basePath), [basePath]);
  const preferredSelectedId = Number(guidedResume?.personId || 0) || null;
  const [openIntent] = useState(() => readOpenIntent());
  const openMode = String(openIntent?.mode || "").toUpperCase();
  const openedFromWorkflow = String(openIntent?.source || "") === "workflow";
  const prefersPlanningScope = openMode === "SESSION" || (!!guidedResume && openMode !== "ALL");

  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState(() => (prefersPlanningScope ? "" : "NEEDS_REVIEW"));
  const [selectedId, setSelectedId] = useState(null);
  const [preferredApplied, setPreferredApplied] = useState(false);
  const [bulkStats, setBulkStats] = useState({ found: 0, notFound: 0, error: 0 });
  const [scopeMode, setScopeMode] = useState("ALL");
  const [scopeAutoSeeded, setScopeAutoSeeded] = useState(false);
  const [bulkClearBusy, setBulkClearBusy] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    homeAddress: "",
    lat: "",
    lng: "",
  });

  const scopedIds = useMemo(() => readSessionPersonIds(companyKey), [companyKey, busy]);
  const scopedIdsKey = useMemo(() => scopedIds.join(','), [scopedIds]);
  const hasPlanningScope = scopedIds.length > 0;

  useEffect(() => {
    if (openIntent?.forceRefresh) {
      clearUiDataCache("/api/company/personels");
    }
    const timer = setTimeout(() => setDebouncedQ(String(q || "").trim()), 260);
    return () => clearTimeout(timer);
  }, [openIntent, q]);

  useEffect(() => {
    if (!hasPlanningScope && scopeMode !== "ALL") {
      setScopeMode("ALL");
      return;
    }
    if (openMode === "ALL") {
      setScopeMode("ALL");
      setScopeAutoSeeded(true);
      return;
    }
    if (scopeAutoSeeded) return;
    if (!guidedResume) return;
    if (!hasPlanningScope) return;
    setScopeMode("SESSION");
    setScopeAutoSeeded(true);
  }, [guidedResume, hasPlanningScope, openMode, scopeAutoSeeded, scopeMode]);

  const needsExpandedDataset = !!reason || (!!status && status !== "NEEDS_REVIEW");

  async function load(signal, { force = false } = {}) {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const kind = school ? "STUDENT" : "PERSONEL";
      const wantsFocusedReview = !String(debouncedQ || "").trim() && !needsExpandedDataset;
      const mustHonorSessionScope = scopeMode === "SESSION" && hasPlanningScope;
      const scopedTake = Math.min(500, Math.max(scopedIds.length * 4, 60));
      let nextItems = [];
      if (wantsFocusedReview) {
        const reviewResp = await getCompanyGeoNeedsReview(token, { signal, force, kind, take: mustHonorSessionScope ? scopedTake : 120, ttlMs: 22000, delayMs: 120 });
        nextItems = Array.isArray(reviewResp?.items) ? reviewResp.items : [];
        if (!nextItems.length) {
          const fallback = await getCompanyPersonels(token, { signal, force, kind, q: debouncedQ, take: mustHonorSessionScope ? scopedTake : 120, ttlMs: 22000, delayMs: 140 });
          nextItems = Array.isArray(fallback?.items) ? fallback.items : [];
        }
      } else {
        const primary = await getCompanyPersonels(token, { signal, force, kind, q: debouncedQ, take: mustHonorSessionScope ? scopedTake : (debouncedQ ? 30 : 80), ttlMs: 25000, delayMs: 180 });
        nextItems = Array.isArray(primary?.items) ? primary.items : [];
        if (!nextItems.length && !String(debouncedQ || "").trim()) {
          const fallback = await getCompanyGeoNeedsReview(token, { signal, force: true, kind, take: 120, ttlMs: 25000, delayMs: 140 });
          if (Array.isArray(fallback?.items) && fallback.items.length) nextItems = fallback.items;
        }
      }
      if (signal?.aborted) return;
      setItems(nextItems);
      setBulkStats({ found: 0, notFound: 0, error: 0 });
    } catch (e) {
      if (e?.name === "AbortError") return;
      setErr(e?.message || String(e));
    } finally {
      if (!signal?.aborted) setBusy(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) load(controller.signal, { force: !!openIntent?.forceRefresh });
    }, 320);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [school, debouncedQ, token, scopeMode, hasPlanningScope, scopedIdsKey, openIntent]);

  useEffect(() => {
    if (!needsExpandedDataset) return;
    const controller = new AbortController();
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) load(controller.signal, { force: false });
    }, 180);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsExpandedDataset, school, debouncedQ, token, scopeMode, hasPlanningScope, scopedIdsKey]);

  const filtered = useMemo(() => {
    const s = String(q || "").trim().toLowerCase();
    const scopedSet = new Set(scopedIds.map((x) => Number(x)));
    return (items || []).filter((p) => {
      const itemId = Number(p?.id || 0);
      if (scopeMode === "SESSION" && scopedSet.size > 0 && !scopedSet.has(itemId)) return false;
      if (status && String(p.geoStatus || "") !== status) return false;
      if (reason && String(p.geoReason || p.geoNote || "") !== reason) return false;
      if (!s) return true;
      const t = `${p.fullName || ""} ${p.homeAddress || ""}`.toLowerCase();
      return t.includes(s);
    });
  }, [items, q, reason, status, scopeMode, scopedIds]);

  const counts = useMemo(() => {
    const base = { total: items.length, visible: filtered.length, ok: 0, review: 0, failed: 0, noCoord: 0 };
    filtered.forEach((it) => {
      const st = String(it.geoStatus || "").toUpperCase();
      if (st === "OK") base.ok += 1;
      else if (st === "NEEDS_REVIEW") base.review += 1;
      else if (st === "FAILED") base.failed += 1;
      if (!(Number.isFinite(Number(it.homeLat)) && Number.isFinite(Number(it.homeLng)))) base.noCoord += 1;
    });
    return base;
  }, [items, filtered]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null);
    } else if (!preferredApplied && preferredSelectedId && filtered.some((x) => Number(x.id) === Number(preferredSelectedId))) {
      if (Number(selectedId) !== Number(preferredSelectedId)) setSelectedId(preferredSelectedId);
      setPreferredApplied(true);
    } else {
      const exists = filtered.some((x) => Number(x.id) === Number(selectedId));
      if (!exists) setSelectedId(filtered[0].id);
    }

    if (scopeMode !== "SESSION" || !hasPlanningScope || busy) return;
    if (filtered.length > 0) return;
    if (!items.length) return;
    if (!String(q || "").trim() && !reason && status === "NEEDS_REVIEW") {
      setStatus("");
      setMsg("Bu planlamadaki kayıtlar bulundu. Sadece incelemede olanlar yerine tüm durumlar gösteriliyor.");
      return;
    }
    setMsg("Bu planlamadaki kayıtlar mevcut ama seçtiğin filtreyle görünmüyor. İstersen üstteki filtreleri genişlet veya tüm şirket kayıtlarına geç.");
  }, [busy, filtered, hasPlanningScope, items.length, preferredApplied, preferredSelectedId, q, reason, scopeMode, selectedId, status]);

  const selected = useMemo(
    () => filtered.find((x) => Number(x.id) === Number(selectedId)) || filtered[0] || null,
    [filtered, selectedId]
  );

  useEffect(() => {
    if (!selected) {
      setForm({ fullName: "", homeAddress: "", lat: "", lng: "" });
      return;
    }
    setForm({
      fullName: selected.fullName || "",
      homeAddress: selected.homeAddress || "",
      lat: selected.homeLat == null ? "" : String(selected.homeLat),
      lng: selected.homeLng == null ? "" : String(selected.homeLng),
    });
  }, [selected]);

  function patchItem(id, patch) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function moveToNextItem(currentId) {
    const list = filtered || [];
    const idx = list.findIndex((it) => Number(it?.id) === Number(currentId));
    if (idx >= 0 && idx < list.length - 1) setSelectedId(list[idx + 1].id);
  }

  async function geocodeOne(itemLike) {
    const query = sanitizeAddress(itemLike?.homeAddress);
    if (!query) throw new Error("Adres boş.");
    return api("/api/geocode", { method: "POST", body: { q: query, country: "tr" } });
  }

  async function geocodeSelected() {
    if (!selected) return;
    setGeoBusy(true);
    setErr("");
    setMsg("");
    try {
      const resp = await geocodeOne({ homeAddress: form.homeAddress });
      const nextLat = normalizeCoord(resp?.lat, "lat");
      const nextLng = normalizeCoord(resp?.lng, "lng");
      if (typeof nextLat !== "number" || typeof nextLng !== "number") throw new Error("Adres için koordinat bulunamadı.");
      setForm((prev) => ({ ...prev, lat: String(nextLat), lng: String(nextLng) }));
      setMsg("Adres bulundu. Gerekirse haritada ince ayar yapıp Kaydet'e bas.");
    } catch (e) {
      if (e?.status === 404) setErr("Adres bulunamadı.");
      else setErr(e?.message || String(e));
    } finally {
      setGeoBusy(false);
    }
  }

  async function saveSelected({ markOk = false, advanceNext = false } = {}) {
    if (!selected) return;
    const nextLat = normalizeCoord(form.lat, "lat");
    const nextLng = normalizeCoord(form.lng, "lng");
    const hasManualCoords = typeof nextLat === "number" && typeof nextLng === "number";
    const saveId = selected.id;

    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const resp = await api(`/api/company/personels/${saveId}/location`, {
        method: "PUT",
        body: {
          fullName: String(form.fullName || "").trim(),
          homeAddress: String(form.homeAddress || "").trim() || null,
          lat: form.lat === "" ? null : nextLat,
          lng: form.lng === "" ? null : nextLng,
          geoManualOverride: markOk ? true : hasManualCoords,
          geoStatus: markOk ? "OK" : undefined,
        },
      });
      if (resp?.item) {
        clearUiDataCache("/api/company/personels");
        patchItem(saveId, resp.item);
        if (advanceNext) moveToNextItem(saveId);
        setMsg(markOk ? "Kayıt OK yapıldı." : advanceNext ? "Konum kaydedildi. Sıradaki kayıt açıldı." : "Konum kaydedildi.");
      }
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }


  async function bulkClear(fields) {
    const normalized = Array.from(new Set((Array.isArray(fields) ? fields : []).map((x) => String(x)).filter(Boolean)));
    const ids = filtered.map((p) => Number(p?.id || 0)).filter((x) => Number.isFinite(x) && x > 0);
    if (!normalized.length || !ids.length) return;
    const key = normalized.slice().sort().join(",");
    setBulkClearBusy(key);
    setErr("");
    setMsg("");
    try {
      const resp = await api(`/api/company/personels/bulk-clear`, {
        method: "POST",
        body: { ids, fields: normalized },
      });
      const clearedAddress = normalized.includes("address");
      const clearedPhone = normalized.includes("phone");
      clearUiDataCache("/api/company/personels");
      setItems((prev) => prev.map((item) => {
        if (!ids.includes(Number(item?.id || 0))) return item;
        return {
          ...item,
          ...(clearedAddress ? { homeAddress: null } : {}),
          ...(clearedPhone ? { phone: null } : {}),
        };
      }));
      if (selected && ids.includes(Number(selected.id))) {
        setForm((prev) => ({
          ...prev,
          ...(clearedAddress ? { homeAddress: "" } : {}),
        }));
      }
      await load();
      const labels = [];
      if (clearedPhone) labels.push("telefon");
      if (clearedAddress) labels.push("adres");
      setMsg(`${labels.join(" + ")} temizlendi. Etkilenen kayıt: ${Number(resp?.updatedCount || ids.length)}.`);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBulkClearBusy("");
    }
  }

  async function bulkGeocode() {
    const candidates = filtered.filter((p) => {
      const why = String(p.geoReason || p.geoNote || "");
      return why === "ADDRESS_ONLY" || why === "INVALID_COORD" || why === "MISSING_ADDRESS";
    });
    if (!candidates.length) return;
    setBusy(true);
    setErr("");
    setMsg("");
    let found = 0;
    let notFound = 0;
    let error = 0;
    try {
      for (const item of candidates) {
        try {
          const resp = await geocodeOne(item);
          const lat = normalizeCoord(resp?.lat, "lat");
          const lng = normalizeCoord(resp?.lng, "lng");
          if (typeof lat !== "number" || typeof lng !== "number") {
            error += 1;
            continue;
          }
          const saved = await api(`/api/company/personels/${item.id}/location`, {
            method: "PUT",
            body: {
              fullName: item.fullName,
              homeAddress: item.homeAddress || null,
              lat,
              lng,
              geoManualOverride: true,
              geoStatus: "OK",
            },
          });
          if (saved?.item) {
            clearUiDataCache("/api/company/personels");
            patchItem(item.id, saved.item);
          }
          found += 1;
        } catch (e) {
          if (e?.status === 404) notFound += 1;
          else error += 1;
        }
      }
      setBulkStats({ found, notFound, error });
      setMsg(`Toplu işlem bitti. Bulundu: ${found} • Bulunamadı: ${notFound} • Hata: ${error}`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  const selectedReason = formatGeoReason(selected);

  const copilotScopeKey = useMemo(() => resolveRuntimeScopeKey(getPath(), "/company/georeview"), []);

  useEffect(() => {
    if (!selected) {
      clearCopilotSelection(copilotScopeKey);
      return;
    }
    const hasCoord = Number.isFinite(Number(selected?.homeLat)) && Number.isFinite(Number(selected?.homeLng));
    const fields = [
      { label: "Ad Soyad", value: selected?.fullName || "-", help: "Düzenlediğin kişi kaydını gösterir." },
      { label: "Adres", value: selected?.homeAddress || "-", help: "Geçici adres bilgisidir; lat/lon üretiminden sonra temizlenebilir." },
      { label: "Durum", value: selected?.geoStatus || "-", help: "Konum kaydının hazır mı incelemede mi olduğunu gösterir." },
      { label: "Koordinat", value: hasCoord ? `${Number(selected.homeLat).toFixed(5)}, ${Number(selected.homeLng).toFixed(5)}` : "Yok", help: "Kalıcı olarak esas ihtiyaç duyulan lat/lon bilgisidir." },
      { label: "Neden", value: selectedReason || "-", help: "Neden inceleme gerektiğini anlatan açıklamadır." },
    ];
    const facts = buildGeoReviewFacts({ selected, counts, scopeMode, hasPlanningScope });
    const badges = [
      { label: "Durum", value: String(selected?.geoStatus || "-").toUpperCase(), help: "Konum hazırlık veya inceleme durumunu gösterir." },
      ...(String(selected?.geoReason || selected?.geoNote || "").toUpperCase().includes("MANUAL") ? [{ label: "MANUAL_OVERRIDE", value: "VAR", help: "Kayıt elle doğrulanmış veya düzeltilmiştir." }] : []),
    ];
    setCopilotSelection({
      scopeKey: copilotScopeKey,
      entityType: "screen",
      entityId: 2109,
      label: selected?.fullName || `Kayıt #${selected?.id || "-"}`,
      summary: [selected?.geoStatus || null, hasCoord ? `${Number(selected.homeLat).toFixed(5)}, ${Number(selected.homeLng).toFixed(5)}` : "Koordinat yok"].filter(Boolean).join(" • "),
      fields,
      badges,
      facts,
      snapshot: {
        rowType: school ? "student" : "personel",
        rowLabel: selected?.fullName || `Kayıt #${selected?.id || "-"}`,
        rowHint: "Önce durum ve koordinat var mı bak. Sonra neden alanına göre kaydet, adresten bul veya büyük harita kararını ver.",
        fields,
        badges,
      },
    });
    return () => clearCopilotSelection(copilotScopeKey);
  }, [selected, selectedReason, school, copilotScopeKey]);

  return (
    <div style={{ width: "100%", maxWidth: "none" }}>
      <div className="card">
        <div className="topbar" style={{ alignItems: "flex-start", gap: 12 }}>
          <div>
            <div className="title">{school ? "Öğrenci Konum Seçici" : `${who} Konum Seçici`}</div>
            <div className="muted">
              Liste solda, harita sağda. Adresi kullanıp konum üret, sonra KVKK için gereksiz verileri temizle. Bu ekran company/personel ve school/öğrenci için ortak çalışır.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {hasPlanningScope ? (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setScopeMode((p) => {
                    const next = p === "SESSION" ? "ALL" : "SESSION";
                    if (next === "SESSION" && !String(q || "").trim() && !reason) setStatus("");
                    return next;
                  });
                }}
              >
                {scopeMode === "SESSION" ? "Tüm şirket kayıtlarını göster" : "Sadece bu planlamadakileri göster"}
              </button>
            ) : null}
            <button type="button" className="btn primary" onClick={() => navigate(basePath)}>
              {guidedResume ? "Rehberli adıma geri dön" : school ? "Okul Merkezi'ne dön" : "Planlama Merkezi'ne dön"}
            </button>
          </div>
        </div>

        {hasPlanningScope ? (
          <div className="card" style={{ marginTop: 12, borderColor: "rgba(59,130,246,.32)", background: "rgba(37,99,235,.08)" }}>
            <div style={{ fontWeight: 700 }}>
              {scopeMode === "SESSION" ? "Planlama oturumu filtresi açık" : "Planlama oturumu bulundu"}
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              Bu ekranda tüm kayıtları tek tek düzeltebilir, istersen sadece aktif planlamadakileri filtreleyebilirsin. Böylece hem genel temizlik yapılır hem de işi bitirince aynı rehberli adıma dönmek kolaylaşır.
            </div>
          </div>
        ) : null}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            placeholder="Ara: ad / adres"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 240 }}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ minWidth: 180 }}>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select value={reason} onChange={(e) => setReason(e.target.value)} style={{ minWidth: 200 }}>
            {REASON_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button onClick={() => load(undefined, { force: true })} disabled={busy || geoBusy}>{busy ? "..." : "Yenile"}</button>
          <button onClick={bulkGeocode} disabled={busy || geoBusy || bulkClearBusy || !filtered.length}>
            {busy ? "Çalışıyor..." : "Toplu Adresten Bul"}
          </button>
          <button type="button" className="btn" onClick={() => bulkClear(["address"])} disabled={busy || geoBusy || !!bulkClearBusy || !filtered.length}>
            {bulkClearBusy === "address" ? "Çalışıyor..." : "Tüm Adresleri Temizle"}
          </button>
          <div className="muted">
            Görünen: <b>{counts.visible}</b> / Toplam: <b>{counts.total}</b> • Hazır: <b>{counts.ok}</b> • İncelenecek: <b>{counts.review}</b> • Başarısız: <b>{counts.failed}</b> • Koordinatsız: <b>{counts.noCoord}</b>
          </div>
        </div>

        {err ? <div className="card err" style={{ marginTop: 12 }}>{err}</div> : null}
        {msg ? (
          <div className="card" style={{ marginTop: 12, borderColor: "rgba(34,197,94,.35)", background: "rgba(6,34,20,.25)" }}>
            {msg}
          </div>
        ) : null}
        {(bulkStats.found || bulkStats.notFound || bulkStats.error) ? (
          <div className="muted" style={{ marginTop: 10 }}>
            Son toplu işlem → Bulundu: <b>{bulkStats.found}</b> • Bulunamadı: <b>{bulkStats.notFound}</b> • Hata: <b>{bulkStats.error}</b>
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(420px, 1.1fr) minmax(420px, 1fr)", gap: 12, marginTop: 12 }}>
        <div className="card" style={{ minHeight: 620 }}>
          <div className="topbar">
            <div>
              <div className="title">{school ? "Öğrenci listesi" : `${who} listesi`}</div>
              <div className="muted">Bir kayıt seç, sağ tarafta haritadan pin ayarla. Guided akıştan gelirsen varsayılan görünüm sadece o planlamadaki kayıtlar olur; istersen tek tuşla tüm şirket kayıtlarına geçebilirsin.</div>
            </div>
            <div className="muted">
              {scopeMode === "SESSION" ? "Planlama oturumu" : "Tüm şirket kayıtları"} • <b>{filtered.length}</b>
            </div>
          </div>

          <div style={{ overflowX: "auto", marginTop: 12, maxHeight: 540 }}>
            <table className="tbl" style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ad Soyad</th>
                  <th>Adres</th>
                  <th>Durum</th>
                  <th>Koordinat</th>
                  <th>Seç</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => {
                  const active = Number(p.id) === Number(selected?.id);
                  const tone = statusTone(p.geoStatus);
                  const hasCoord = Number.isFinite(Number(p.homeLat)) && Number.isFinite(Number(p.homeLng));
                  return (
                    <tr key={p.id} onClick={() => setSelectedId(p.id)} style={rowSelectionStyle(active)}>
                      <td>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.fullName || "-"}</div>
                        <div className="muted" style={{ fontSize: 12 }}>#{p.id} • {p.kind || (school ? "STUDENT" : "PERSONEL")}</div>
                      </td>
                      <td style={{ minWidth: 320 }}>
                        <div>{p.homeAddress || "-"}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{formatGeoReason(p)}</div>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "4px 10px",
                            borderRadius: 999,
                            color: tone.color,
                            background: tone.bg,
                            border: `1px solid ${tone.color}33`,
                            fontWeight: 600,
                          }}
                        >
                          {p.geoStatus || "-"}
                        </span>
                      </td>
                      <td className="muted">{hasCoord ? `${Number(p.homeLat).toFixed(5)}, ${Number(p.homeLng).toFixed(5)}` : "Yok"}</td>
                      <td>
                        <button type="button" className={active ? "btn sm primary" : "btn sm"} onClick={(e) => { e.stopPropagation(); setSelectedId(p.id); }}>
                          {active ? "Seçili" : "Seç"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length ? (
                  <tr>
                    <td colSpan={6} className="muted" style={{ padding: 12 }}>
                      {scopeMode === "SESSION" && hasPlanningScope
                        ? "Bu planlama oturumunda gösterilecek kayıt bulunamadı. Kartta sayı görünse bile bu ekran dar kapsamda açılmış olabilir; üstten tüm şirket kayıtlarına geçip tekrar kontrol et."
                        : openedFromWorkflow
                          ? "Workflow kartından açıldı ama kayıt görünmüyor. Yenile ile company/personel listesini tekrar çekip kontrol et."
                          : "Kayıt bulunamadı."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <GeoLocationPicker
          title={school ? "Öğrenci konum seçici" : `${who} konum seçici`}
          subtitle="Adresi düzelt, adresten bul veya haritada tıklayarak pimi seç. İstersen lat/lng alanlarını elle değiştir. İş bitince rehberli adıma geri dönüp kaldığın yerden devam edebilirsin."
          selectedName={selected?.fullName || "-"}
          address={form.homeAddress}
          onAddressChange={(value) => setForm((prev) => ({ ...prev, homeAddress: value }))}
          lat={form.lat}
          lng={form.lng}
          onPick={(lat, lng) => setForm((prev) => ({ ...prev, lat: String(lat.toFixed(6)), lng: String(lng.toFixed(6)) }))}
          onLatChange={(value) => setForm((prev) => ({ ...prev, lat: value }))}
          onLngChange={(value) => setForm((prev) => ({ ...prev, lng: value }))}
          onGeocode={geocodeSelected}
          onSave={() => saveSelected()}
          onSaveNext={() => saveSelected({ advanceNext: true })}
          onMarkOk={() => saveSelected({ markOk: true })}
          onClear={() => setForm((prev) => ({ ...prev, lat: "", lng: "" }))}
          busy={busy || !selected}
          geoBusy={geoBusy}
          statusLabel={selected?.geoStatus || "-"}
          reasonLabel={selectedReason}
        />
      </div>
    </div>
  );
}

