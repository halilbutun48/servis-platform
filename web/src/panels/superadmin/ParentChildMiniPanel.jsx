import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";

function labelStudent(p) {
  if (!p) return "-";
  const name = p.fullName || p.user?.fullName || "";
  const phone = p.phone || p.user?.phone || "";
  const company = p.company?.name ? ` • ${p.company.name}` : "";
  const id = p.id != null ? `#${p.id}` : "#?";
  return `${id} ${name}${phone ? ` (${phone})` : ""}${company}`.trim();
}

export default function ParentChildMiniPanel({ token, parentUserId }) {
  const [students, setStudents] = useState([]);
  const [links, setLinks] = useState([]);
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const loadAllStudents = useCallback(async () => {
    const res = await api("/api/personels", { token });
    const list = Array.isArray(res) ? res : res?.items || [];
    // M80+ ile: Personel.kind === 'STUDENT'. Eski repolarda kind yok → hepsini göster.
    const filtered = list.filter((p) => (p?.kind ? p.kind === "STUDENT" : true));
    setStudents(filtered);
  }, [token]);

  const loadLinks = useCallback(async () => {
    const qs = new URLSearchParams();
    qs.set("parentUserId", String(parentUserId));
    const res = await api(`/api/admin/parent-children?${qs.toString()}`, { token });
    const list = res?.items || res || [];
    setLinks(Array.isArray(list) ? list : []);
  }, [parentUserId, token]);

  const refresh = useCallback(async () => {
    setErr("");
    setBusy(true);
    try {
      await Promise.all([loadAllStudents(), loadLinks()]);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [loadAllStudents, loadLinks]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const studentsById = useMemo(() => {
    const m = new Map();
    (students || []).forEach((p) => m.set(Number(p.id), p));
    return m;
  }, [students]);

  const linkedPersonelIds = useMemo(() => new Set((links || []).map((x) => Number(x.personelId))), [links]);

  const filtered = useMemo(() => {
    const query = String(q || "").trim().toLowerCase();
    const list = students || [];
    if (!query) return list.slice(0, 220);
    return list
      .filter((p) => {
        const hay = `${p?.id ?? ""} ${p?.fullName ?? ""} ${p?.phone ?? ""} ${p?.company?.name ?? ""}`.toLowerCase();
        return hay.includes(query);
      })
      .slice(0, 220);
  }, [students, q]);

  async function bind() {
    const pid = Number(selId);
    if (!pid) return;
    if (linkedPersonelIds.has(pid)) {
      setErr("Bu öğrenci zaten bağlı.");
      return;
    }

    setBusy(true);
    setErr("");
    try {
      await api("/api/admin/parent-children", {
        method: "POST",
        token,
        body: { parentUserId: Number(parentUserId), personelId: pid },
      });
      setSelId("");
      await loadLinks();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function unbind(linkId) {
    const ok = window.confirm("Bağlantı kaldırılsın mı?");
    if (!ok) return;

    setBusy(true);
    setErr("");
    try {
      await api(`/api/admin/parent-children/${linkId}`, { method: "DELETE", token });
      await loadLinks();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800 }}>Parent ↔ Öğrenci Bağlantıları</div>
          <div className="muted">PARENT kullanıcısına STUDENT (Personel.kind=STUDENT) bağla. (KVKK/time-window gate yine geçerli.)</div>
        </div>
        <div className="saActions">
          <span className="pill" data-status="COUNT">
            {links?.length || 0} bağlı
          </span>
          <button className="btn sm" disabled={busy} onClick={refresh}>
            Yenile
          </button>
        </div>
      </div>

      {err ? <div style={{ color: "#ff7b7b", marginTop: 10, whiteSpace: "pre-wrap" }}>{err}</div> : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
        <div className="toolbar" style={{ gap: 10 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Öğrenci ara (ad / tel / okul)" style={{ minWidth: 260 }} />
          <select value={selId} onChange={(e) => setSelId(e.target.value)} style={{ minWidth: 360 }}>
            <option value="">Öğrenci seç…</option>
            {filtered.map((p) => (
              <option key={p.id} value={p.id}>
                {labelStudent(p)}
              </option>
            ))}
          </select>
          <button className="btn" disabled={busy || !selId} onClick={bind}>
            Bağla
          </button>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 10 }}>
          {(links || []).map((x) => {
            const p = x.personel || studentsById.get(Number(x.personelId));
            return (
              <div key={x.id || `${x.parentUserId}-${x.personelId}`} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", alignItems: "center" }}>
                <div style={{ opacity: 0.95 }}>{labelStudent(p) || `#${x.personelId}`}</div>
                <button className="btn sm" disabled={busy} onClick={() => unbind(x.id)}>
                  Kaldır
                </button>
              </div>
            );
          })}
          {(!links || links.length === 0) && <div style={{ opacity: 0.75 }}>Henüz bağlı öğrenci yok.</div>}
        </div>
      </div>
    </div>
  );
}
