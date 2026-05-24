import CommercialReadonlySummary from "../../components/CommercialReadonlySummary";
import { rowSelectionStyle } from "../../utils/listUi";
import { agreementExtendStatusText } from "../../utils/agreementLabels";
import { buildDynamicSavingsPreview, routeDiffText, routeSummaryText } from "../../utils/routePreviewSummary";
import AgreementRouteChangePreviewCard from "../shared/AgreementRouteChangePreviewCard";
import DynamicSavingsPreviewCard from "../shared/DynamicSavingsPreviewCard";

function moneyTry(v) {
  if (v == null || v === "") return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `₺${n}`;
}

export function OfferCell({ amount, note }) {
  const a = moneyTry(amount);
  const n = String(note || "").trim();
  return (
    <div title={n || ""}>
      <div style={{ fontWeight: 800 }}>{a}</div>
      {n ? <div className="muted" style={{ fontSize: 12 }}>{n}</div> : null}
    </div>
  );
}

function trDateTime(iso) {
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

function routePriceDiffText(currentAmount, nextAmount) {
  const current = Number(currentAmount || 0);
  const next = Number(nextAmount ?? currentAmount ?? 0);
  const diff = next - current;
  const fmt = (n) => new Intl.NumberFormat("tr-TR").format(Number(n || 0)) + " ₺";
  return `${fmt(current)} → ${fmt(next)} (${diff > 0 ? "+" : ""}${fmt(diff)})`;
}

function ymd(value) {
  return String(value || "").slice(0, 10);
}

function RoomAgreementsRouteRefreshPendingCard({
  item,
  agreement,
  preview,
  bridgeShift,
  selected,
  onSelectAgreement,
  onOpenPreview,
  busy,
  isCounterOpen,
  counterAmount,
  counterNote,
  onStartCounter,
  onChangeCounterAmount,
  onChangeCounterNote,
  onCancelCounter,
  onSubmitCounter,
  onDecision,
}) {
  const requestId = Number(item?.id || 0);
  const agreementId = Number(item?.agreementId || 0);
  const sourceShiftId = Number(item?.sourceShiftId || 0);
  const draftShiftId = Number((item?.draftShiftIds || [])[0] || 0);
  const currentSummaryFallback = {
    peopleCount: Number(bridgeShift?.peopleCount || preview?.current?.peopleCount || 0),
    stopCount: Number(bridgeShift?.stopCount || preview?.current?.stopCount || 0),
    distanceM: Number(bridgeShift?.routeSnapshotDistanceM || preview?.current?.distanceM || 0),
    durationSec: Number(bridgeShift?.routeSnapshotDurationSec || preview?.current?.durationSec || 0),
  };
  const proposedSummaryFallback = {
    peopleCount: Number(item?.peopleCount || 0),
    stopCount: Number(item?.stopCount || 0),
    distanceM: Number(preview?.proposed?.distanceM || 0),
    durationSec: Number(preview?.proposed?.durationSec || 0),
  };
  const effectiveCurrentSummary = preview?.current || currentSummaryFallback;
  const effectiveProposedSummary = preview?.proposed || proposedSummaryFallback;
  const dynamicSavingsPreview = buildDynamicSavingsPreview({
    currentSummary: effectiveCurrentSummary,
    proposedSummary: effectiveProposedSummary,
  });
  const itemStatus = String(item?.status || "").toUpperCase();
  const roomAmount = item?.roomCounterAmount == null ? null : Number(item.roomCounterAmount);

  return (
    <div
      className="card"
      style={{ border: selected ? "1px solid rgba(88,166,255,.42)" : "1px solid rgba(255,255,255,.08)" }}
      onClick={() => onSelectAgreement(agreementId)}
    >
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900 }}>Sözleşme #{agreementId} • Rota güncelleme #{item.id}</div>
          <div className="muted" style={{ marginTop: 4 }}>
            {String(item?.startDate || "-").slice(0, 10)} → {String(item?.endDate || "-").slice(0, 10)} • {trDateTime(item?.createdAt)}
          </div>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <span className="pill">{Number(item?.shiftCount || 0)} taslak vardiya</span>
          <span className="pill">{String(item?.direction || agreement?.direction || "INBOUND").toUpperCase()} / {String(item?.pattern || agreement?.pattern || "ONE_WAY").toUpperCase()}</span>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <AgreementRouteChangePreviewCard
          summaryText={`Talep #${requestId} • ${String(item?.status || "-").toUpperCase()} • ${String(item?.startDate || "-").slice(0, 10)} → ${String(item?.endDate || "-").slice(0, 10)}`}
          companyOfferNote={item?.initialCompanyOfferNote || item?.companyOfferNote || ""}
          roomCounterText={roomAmount == null ? "" : `${moneyTry(roomAmount)}${item?.roomCounterNote ? ` — ${item.roomCounterNote}` : ""}`}
          currentRouteLabel="Mevcut rota"
          proposedRouteLabel="Önerilen yeni rota"
          diffLabel="Kişi / durak / km / süre farkı"
          priceLabel="Ücret etkisi"
          currentRouteText={routeSummaryText(effectiveCurrentSummary)}
          proposedRouteText={routeSummaryText(effectiveProposedSummary)}
          diffText={routeDiffText(effectiveCurrentSummary, effectiveProposedSummary)}
          priceImpactText={routePriceDiffText(
            Number(item?.initialCompanyOfferAmount ?? item?.companyOfferAmount ?? agreement?.companyOfferAmount ?? 0),
            Number(
              itemStatus === "COUNTERED"
                ? (item?.roomCounterAmount ?? item?.companyOfferAmount ?? agreement?.companyOfferAmount ?? item?.initialCompanyOfferAmount ?? 0)
                : (item?.companyOfferAmount ?? agreement?.companyOfferAmount ?? item?.initialCompanyOfferAmount ?? 0)
            )
          )}
          boundaryNote={itemStatus === "COUNTERED"
            ? "Bu sadece teklif / önizleme; rota uygulanmadı. Karşı teklif bekleniyor."
            : "Bu sadece teklif / önizleme; rota uygulanmadı."}
          previewError={preview?.err}
          previewLoading={preview?.loading}
          currentPreviewShiftId={sourceShiftId}
          proposedPreviewShiftId={draftShiftId}
          currentPreviewButtonLabel="Mevcut Rotayı Gör"
          proposedPreviewButtonLabel="Yeni Rotayı Önizle"
          onOpenCurrentPreview={(event) => { event?.stopPropagation?.(); onOpenPreview(sourceShiftId, { title: `Sözleşme #${agreementId} — Mevcut Rota` }); }}
          onOpenProposedPreview={(event) => { event?.stopPropagation?.(); onOpenPreview(draftShiftId, { title: `Sözleşme #${agreementId} — Önerilen Yeni Rota` }); }}
          actions={(
            <>
              <button type="button" className="btn sm ghost" disabled={busy} onClick={(e) => { e.stopPropagation(); onStartCounter(item); }}>
                {isCounterOpen ? "Karşı Teklifi Güncelle" : "Tekrar Kontrol"}
              </button>
              <button type="button" className="btn sm ghost" disabled={busy} onClick={(e) => { e.stopPropagation(); onDecision(requestId, "CANCEL"); }}>
                Reddet
              </button>
              <button type="button" className="btn sm" disabled={busy} onClick={(e) => { e.stopPropagation(); onDecision(requestId, "ACCEPT"); }}>
                {itemStatus === "COUNTERED" ? "Karşı Teklifi Kabul Et" : "Kabul Et"}
              </button>
            </>
          )}
        />
      </div>
      <div style={{ marginTop: 12 }}>
        <DynamicSavingsPreviewCard preview={dynamicSavingsPreview} />
      </div>

      {isCounterOpen ? (
        <div className="card" style={{ marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontWeight: 900 }}>Rota güncelleme karşı teklifi</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Şirket teklifi: <b>{moneyTry(item?.initialCompanyOfferAmount ?? item?.companyOfferAmount ?? agreement?.companyOfferAmount)}</b>
            {item?.initialCompanyOfferNote ? <span> — {item.initialCompanyOfferNote}</span> : (item?.companyOfferNote ? <span> — {item.companyOfferNote}</span> : null)}
          </div>
          <div className="fieldRow" style={{ marginTop: 12 }}>
            <div className="field">
              <div className="muted">Karşı Teklif (₺)</div>
              <input value={counterAmount} onChange={(e) => onChangeCounterAmount(e.target.value)} placeholder="örn: 12000" />
            </div>
            <div className="field" style={{ flex: 2 }}>
              <div className="muted">Not (opsiyonel)</div>
              <input value={counterNote} onChange={(e) => onChangeCounterNote(e.target.value)} placeholder="örn: ek mesafe + yeni durak" />
            </div>
          </div>
          <div className="actionsRow" style={{ marginTop: 12 }}>
            <button type="button" className="btn sm primary" disabled={busy} onClick={onSubmitCounter}>
              {busy ? "Gönderiliyor..." : "Karşı Teklif Gönder"}
            </button>
            <button type="button" className="btn sm ghost" disabled={busy} onClick={onCancelCounter}>
              Vazgeç
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RoomAgreementsRouteRefreshPendingSection({
  items,
  agreementById,
  routeRefreshPreviewById,
  opsBridge,
  selectedAgreementId,
  onSelectAgreement,
  onOpenPreview,
  busy,
  routeRefreshCounterId,
  routeRefreshCounterAmount,
  routeRefreshCounterNote,
  onStartCounter,
  onChangeCounterAmount,
  onChangeCounterNote,
  onCancelCounter,
  onSubmitCounter,
  onDecision,
}) {
  return (
    <div className="card">
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Rota Güncelleme Talepleri</div>
      <div className="muted" style={{ marginBottom: 12 }}>
        Bu alan vardiya pazarlığı değil, aktif sözleşmeye bağlı rota değişiklik talebidir. Oda burada mevcut rota ile önerilen yeni rotayı karşılaştırıp karar verir.
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((item) => {
          const requestId = Number(item?.id || 0);
          const agreementId = Number(item?.agreementId || 0);
          return (
            <RoomAgreementsRouteRefreshPendingCard
              key={item.id}
              item={item}
              agreement={agreementById[String(agreementId)] || null}
              preview={routeRefreshPreviewById[String(requestId)] || { loading: false, current: null, proposed: null, err: "" }}
              bridgeShift={opsBridge?.[agreementId]?.lastShift || null}
              selected={Number(selectedAgreementId || 0) === agreementId}
              onSelectAgreement={onSelectAgreement}
              onOpenPreview={onOpenPreview}
              busy={busy}
              isCounterOpen={Number(routeRefreshCounterId || 0) === requestId}
              counterAmount={routeRefreshCounterAmount}
              counterNote={routeRefreshCounterNote}
              onStartCounter={onStartCounter}
              onChangeCounterAmount={onChangeCounterAmount}
              onChangeCounterNote={onChangeCounterNote}
              onCancelCounter={onCancelCounter}
              onSubmitCounter={onSubmitCounter}
              onDecision={onDecision}
            />
          );
        })}
        {!items.length ? (
          <div className="muted">Bekleyen rota güncelleme talebi yok.</div>
        ) : null}
      </div>
    </div>
  );
}

function RoomAgreementsRouteRefreshAcceptedCard({
  item,
  agreement,
  preview,
  selected,
  onSelectAgreement,
  onOpenPreview,
}) {
  const agreementId = Number(item?.agreementId || 0);
  const sourceShiftId = Number(item?.sourceShiftId || 0);
  const acceptedShiftId = Number((item?.draftShiftIds || [])[0] || 0);
  const currentSummaryFallback = {
    peopleCount: Number(preview?.current?.peopleCount || 0),
    stopCount: Number(preview?.current?.stopCount || 0),
    distanceM: Number(preview?.current?.distanceM || 0),
    durationSec: Number(preview?.current?.durationSec || 0),
  };
  const appliedSummaryFallback = {
    peopleCount: Number(item?.peopleCount || 0),
    stopCount: Number(item?.stopCount || 0),
    distanceM: Number(preview?.proposed?.distanceM || 0),
    durationSec: Number(preview?.proposed?.durationSec || 0),
  };
  const effectiveCurrentSummary = preview?.current || currentSummaryFallback;
  const effectiveAppliedSummary = preview?.proposed || appliedSummaryFallback;
  const dynamicSavingsPreview = buildDynamicSavingsPreview({
    currentSummary: effectiveCurrentSummary,
    proposedSummary: effectiveAppliedSummary,
  });
  const roomAmount = item?.roomCounterAmount == null ? null : Number(item.roomCounterAmount);
  const itemStatus = String(item?.status || "").toUpperCase();

  return (
    <div
      className="card"
      style={{ border: selected ? "1px solid rgba(88,166,255,.42)" : "1px solid rgba(255,255,255,.08)" }}
      onClick={() => onSelectAgreement(agreementId)}
    >
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900 }}>Sözleşme #{agreementId} • Uygulanan rota güncelleme #{item.id}</div>
          <div className="muted" style={{ marginTop: 4 }}>
            {String(item?.startDate || "-").slice(0, 10)} → {String(item?.endDate || "-").slice(0, 10)} • Uygulandı: {trDateTime(item?.decidedAt || item?.updatedAt)}
          </div>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <span className="pill" data-status="ACCEPTED">Uygulandı</span>
          <span className="pill">{Number(item?.shiftCount || 0)} vardiya</span>
          <span className="pill">{String(item?.direction || agreement?.direction || "INBOUND").toUpperCase()} / {String(item?.pattern || agreement?.pattern || "ONE_WAY").toUpperCase()}</span>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <AgreementRouteChangePreviewCard
          summaryText={`Talep #${item?.id || '-'} • Uygulandı • ${String(item?.startDate || "-").slice(0, 10)} → ${String(item?.endDate || "-").slice(0, 10)}`}
          companyOfferNote={item?.finalAcceptedNote || item?.initialCompanyOfferNote || item?.companyOfferNote || ""}
          roomCounterText={roomAmount == null ? "" : `${moneyTry(roomAmount)}${item?.roomCounterNote ? ` — ${item.roomCounterNote}` : ""}`}
          currentRouteLabel="Önceki rota"
          proposedRouteLabel="Uygulanan yeni rota"
          diffLabel="Kişi / durak / km / süre farkı"
          priceLabel="Ücret etkisi"
          currentRouteText={routeSummaryText(effectiveCurrentSummary)}
          proposedRouteText={routeSummaryText(effectiveAppliedSummary)}
          diffText={routeDiffText(effectiveCurrentSummary, effectiveAppliedSummary)}
          priceImpactText={routePriceDiffText(
            Number(item?.initialCompanyOfferAmount ?? item?.companyOfferAmount ?? agreement?.companyOfferAmount ?? 0),
            Number(
              itemStatus === "COUNTERED"
                ? (item?.roomCounterAmount ?? item?.companyOfferAmount ?? agreement?.companyOfferAmount ?? item?.initialCompanyOfferAmount ?? 0)
                : (item?.finalAcceptedAmount ?? item?.companyOfferAmount ?? agreement?.companyOfferAmount ?? item?.initialCompanyOfferAmount ?? 0)
            )
          )}
          boundaryNote="Bu yalnızca uygulanan geçmişi gösterir; rota yeniden uygulanmadı."
          previewError={preview?.err}
          previewLoading={preview?.loading}
          currentPreviewShiftId={sourceShiftId}
          proposedPreviewShiftId={acceptedShiftId}
          currentPreviewButtonLabel="Önceki Rotayı Gör"
          proposedPreviewButtonLabel="Uygulanan Rotayı Gör"
          onOpenCurrentPreview={(event) => { event?.stopPropagation?.(); onOpenPreview(sourceShiftId, { title: `Sözleşme #${agreementId} — Önceki Rota` }); }}
          onOpenProposedPreview={(event) => { event?.stopPropagation?.(); onOpenPreview(acceptedShiftId, { title: `Sözleşme #${agreementId} — Uygulanan Yeni Rota` }); }}
        />
      </div>
      <div style={{ marginTop: 12 }}>
        <DynamicSavingsPreviewCard preview={dynamicSavingsPreview} />
      </div>
    </div>
  );
}

