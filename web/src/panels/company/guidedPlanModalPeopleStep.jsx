import { api } from "../../api";
import { getApiErrorMessage } from "../../utils/apiContract";
import { personLabel } from "../../utils/labels";
import ShiftPeopleTab from "./ShiftPeopleTab";
import {
  collectGuidedSessionPersonIds,
  updateStoredPeopleKvkkFields,
} from "./guidedPlanModalUtils";

export default function GuidedPeopleStopsStep({
  organization,
  busy,
  token,
  me,
  draftShiftIds,
  draftShifts,
  roomsById,
  orgGatheringName,
  orgEstimatedPax,
  orgReturnType,
  orgFilledDestinations,
  companyGeoGate,
  setCompanyGeoGate,
  setStep,
  refreshDraftShifts,
  setErr,
}) {
  const who = personLabel(me);
  const mirrorShiftIds = (draftShifts || []).map((s) => s.id);

  async function advanceFromPeopleStep() {
    try {
      if (!organization) {
        const companyKey = String(me?.companyId ?? me?.id ?? "unknown");
        const personIds = collectGuidedSessionPersonIds(companyKey, draftShiftIds);
        if (personIds.length) {
          await api("/api/company/personels/bulk-clear", {
            token,
            method: "POST",
            body: { ids: personIds, fields: ["phone", "address"] },
          });
          updateStoredPeopleKvkkFields(companyKey, draftShiftIds, { phone: true, address: true });
        }
      }
      refreshDraftShifts();
      setStep(3);
    } catch (e) {
      setErr(getApiErrorMessage(e));
    }
  }

  return (
    <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
      <div className="muted">{organization ? "3. adım: Konumları ve kişi sayısını son kez kontrol et. Kişi/import bölümü Organization için opsiyoneldir." : `3. adım: ${who} ekle/import → durak üret → önizleme.`}</div>
      {!draftShiftIds.length ? (
        <div className="card err">Önce taslak vardiya oluşturmalısın.</div>
      ) : (
        <div className="card">
          <div className="muted">Taslak vardiyalar: {draftShiftIds.map((x) => `#${x}`).join(", ")}</div>
          <div className="muted" style={{ marginTop: 4 }}>Not: Bu adım vardiya kişi düzeninin aynısını kullanır.</div>
        </div>
      )}

      {organization ? (
        <>
          <div className="card">
            <div style={{ fontWeight: 800 }}>Plan özeti</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Toplanma: <b>{orgGatheringName || "-"}</b> • Tahmini kişi: <b>{orgEstimatedPax || "-"}</b> • Dönüş: <b>{orgReturnType === "RETURN_TO_START" ? "Başlangıç noktasına dön" : "Son noktada bitir"}</b>
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              Konumlar: {orgFilledDestinations.length ? orgFilledDestinations.map((d) => d.title || d.address).join(" → ") : "Henüz konum girilmedi"}
            </div>
          </div>
          <details className="card">
            <summary style={{ cursor: "pointer", fontWeight: 800 }}>Opsiyonel kişi / import alanı</summary>
            <div className="muted" style={{ marginTop: 6 }}>
              Organization için bu bölüm zorunlu değil. Sadece kişi listesi de taşımak istersen kullan.
            </div>
            <div style={{ marginTop: 10 }}>
              <ShiftPeopleTab token={token} me={me} shifts={draftShifts} roomsById={roomsById} mirrorShiftIds={mirrorShiftIds} />
            </div>
          </details>
        </>
      ) : (
        <div className="card">
          <ShiftPeopleTab token={token} me={me} shifts={draftShifts} roomsById={roomsById} mirrorShiftIds={mirrorShiftIds} guidedMode hideGeoReviewLinks onSummaryChange={setCompanyGeoGate} />
        </div>
      )}

      {!organization && companyGeoGate.blocking ? (
        <div className="card" style={{ border: "1px solid #b85" }}>
          <div style={{ fontWeight: 800 }}>⚠ Guided Mode kilidi</div>
          <div className="muted" style={{ marginTop: 6 }}>
            İncelenecek veya eksik koordinatlı kişi varken sonraki adıma geçilmez ve markete gönderim açılmaz.
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            İncelenecek: <b>{Number(companyGeoGate?.geoStats?.review || 0)}</b> • Hatalı: <b>{Number(companyGeoGate?.geoStats?.failed || 0)}</b>
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            Düzeltmeyi bu ekranda yap. Rehberli Mod içinden dış konum inceleme ekranına çıkış kapalı tutulur.
          </div>
        </div>
      ) : null}

      <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setStep(1)} disabled={busy}>Geri</button>
        <button type="button" onClick={advanceFromPeopleStep} disabled={busy || (!organization && companyGeoGate.blocking)}>
          {organization ? "İleri" : "Adres Temizle ve İlerle"}
        </button>
      </div>
    </div>
  );
}
