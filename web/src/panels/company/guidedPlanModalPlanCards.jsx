import { weekMaskToText } from "../../utils/agreementUi";
import {
  createFallbackCustomSlots,
  packDescForMode,
  packTitleForMode,
  toHHMM,
} from "./guidedPlanModalUtils";

export function GuidedCustomSlotCard({
  organization,
  busy,
  slot,
  idx,
  customSlots,
  setCustomSlots,
}) {
  return (
    <div className="card" style={{ padding: 10, border: "1px solid #223" }}>
      <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={slot?.label || ""}
          onChange={(e) =>
            setCustomSlots((p) => (p || []).map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))
          }
          placeholder={`Vardiya ${idx + 1}`}
          style={{ minWidth: 160, flex: 1 }}
          disabled={busy}
        />
        {(customSlots || []).length > 1 ? (
          <button
            type="button"
            className="btn"
            onClick={() => setCustomSlots((p) => (p || []).filter((_, i) => i !== idx))}
            disabled={busy}
          >
            Kaldır
          </button>
        ) : null}
      </div>

      <div className="row" style={{ gap: 10, flexWrap: "wrap", marginTop: 8 }}>
        <label className="muted">
          Start{" "}
          <input
            value={slot?.startHHMM || ""}
            onChange={(e) =>
              setCustomSlots((p) => (p || []).map((x, i) => (i === idx ? { ...x, startHHMM: e.target.value } : x)))
            }
            style={{ width: 120 }}
            disabled={busy}
          />
        </label>
        <label className="muted">
          End{" "}
          <input
            value={slot?.endHHMM || ""}
            onChange={(e) =>
              setCustomSlots((p) => (p || []).map((x, i) => (i === idx ? { ...x, endHHMM: e.target.value } : x)))
            }
            style={{ width: 120 }}
            disabled={busy}
          />
        </label>

        <label className="muted">
          Direction{" "}
          <select
            value={slot?.direction || "INBOUND"}
            onChange={(e) =>
              setCustomSlots((p) => (p || []).map((x, i) => (i === idx ? { ...x, direction: e.target.value } : x)))
            }
            disabled={busy}
          >
            <option value="INBOUND">{organization ? "Toplama / gidiş" : "INBOUND"}</option>
            <option value="OUTBOUND">{organization ? "Dağıtım / dönüş" : "OUTBOUND"}</option>
          </select>
        </label>

        <label className="muted">
          Pattern{" "}
          <select
            value={slot?.pattern || "ONE_WAY"}
            onChange={(e) =>
              setCustomSlots((p) => (p || []).map((x, i) => (i === idx ? { ...x, pattern: e.target.value } : x)))
            }
            disabled={busy}
          >
            <option value="ONE_WAY">{organization ? "Son noktada bitir" : "ONE_WAY"}</option>
            <option value="LOOP">{organization ? "Başlangıç noktasına dön" : "LOOP"}</option>
          </select>
        </label>
      </div>
    </div>
  );
}

