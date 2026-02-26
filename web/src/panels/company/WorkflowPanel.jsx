import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { navigate } from "../../router";
import GuidedPlanModal from "./GuidedPlanModal";

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

function pill(status) {
  const s = String(status || "");
  return (
    <span className="pill" data-status={s} title={s}>
      {s}
    </span>
  );
}

function fmtTR(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTRY(amount) {
  if (amount == null) return "-";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("tr-TR").format(n);
}

function KpiCard({ title, desc, right, onClick }) {
  return (
    <div
      className="kpiCard"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
    >
      <div className="kpiLabel">{title}</div>
      <div className="kpiValue">{right ?? "-"}</div>
      {desc ? <div className="kpiDesc">{desc}</div> : null}
    </div>
  );
}

function ChecklistRow({ done, title, desc, actionLabel, onAction }) {
  return (
    <div className="row" style={{ gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
      <div>
        <div style={{ fontWeight: 800 }}>
          <span style={{ marginRight: 8 }}>{done ? "✅" : "⬜"}</span>
          {title}
        </div>
        {desc ? <div className="muted" style={{ marginTop: 2 }}>{desc}</div> : null}
      </div>
      {actionLabel ? (
        <button type="button" className="btn sm" onClick={onAction} style={{ whiteSpace: "nowrap" }}>
          {actionLabel}
        </button>
      ) : null}
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

  const [offersModal, setOffersModal] = useState({
    open: false,
    status: "OPEN,COUNTERED",
    q: "",
    items: [],
  });

  const today = useMemo(() => todayYmd(), []);
  const todayBit = useMemo(() => todayWeekBit(), []);

  const [guidedOpen, setGuidedOpen] = useState(false);

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

    // ✅ open offers summary (OPEN/COUNTERED)
    try {
      const oo = await api("/api/offers/company?status=OPEN,COUNTERED&take=800", { token });
      const items = Array.isArray(oo?.items) ? oo.items : [];
      setOpenOffersCount(items.length);
    } catch {
      setOpenOffersCount(0);
    }
  }

  async function loadCompanyOffers(status = offersModal.status) {
    if (!token) return;
    try {
      const qs = status ? `status=${encodeURIComponent(status)}&take=400` : "take=400";
      const r = await api(`/api/offers/company?${qs}`, { token });
      const items = Array.isArray(r?.items) ? r.items : [];
      setOffersModal((p) => ({ ...p, items }));
    } catch (e) {
      setOffersModal((p) => ({ ...p, items: [] }));
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => {
    if (!token) return;
    loadRooms();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!offersModal.open) return;
    loadCompanyOffers(offersModal.status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offersModal.open, offersModal.status]);

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

  const guide = useMemo(() => {
    const geoOk = geoNeedsReview === 0;
    const hasAgreementToday = stats.todayAgreements > 0;

    // "Teklifleri değerlendir" adımı: açık teklif varsa aksiyon gerekli; yoksa OK (opsiyonel adım).
    const offersOk = openOffersCount === 0;

    const hasShiftToday = stats.todayShiftCount > 0;

    const doneCount = [geoOk, hasAgreementToday, offersOk, hasShiftToday].filter(Boolean).length;

    return { geoOk, hasAgreementToday, offersOk, hasShiftToday, doneCount, total: 4 };
  }, [geoNeedsReview, stats.todayAgreements, stats.todayShiftCount, openOffersCount]);

  const offersFiltered = useMemo(() => {
    const qq = String(offersModal.q || "").trim().toLowerCase();
    const items = Array.isArray(offersModal.items) ? offersModal.items : [];
    if (!qq) return items;

    return items.filter((o) => {
      const shift = o.shift || {};
      const room = o.room || {};
      const hay = [
        o.id,
        o.shiftId,
        o.roomId,
        o.status,
        shift.status,
        room.name,
        o.noteCompany,
        o.noteRoom,
        o.amountCompany,
        o.amountRoom,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(qq);
    });
  }, [offersModal.items, offersModal.q]);

  function openOffers() {
    setOffersModal((p) => ({ ...p, open: true }));
  }

  function closeOffers() {
    setOffersModal((p) => ({ ...p, open: false }));
  }

  function goCompanyShift(shiftId) {
    const sid = Number(shiftId);
    if (!sid) return;
    // Basit: Shifts'e git. (İstersen sonraki milestone'da otomatik highlight ekleriz)
    navigate("/company/shifts");
  }

  return (
    <div className="wrap">
      <div className="card">
        <div className="title">Company — Planlama Merkezi</div>
        <div className="muted">
          Amaç: <b>minimum tık</b>. Önce <b>Agreement</b> ile planla → gerekirse <b>Market</b> ile çoklu teklif topla → sonra <b>Shifts</b> ile operasyon.
        </div>
      </div>

      {geoNeedsReview > 0 ? (
        <div className="card" style={{ border: "2px solid #f2c", marginTop: 12 }}>
          <div style={{ fontWeight: 900 }}>⚠ Geo Review gerekli</div>
          <div className="muted" style={{ marginTop: 4 }}>
            {geoNeedsReview} personel konumu <b>NEEDS_REVIEW</b>. Planlama doğruluğu için önce düzeltmen önerilir.
          </div>
          <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={() => navigate("/company/georeview")}>Geo Review’e git</button>
            <button type="button" className="btn" onClick={loadStats}>Yenile</button>
          </div>
        </div>
      ) : null}

      {err ? (
        <div className="card err" style={{ marginTop: 10 }}>
          {err}
        </div>
      ) : null}

      <div className="kpiGrid" style={{ marginTop: 12 }}>
        <KpiCard title="Bugünkü Agreements" desc="Bugün planlanan vardiyalar" right={stats.todayAgreements} onClick={() => navigate("/company/agreements")} />
        <KpiCard title="Açık Teklifler" desc="OPEN + COUNTERED" right={openOffersCount} onClick={openOffers} />
        <KpiCard title="Market Shifts" desc="Room seçmeden talep aç" right={stats.marketShiftCount} onClick={() => navigate("/company/shifts")} />
        <KpiCard title="Geo Review" desc="Adres/konum sorunlarını düzelt" right={geoNeedsReview} onClick={() => navigate("/company/georeview")} />
        <KpiCard title="Bugünkü Shifts" desc="Operasyon (start/reached/complete)" right={stats.todayShiftCount} onClick={() => navigate("/company/shifts")} />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Yeni Plan Oluştur (Guided Mode)</div>
        <div className="muted" style={{ marginTop: 4 }}>
          Tek akış: <b>Şirket konumu</b> → <b>Plan paketi</b> → <b>Personel/Durak</b> → <b>Matris/Çöz</b> → <b>Toplu teklif gönder</b>.
        </div>

        <div style={{ marginTop: 10 }}>
          <button type="button" className="btn primary" onClick={() => setGuidedOpen(true)} disabled={!roomsSupported}>
            Rehberi Başlat
          </button>
        </div>

        <div className="muted" style={{ marginTop: 10 }}>
          İpucu: Pazarlık/teklif takibini "Bekleyen Talepler" alanından yaparsın.
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900 }}>Rehber (Adım adım)</div>
          <div className="muted">
            {guide.doneCount}/{guide.total}
          </div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <ChecklistRow
            done={guide.geoOk}
            title="1) Geo Review"
            desc={guide.geoOk ? "Konumlar OK" : "NEEDS_REVIEW varsa düzelt"}
            actionLabel={guide.geoOk ? "" : "Geo Review’e git"}
            onAction={() => navigate("/company/georeview")}
          />

          <ChecklistRow
            done={guide.hasAgreementToday}
            title="2) Agreement"
            desc={guide.hasAgreementToday ? "Bugün için plan var" : "Guided Mode ile plan oluştur"}
            actionLabel={guide.hasAgreementToday ? "Agreements" : "Plan oluştur"}
            onAction={() => {
              if (guide.hasAgreementToday) navigate("/company/agreements");
              else setGuidedOpen(true);
            }}
          />

          <ChecklistRow
            done={guide.offersOk}
            title="3) Teklifler"
            desc={guide.offersOk ? "Açık teklif yok (OK)" : "Açık teklif var: değerlendir"}
            actionLabel={guide.offersOk ? "" : "Teklifleri aç"}
            onAction={openOffers}
          />

          <ChecklistRow
            done={guide.hasShiftToday}
            title="4) Shifts"
            desc={guide.hasShiftToday ? "Bugün operasyon var" : "Henüz bugünkü shift yok"}
            actionLabel="Shifts"
            onAction={() => navigate("/company/shifts")}
          />
        </div>
      </div>

      {/* ✅ M29-B: Company offers modal */}
      {offersModal.open ? (
        <div className="modal-backdrop">
          <div className="modal card">
          <div className="row" style={{ justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 900 }}>Açık Teklifler</div>
              <div className="muted">Company’ye gelen/gönderilen market teklifleri (OPEN/COUNTERED).</div>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn" onClick={() => loadCompanyOffers(offersModal.status)}>Yenile</button>
              <button type="button" className="btn" onClick={closeOffers}>Kapat</button>
            </div>
          </div>

          <div className="row" style={{ marginTop: 10, gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
              Durum
              <select
                value={offersModal.status}
                onChange={(e) => setOffersModal((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="OPEN,COUNTERED">OPEN + COUNTERED</option>
                <option value="OPEN">OPEN</option>
                <option value="COUNTERED">COUNTERED</option>
                <option value="">Tümü</option>
              </select>
            </label>

            <input
              value={offersModal.q}
              onChange={(e) => setOffersModal((p) => ({ ...p, q: e.target.value }))}
              placeholder="Ara (shiftId/room/status/not)"
              style={{ minWidth: 240 }}
            />

            <div className="muted">Toplam: {offersFiltered.length}</div>
          </div>

          <div style={{ overflowX: "auto", marginTop: 10 }}>
            <table className="tbl" style={{ minWidth: 980 }}>
              <thead>
                <tr>
                  <th>Shift</th>
                  <th>Shift Status</th>
                  <th>Room</th>
                  <th>Offer</th>
                  <th>Tutar</th>
                  <th>Not</th>
                  <th>Güncelleme</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {offersFiltered.map((o) => {
                  const shift = o.shift || {};
                  const room = o.room || {};
                  return (
                    <tr key={o.id}>
                      <td className="muted">#{o.shiftId}</td>
                      <td>{pill(shift.status)}</td>
                      <td className="muted">{room?.name ? `${room.name} (#${room.id})` : `#${o.roomId}`}</td>
                      <td>{pill(o.status)}</td>
                      <td className="muted">
                        C: <b>{formatTRY(o.amountCompany)}</b> • R: <b>{formatTRY(o.amountRoom)}</b>
                      </td>
                      <td className="muted" title={(o.noteCompany || "") + " " + (o.noteRoom || "")}>
                        {o.noteRoom || o.noteCompany || "-"}
                      </td>
                      <td className="muted">{fmtTR(o.updatedAt)}</td>
                      <td>
                        <button type="button" className="btn sm" onClick={() => goCompanyShift(o.shiftId)}>
                          Shift’e git
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {offersFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="muted">Kayıt yok.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      ) : null}

      <GuidedPlanModal
        open={guidedOpen}
        onClose={() => setGuidedOpen(false)}
        rooms={rooms}
        roomsSupported={roomsSupported}
        onReloadRooms={loadRooms}
        onAfterCreated={() => {
          loadStats();
          navigate("/company/shifts");
        }}
      />
    </div>
  );
}
