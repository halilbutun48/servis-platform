import { ProviderScoreBadge } from "../../components/ProviderScoreBadge";
import { fmtTR } from "./guidedPlanModalUtils";

export { GuidedDestinationRowCard, GuidedOrganizationPlanCard } from "./guidedPlanModalDestinationCards";

export function GuidedOrganizationReadinessCard({ orgDraftCompletion, orgEstimatedPax }) {
  return (
    <div className="card" style={{ border: orgDraftCompletion.ready ? "1px solid #2a7" : "1px solid #b85" }}>
      <div style={{ fontWeight: 800 }}>{orgDraftCompletion.ready ? "✅ Markete gönderime hazır" : "⚠ Plan henüz tam değil"}</div>
      <div className="muted" style={{ marginTop: 6 }}>
        {orgDraftCompletion.ready
          ? `Tahmini kişi: ${Number(orgEstimatedPax || 0) || 0} • Tüm yerler koordinatlı • Taslak shift'lerde ${orgDraftCompletion.expectedStops} ziyaret noktası hazır.`
          : orgDraftCompletion.reasons.join(" • ")}
      </div>
      <div className="muted" style={{ marginTop: 6 }}>Not: Organization işlerinde plan tam oluşmadan markete düşmez.</div>
    </div>
  );
}

export function GuidedCompanyGeoGateCard({ companyGeoGate }) {
  return (
    <div className="card" style={{ border: companyGeoGate.blocking ? "1px solid #b85" : "1px solid #2a7" }}>
      <div style={{ fontWeight: 800 }}>{companyGeoGate.blocking ? "⚠ Company planı henüz tam değil" : "✅ Company planı koordinat olarak hazır"}</div>
      <div className="muted" style={{ marginTop: 6 }}>
        {companyGeoGate.blocking
          ? `Review: ${Number(companyGeoGate?.geoStats?.review || 0)} • Failed: ${Number(companyGeoGate?.geoStats?.failed || 0)}. Eksik koordinatlı kişi varken taslak shift doğrulanamaz.`
          : `Kişi kayıtları koordinatlı. Review: ${Number(companyGeoGate?.geoStats?.review || 0)} • Failed: ${Number(companyGeoGate?.geoStats?.failed || 0)}.`}
      </div>
      <div className="muted" style={{ marginTop: 6 }}>Not: Bu kart sadece koordinat hazırlığını gösterir. Teklif için ayrıca OSRM rota doğrulaması gerekir.</div>
    </div>
  );
}

export function GuidedOsrmGateCard({ offerOsrmGate }) {
  return (
    <div className="card" style={{ border: offerOsrmGate.blocking ? "1px solid #b85" : "1px solid #2a7" }}>
      <div style={{ fontWeight: 800 }}>{offerOsrmGate.blocking ? "⚠ OSRM rota doğrulaması eksik" : "✅ OSRM rota doğrulaması hazır"}</div>
      <div className="muted" style={{ marginTop: 6 }}>
        Toplam taslak: <b>{offerOsrmGate.total}</b> • Hazır: <b>{offerOsrmGate.readyCount}</b> • Bekleyen: <b>{offerOsrmGate.pendingCount}</b> • Hata: <b>{offerOsrmGate.errorCount}</b> • Duraksız: <b>{offerOsrmGate.stoplessCount}</b>
      </div>
      <div className="muted" style={{ marginTop: 6 }}>
        {offerOsrmGate.blocking
          ? (offerOsrmGate.reasons.join(" • ") || "OSRM doğrulaması tamamlanmadan teklif gönderilemez.")
          : "Taslak shift'ler rota doğrulamasından geçti; teklif gönderimi açılabilir."}
      </div>
    </div>
  );
}