export function GuidedPlanPackCard({
  organization,
  busy,
  PACKS,
  packKey,
  setPackKey,
  pack,
  customSlots,
  setCustomSlots,
  createAdditionalCustomSlot,
}) {
  return (
    <div className="card">
      <div style={{ fontWeight: 800 }}>Plan paketi</div>
      <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
        {PACKS.map((p) => (
          <label key={p.key} className="row" style={{ gap: 8, alignItems: "center" }}>
            <input
              type="radio"
              name="pack"
              checked={packKey === p.key}
              onChange={() => setPackKey(p.key)}
              disabled={busy}
            />
            <div>
              <div style={{ fontWeight: 700 }}>{packTitleForMode(p, organization)}</div>
              <div className="muted">{packDescForMode(p, organization)}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="row" style={{ justifyContent: "flex-end", marginTop: 10 }}>
        {pack.key !== "CUSTOM" ? (
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => {
              const src = Array.isArray(pack?.items) ? pack.items : [];
              const slots = src.map((it, idx) => ({
                label: String(it?.label || `Vardiya ${idx + 1}`),
                startHHMM: toHHMM(it.startMin),
                endHHMM: toHHMM(it.endMin),
                direction: it?.direction || "INBOUND",
                pattern: it?.pattern || "ONE_WAY",
              }));
              setCustomSlots(slots.length ? slots : createFallbackCustomSlots());
              setPackKey("CUSTOM");
            }}
          >
            Özele çevir (düzenle)
          </button>
        ) : null}
      </div>

      {pack.key === "CUSTOM" ? (
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <div className="muted" style={{ fontSize: 12 }}>
            İpucu: End, Start’tan küçükse “gece vardiyası” sayılır (bir sonraki güne taşar).
          </div>

          {(customSlots || []).map((slot, idx) => (
            <GuidedCustomSlotCard
              key={idx}
              organization={organization}
              busy={busy}
              slot={slot}
              idx={idx}
              customSlots={customSlots}
              setCustomSlots={setCustomSlots}
            />
          ))}

          <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn"
              onClick={() =>
                setCustomSlots((p) => [
                  ...(p || []),
                  createAdditionalCustomSlot((p || []).length),
                ])
              }
              disabled={busy || (customSlots || []).length >= 3}
              title={(customSlots || []).length >= 3 ? "Maksimum 3 vardiya" : "Yeni vardiya ekle"}
            >
              + Vardiya ekle
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function GuidedPlanDatesCard({
  busy,
  startDate,
  setStartDate,
  durationOptions,
  durationKey,
  setDurationKey,
  endDate,
  WEEKDAYS,
  daysSel,
  setDaysSel,
  organization,
  weekMask,
  eligibleDaysCount,
  nextValidStart,
  planSummary,
}) {
  return (
    <div className="card">
      <div style={{ fontWeight: 800 }}>Tarih + günler</div>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label className="muted">Başlangıç</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={busy} />
        </div>
        <div>
          <label className="muted">Hızlı süre</label>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 6 }}>
            {durationOptions.map((d) => (
              <button
                key={d.key}
                type="button"
                className={durationKey === d.key ? "" : "btn"}
                disabled={busy}
                onClick={() => setDurationKey(d.key)}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
            Varsayılan olarak aynı gün başlar; süre seçince bitiş otomatik hesaplanır.
          </div>
        </div>
        <div>
          <label className="muted">Bitiş (otomatik)</label>
          <input type="date" value={endDate} readOnly disabled />
        </div>
        <div>
          <label className="muted">Günler</label>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {WEEKDAYS.map((w) => (
              <label key={w.k} className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={!!daysSel[w.k]}
                  onChange={() => {
                    setDaysSel((p) => ({ ...p, [w.k]: !p[w.k] }));
                  }}
                  disabled={busy}
                />
                {w.label}
              </label>
            ))}
          </div>
          <div className="muted" style={{ marginTop: 6 }}>{organization ? `Seçilen günler: ${weekMaskToText(weekMask)}` : `Günler: ${weekMaskToText(weekMask)} • weekMask:${weekMask}`}</div>

          {eligibleDaysCount === 0 ? (
            <div className="card err" style={{ marginTop: 8 }}>
              Seçili tarih aralığında (gün filtresine göre) vardiya üretilecek gün yok. Başlangıç / günler / süreyi değiştir.
              {nextValidStart ? (
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate(nextValidStart);
                    }}
                    disabled={busy}
                  >
                    Başlangıcı {nextValidStart} yap
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="muted" style={{ marginTop: 6 }}>
              Uygun gün sayısı: {eligibleDaysCount}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 700 }}>{organization ? "Plan özeti" : "Paket özeti"}</div>
        <ul className="muted" style={{ marginTop: 6 }}>
          {planSummary.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </div>
    </div>
  );
}