export function RoomAgreementsRouteRefreshAcceptedSection({
  items,
  agreementById,
  routeRefreshPreviewById,
  selectedAgreementId,
  onSelectAgreement,
  onOpenPreview,
}) {
  return (
    <div className="card">
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Uygulanan Rota Güncellemeleri</div>
      <div className="muted" style={{ marginBottom: 12 }}>
        Kabul edilen rota değişiklikleri burada özet kalır. Oda kabul ettikten sonra eski rota ile uygulanan yeni rotayı tekrar açıp karşılaştırabilir.
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {items.slice(0, 6).map((item) => {
          const requestId = Number(item?.id || 0);
          const agreementId = Number(item?.agreementId || 0);
          return (
            <RoomAgreementsRouteRefreshAcceptedCard
              key={`accepted-route-refresh-${item.id}`}
              item={item}
              agreement={agreementById[String(agreementId)] || null}
              preview={routeRefreshPreviewById[String(requestId)] || { loading: false, current: null, proposed: null, err: "" }}
              selected={Number(selectedAgreementId || 0) === agreementId}
              onSelectAgreement={onSelectAgreement}
              onOpenPreview={onOpenPreview}
            />
          );
        })}
        {!items.length ? (
          <div className="muted">Henüz uygulanmış rota güncellemesi yok.</div>
        ) : null}
      </div>
    </div>
  );
}