export function GuidedDraftShiftRow({ shift, busy, osrmReorder, openShiftNavigation, osrmResById }) {
  const sid = Number(shift?.id);
  const state = osrmResById?.[sid];
  const base = Array.isArray(shift?.stops) ? shift.stops.length : 0;
  const hasHub = typeof shift?.hubLat === "number" && typeof shift?.hubLng === "number";
  return (
    <tr key={shift.id}>
      <td className="muted">#{shift.id}</td>
      <td className="muted">{fmtTR(shift.startAt)}</td>
      <td className="muted">{fmtTR(shift.endAt)}</td>
      <td className="muted">{base + (hasHub ? 1 : 0)}</td>
      <td>
        <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" onClick={() => osrmReorder(shift.id)} disabled={busy}>OSRM ile sırala</button>
          <button type="button" onClick={() => openShiftNavigation(shift)} disabled={busy}>Navigasyon</button>
          {state?.ok === true ? (
            <span className="muted">✅</span>
          ) : state?.ok === false ? (
            <span className="muted" title={state?.error || ""}>⚠️</span>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

export function GuidedDraftShiftsCard({ busy, draftShifts, osrmBatch, osrmReorderAll, osrmReorder, openShiftNavigation, osrmResById }) {
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 800 }}>Taslak shift’ler</div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={osrmReorderAll} disabled={busy || !(draftShifts || []).length}>
            Hepsini OSRM ile sırala
          </button>
        </div>
      </div>
      {osrmBatch?.running ? (
        <div className="muted" style={{ marginTop: 6 }}>Sıralanıyor: {osrmBatch.done}/{osrmBatch.total}</div>
      ) : null}

      <div style={{ overflowX: "auto", marginTop: 10 }}>
        <table className="tbl" style={{ minWidth: 820 }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Start</th>
              <th>End</th>
              <th>Durak</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(draftShifts || []).map((shift) => (
              <GuidedDraftShiftRow
                key={shift.id}
                shift={shift}
                busy={busy}
                osrmReorder={osrmReorder}
                openShiftNavigation={openShiftNavigation}
                osrmResById={osrmResById}
              />
            ))}
            {!draftShifts?.length ? (
              <tr><td colSpan={5} className="muted">Kayıt yok.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function GuidedRoomSelectionCard({ room, score, selected, onToggle }) {
  return (
    <label
      key={room.id}
      className="row"
      style={{
        gap: 8,
        alignItems: "stretch",
        justifyContent: "space-between",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.06)",
        background: selected ? "rgba(18,183,106,0.05)" : "rgba(255,255,255,0.02)",
      }}
    >
      <span className="row" style={{ gap: 10, alignItems: "flex-start" }}>
        <input
          type="checkbox"
          checked={Boolean(selected)}
          onChange={(e) => onToggle(e.target.checked)}
          style={{ marginTop: 4 }}
        />
        <span style={{ display: "grid", gap: 4 }}>
          <span className="muted"><b>{room.name}</b> #{room.id}</span>
          <span className="muted">{room?.hubLat != null && room?.hubLng != null ? "Hub konumu hazır" : "Hub konumu eksik • teklif engeli değil"}</span>
        </span>
      </span>
      <ProviderScoreBadge score={score} prominent showLabel />
    </label>
  );
}

export function GuidedBulkOffersCard({
  busy,
  onReloadRooms,
  roomsSupported,
  sentOk,
  offerOutcome,
  roomQ,
  setRoomQ,
  rooms,
  selectedRoomCount,
  offerAmount,
  setOfferAmount,
  offerNote,
  setOfferNote,
  roomsFiltered,
  roomScores,
  selRoomIds,
  setSelRoomIds,
  sendBulkOffers,
  organization,
  orgDraftCompletion,
  offerOsrmGate,
}) {
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 800 }}>Toplu teklif gönder</div>
          <div className="muted">Seçili room’lara tüm taslak shift’ler için teklif gider.</div>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => onReloadRooms?.()} disabled={busy || !roomsSupported}>Room’ları yenile</button>
        </div>
      </div>

      {!roomsSupported ? (
        <div className="muted" style={{ marginTop: 8, color: "#b85" }}>
          /api/rooms endpoint bulunamadı. Önce Room directory (M22+) çalışmalı.
        </div>
      ) : null}

      {!sentOk ? (
        <>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="muted">Room ara</label>
              <input value={roomQ} onChange={(e) => setRoomQ(e.target.value)} placeholder="name contains" disabled={busy} />
              <div className="muted" style={{ marginTop: 8 }}>Toplam room: {(rooms || []).length} • Seçili: {selectedRoomCount}</div>
              <div className="muted" style={{ marginTop: 6 }}>Hub konumu eksik room'lar da listelenir; hub eksikliği teklif engeli değildir.</div>
            </div>
            <div>
              <label className="muted">Tutar (₺) (isteğe bağlı)</label>
              <input value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} placeholder="örn. 25000" disabled={busy} />
              <label className="muted" style={{ marginTop: 8 }}>Not (isteğe bağlı)</label>
              <input value={offerNote} onChange={(e) => setOfferNote(e.target.value)} placeholder="örn. sabah giriş" disabled={busy} />
            </div>
          </div>

          <div className="card" style={{ marginTop: 10, maxHeight: 260, overflow: "auto" }}>
            {(roomsFiltered || []).map((room) => {
              const roomId = String(room.id);
              const score = roomScores[roomId] || null;
              return (
                <GuidedRoomSelectionCard
                  key={room.id}
                  room={room}
                  score={score}
                  selected={selRoomIds[roomId]}
                  onToggle={(checked) => setSelRoomIds((p) => ({ ...p, [roomId]: checked }))}
                />
              );
            })}
            {!roomsFiltered.length ? <div className="muted">Room bulunamadı.</div> : null}
          </div>

          <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                const next = {};
                for (const room of roomsFiltered || []) next[String(room.id)] = true;
                setSelRoomIds(next);
              }}
              disabled={busy || !roomsFiltered.length}
            >
              Hepsini Seç
            </button>
            <button type="button" onClick={() => { setSelRoomIds({}); setOfferAmount(""); setOfferNote(""); }} disabled={busy}>
              Temizle
            </button>
            <button
              type="button"
              onClick={sendBulkOffers}
              disabled={busy || !roomsSupported || selectedRoomCount < 1 || (organization && !orgDraftCompletion.ready) || (!organization && offerOsrmGate.blocking)}
            >
              Toplu Teklifleri Gönder
            </button>
          </div>
        </>
      ) : (
        <div className="muted" style={{ marginTop: 10 }}>
          {offerOutcome === "agreement_covered"
            ? "Bu plan seçilen room'larda zaten aktif sözleşme kapsamında. Yeni teklif gönderilmedi; devam etmek için Bitir'e bas."
            : "Teklifler gönderildi. Bu adım tamamlandı; devam etmek için Bitir'e bas."}
        </div>
      )}
    </div>
  );
}

export { GuidedCustomSlotCard, GuidedPlanPackCard, GuidedPlanDatesCard } from "./guidedPlanModalPlanCards";
