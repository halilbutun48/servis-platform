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

function todayWeekBit() {
  // JS: 0=Sun..6=Sat -> our bits: Mon=1..Sun=64
  const d = new Date();
  const wd = d.getDay();
  if (wd === 0) return 64; // Sun
  return 1 << (wd - 1); // Mon..Sat
}

function Card({ title, desc, right, onClick }) {
  return (
    <div className="card" style={{ cursor: "pointer" }} onClick={onClick}>
      <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
          {desc ? (
            <div className="muted" style={{ marginTop: 4 }}>
              {desc}
            </div>
          ) : null}
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
  const [openOffersCount, setOpenOffersCount] = useState(0);

  const today = useMemo(() => todayYmd(), []);
  const todayBit = useMemo(() => todayWeekBit(), []);

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

    // ✅ M28: open offers summary (OPEN/COUNTERED)
    try {
      const oo = await api("/api/offers/company?status=OPEN,COUNTERED&take=800", { token });
      const items = Array.isArray(oo?.items) ? oo.items : [];
      setOpenOffersCount(items.length);
    } catch {
      setOpenOffersCount(0);
    }
  }

  useEffect(() => {
    if (!token) return;
    loadRooms();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const stats = useMemo(() => {
    const todayAgreements = (agreements || []).filter((a) => {
      const st = String(a?.status || "").toUpperCase();
      if (!["REQUESTED", "APPROVED", "ACTIVE"].includes(st)) return false;
      const sd = String(a?.startDate || "").slice(0, 10);
      const ed = String(a?.endDate || "").slice(0, 10);
      if (!sd || !ed) return false;
      if (sd > today || ed < today) return false;
      const wm = Number(a?.weekMask || 0);
      if (!wm) return false;
      return (wm & todayBit) !== 0;
    }).length;

    const todayShiftCount = (shifts || []).filter((s) => String(s?.startAt || "").slice(0, 10) === today).length;
    const marketShiftCount = (shifts || []).filter((s) => !s?.roomId).length;

    return {
      todayAgreements,
      todayShiftCount,
      marketShiftCount,
    };
  }, [agreements, shifts, today, todayBit]);

  return (
    <div className="wrap">
      <div className="card">
        <div className="title">Company — Planlama Merkezi</div>
        <div className="muted">
          Amaç: <b>minimum tık</b>. Önce <b>Agreement</b> ile planla → gerekirse <b>Market</b> ile çoklu teklif topla → sonra <b>Shifts</b> ile operasyon.
        </div>
      </div>

      {geoNeedsReview > 0 ? (
        <div className="card" style={{ border: "1px solid #f2c", marginTop: 12 }}>
          <div style={{ fontWeight: 900 }}>⚠ Geo Review gerekli</div>
          <div className="muted" style={{ marginTop: 4 }}>
            {geoNeedsReview} personel konumu <b>NEEDS_REVIEW</b>. Planlama doğruluğu için önce düzeltmen önerilir.
          </div>
          <div style={{ marginTop: 8 }}>
            <button type="button" onClick={() => navigate("/company/georeview")}>Geo Review’e git</button>
          </div>
        </div>
      ) : null}

      {err ? (
        <div className="card err" style={{ marginTop: 10 }}>
          {err}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginTop: 12 }}>
        <Card title="Bugünkü Agreements" desc="Bugün planlanan vardiyalar" right={stats.todayAgreements} onClick={() => navigate("/company/agreements")} />
        <Card title="Açık Teklifler" desc="OPEN + COUNTERED" right={openOffersCount} onClick={() => navigate("/company/shifts")} />
        <Card title="Market Shifts" desc="Room seçmeden talep aç" right={stats.marketShiftCount} onClick={() => navigate("/company/shifts")} />
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
          İpucu: Agreement oluşturduktan sonra istersen <b>Market</b> ile birden fazla room’dan teklif toplayabilirsin.
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
