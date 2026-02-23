import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { navigate } from "../../router";
import AgreementWizard from "./AgreementWizard";

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function Card({ title, desc, right, onClick }) {
  return (
    <div className="card" style={{ cursor: "pointer" }} onClick={onClick}>
      <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
          {desc ? <div className="muted" style={{ marginTop: 4 }}>{desc}</div> : null}
        </div>
        {right != null ? <div style={{ fontWeight: 900, fontSize: 18 }}>{right}</div> : null}
      </div>
    </div>
  );
}

export default function WorkflowPanel() {
  const { token } = useSession();

  const [err, setErr] = useState("");
  const [rooms, setRooms] = useState([]);
  const [roomsSupported, setRoomsSupported] = useState(true);

  const [agreements, setAgreements] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [geoNeedsReview, setGeoNeedsReview] = useState(0);

  const today = useMemo(() => todayYmd(), []);

  async function loadRooms() {
    if (!token) return;
    setRoomsSupported(true);
    try {
      const resp = await api("/api/rooms?take=200", { token });
      const list = resp?.items ?? [];
      setRooms(Array.isArray(list) ? list : []);
    } catch {
      setRooms([]);
      setRoomsSupported(false);
    }
  }

  async function loadStats() {
    if (!token) return;
    setErr("");

    try {
      const a = await api("/api/agreements?take=200", { token });
      setAgreements(Array.isArray(a?.items) ? a.items : []);
    } catch {
      setAgreements([]);
    }

    try {
      const s = await api("/api/shifts?take=200", { token });
      const items = Array.isArray(s?.items) ? s.items : Array.isArray(s) ? s : [];
      setShifts(items);
    } catch {
      setShifts([]);
    }

    try {
      const gr = await api("/api/company/personels?geoStatus=NEEDS_REVIEW", { token });
      const items = Array.isArray(gr?.items) ? gr.items : [];
      setGeoNeedsReview(items.length);
    } catch {
      setGeoNeedsReview(0);
    }
  }

  useEffect(() => {
    if (!token) return;
    loadRooms();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const stats = useMemo(() => {
    const by = { REQUESTED: 0, APPROVED: 0, ACTIVE: 0, DONE: 0, CANCELLED: 0, REJECTED: 0 };
    for (const a of agreements || []) {
      const k = String(a.status || "").toUpperCase();
      if (by[k] != null) by[k]++;
    }

    const todayShiftCount = (shifts || []).filter((s) => String(s?.startAt || "").slice(0, 10) === today).length;
    const marketShiftCount = (shifts || []).filter((s) => !s?.roomId).length;

    return {
      agreementsActive: by.ACTIVE + by.APPROVED + by.REQUESTED,
      todayShiftCount,
      marketShiftCount,
    };
  }, [agreements, shifts, today]);

  return (
    <div className="wrap">
      <div className="card">
        <div className="title">Company — Planlama Merkezi</div>
        <div className="muted">
          Amaç: <b>minimum tık</b>. Önce <b>Agreement</b> ile planla → gerekirse <b>Market</b> ile çoklu teklif topla → sonra <b>Shifts</b> ile operasyon.
        </div>
      </div>

      {err ? <div className="card err" style={{ marginTop: 10 }}>{err}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginTop: 12 }}>
        <Card title="Agreements" desc="Planlama / rezervasyon (primary)" right={stats.agreementsActive} onClick={() => navigate("/company/agreements")} />
        <Card title="Market" desc="Room seçmeden shift aç → çoklu room teklif" right={stats.marketShiftCount} onClick={() => navigate("/company/shifts")} />
        <Card title="Geo Review" desc="Adres/konum sorunlarını düzelt" right={geoNeedsReview} onClick={() => navigate("/company/georeview")} />
        <Card title="Bugünkü Shifts" desc="Operasyon (start/reached/complete)" right={stats.todayShiftCount} onClick={() => navigate("/company/shifts")} />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Yeni Plan Oluştur (Agreement Wizard)</div>
        <div className="muted" style={{ marginTop: 4 }}>
          Kullanıcı "vardiya" düşünmesin: <b>paket seç</b> (Sabah/Akşam/Sabah+Akşam) → <b>room seç</b> → <b>tarih</b> → oluştur.
        </div>

        <div style={{ marginTop: 10 }}>
          <AgreementWizard
            rooms={rooms}
            roomsSupported={roomsSupported}
            onReloadRooms={loadRooms}
            geoNeedsReview={geoNeedsReview}
            onCreated={loadStats}
            renderTrigger={(open) => (
              <button type="button" onClick={open} disabled={!roomsSupported}>
                Wizard’ı Aç
              </button>
            )}
          />

          {!roomsSupported ? (
            <div className="muted" style={{ marginTop: 8, color: "#b85" }}>
              /api/rooms endpoint bulunamadı. Önce Room directory (M22+) çalışmalı.
            </div>
          ) : null}
        </div>

        <div className="muted" style={{ marginTop: 10 }}>
          İpucu: Geo Review sayısı &gt; 0 ise önce düzelt, sonra planla.
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Kısa akış</div>
        <ol className="muted" style={{ marginTop: 8 }}>
          <li>Geo Review: konumlar OK olsun</li>
          <li>Agreement: haftalık planı aç (wizard ile)</li>
          <li>Market: birden fazla room’dan teklif topla (gerekirse)</li>
          <li>Shifts: o gün operasyonu takip et</li>
        </ol>
      </div>
    </div>
  );
}