export function RoomAgreementsExtendRequestsSection({
  items,
  selectedAgreementId,
  onSelectAgreement,
  busy,
  extendCounterId,
  extendCounterAmount,
  extendCounterNote,
  onDecision,
  onStartCounter,
  onChangeCounterAmount,
  onChangeCounterNote,
  onSubmitCounter,
  onCancelCounter,
}) {
  return (
    <div className="card">
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Uzatma Talepleri</div>
      <div className="muted" style={{ marginBottom: 10 }}>
        Şirket uzatma teklifi gönderir → oda kabul / reddet / karşı teklif verir.
      </div>

      <div className="tableWrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>Mevcut</th>
              <th>İstenen</th>
              <th>Şirket Uzatma Teklifi</th>
              <th>Oda Karşı Teklifi</th>
              <th>Durum</th>
              <th>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const ex = String(item.extendStatus || "NONE").toUpperCase();
              const reqEnd = ymd(item.extendRequestedEndDate);
              return (
                <tr key={`ext-${item.id}`} onClick={() => onSelectAgreement(item.id)} style={rowSelectionStyle(Number(selectedAgreementId || 0) === Number(item.id || 0))}>
                  <td><div>{item.id}</div><CommercialReadonlySummary item={item.commercialBackbone} compact /></td>
                  <td className="muted">{ymd(item.startDate)} → {ymd(item.endDate)}</td>
                  <td className="muted">{reqEnd || "-"}</td>
                  <td><OfferCell amount={item.extendOfferAmount} note={item.extendOfferNote} /></td>
                  <td><OfferCell amount={item.extendCounterAmount} note={item.extendCounterNote} /></td>
                  <td className="muted">{agreementExtendStatusText(ex)}</td>
                  <td>
                    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <button type="button" className="btn sm" disabled={busy || ex !== "PENDING"} onClick={(e) => { e.stopPropagation(); onDecision(item.id, "ACCEPT"); }}>
                        Kabul
                      </button>
                      <button type="button" className="btn sm ghost" disabled={busy || ex !== "PENDING"} onClick={(e) => { e.stopPropagation(); onDecision(item.id, "REJECT"); }}>
                        Reddet
                      </button>
                      <button
                        type="button"
                        className="btn sm ghost"
                        disabled={busy || ex !== "PENDING"}
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartCounter(item);
                        }}
                      >
                        Karşı Teklif
                      </button>
                      {ex === "COUNTERED" ? <span className="muted" style={{ fontSize: 12 }}>Şirket kararı bekleniyor…</span> : null}
                    </div>

                    {extendCounterId === item.id ? (
                      <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                        <input
                          className="inp"
                          placeholder="Karşı teklif (₺)"
                          value={extendCounterAmount}
                          onChange={(e) => onChangeCounterAmount(e.target.value)}
                          disabled={busy}
                        />
                        <input
                          className="inp"
                          placeholder="Not (opsiyonel)"
                          value={extendCounterNote}
                          onChange={(e) => onChangeCounterNote(e.target.value)}
                          disabled={busy}
                        />
                        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                          <button type="button" className="btn sm" disabled={busy} onClick={onSubmitCounter}>
                            Gönder
                          </button>
                          <button type="button" className="btn sm ghost" disabled={busy} onClick={onCancelCounter}>
                            Vazgeç
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {!items.length ? (
              <tr>
                <td colSpan={7} className="muted">Uzatma talebi yok.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
