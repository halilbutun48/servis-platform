// web/src/panels/company/ShiftTemplatesPanel.jsx
// Note: Templates are only slot/time/direction. Days + duration moved to Agreement create.
import { useEffect, useMemo, useState } from "react";

export const TEMPLATE_PACKS = [
  {
    key: "WK_MORNING",
    title: "Hafta içi • Sabah",
    desc: "07:00 → 09:00 (Toplama → Hub)",
    items: [{ label: "Sabah", startHHMM: "07:00", endHHMM: "09:00", direction: "INBOUND", pattern: "ONE_WAY" }],
  },
  {
    key: "WK_EVENING",
    title: "Hafta içi • Akşam",
    desc: "17:00 → 19:00 (Hub → Dağıtım)",
    items: [{ label: "Akşam", startHHMM: "17:00", endHHMM: "19:00", direction: "OUTBOUND", pattern: "ONE_WAY" }],
  },
  {
    key: "WK_MORNING_EVENING",
    title: "Hafta içi • Sabah + Akşam",
    desc: "2 vardiya (07-09 + 17-19)",
    items: [
      { label: "Sabah", startHHMM: "07:00", endHHMM: "09:00", direction: "INBOUND", pattern: "ONE_WAY" },
      { label: "Akşam", startHHMM: "17:00", endHHMM: "19:00", direction: "OUTBOUND", pattern: "ONE_WAY" },
    ],
  },
  {
    key: "WK_NIGHT",
    title: "Hafta içi • Gece",
    desc: "23:00 → 01:00 (midnight-cross)",
    items: [{ label: "Gece", startHHMM: "23:00", endHHMM: "01:00", direction: "INBOUND", pattern: "ONE_WAY" }],
  },
  {
    key: "CUSTOM",
    title: "Özel",
    desc: "Elle ayarla",
    items: [{ label: "Özel", startHHMM: "08:00", endHHMM: "10:00", direction: "INBOUND", pattern: "ONE_WAY" }],
  },
];

// Not: weekMask bitleri agreementUi ile uyumludur
export const DEFAULT_WEEKMASK = 31; // (Pzt..Cum) = 31 (legacy comment eski kalabilir)
export const DEFAULT_DURATION_KEY = "1m";

export const PRESET_TEMPLATES = TEMPLATE_PACKS.filter((p) => p.key !== "CUSTOM").map((p) => ({
  id: `preset_${p.key}`,
  name: p.title,
  packKey: p.key,
  weekMask: DEFAULT_WEEKMASK,
  durationKey: DEFAULT_DURATION_KEY,
  items: p.items,
  people: null,
  kind: "PRESET",
}));

function minutesOf(hhmm) {
  const m = String(hhmm || "").match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (![hh, mm].every(Number.isFinite)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function templateItemsSummary(tpl) {
  const its = tpl?.items || [];
  if (!its.length) return "-";
  if (its.length === 1) {
    const it = its[0];
    return `${it.label}: ${it.startHHMM}–${it.endHHMM}`;
  }
  return its.map((it) => `${it.label} ${it.startHHMM}–${it.endHHMM}`).join(" | ");
}

export default function ShiftTemplatesPanel({
  busy,
  allTemplates,
  customTemplates,
  setCustomTemplates,
  onUseTemplate,
  setErr,
}) {
  // UI state (wizard-like)
  const [tplName, setTplName] = useState("");
  const [tplPackKey, setTplPackKey] = useState("WK_MORNING_EVENING");
  const [tplPeople, setTplPeople] = useState("");
  const [editingTplId, setEditingTplId] = useState("");

  // Custom pack override
  const [tplStart, setTplStart] = useState("08:00");
  const [tplEnd, setTplEnd] = useState("10:00");
  const [tplDirection, setTplDirection] = useState("INBOUND");
  const [tplPattern, setTplPattern] = useState("ONE_WAY");

  const pack = useMemo(
    () => TEMPLATE_PACKS.find((p) => p.key === tplPackKey) || TEMPLATE_PACKS[0],
    [tplPackKey],
  );

  // when pack changes, update custom fields
  useEffect(() => {
    if (tplPackKey !== "CUSTOM") {
      const it = (pack?.items || [])[0];
      if (it) {
        setTplStart(String(it.startHHMM || "08:00"));
        setTplEnd(String(it.endHHMM || "10:00"));
        setTplDirection(String(it.direction || "INBOUND"));
        setTplPattern(String(it.pattern || "ONE_WAY"));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tplPackKey]);

  function resetTemplateForm() {
    setEditingTplId("");
    setTplName("");
    setTplPackKey("WK_MORNING_EVENING");
    setTplPeople("");
    setTplStart("08:00");
    setTplEnd("10:00");
    setTplDirection("INBOUND");
    setTplPattern("ONE_WAY");
  }

  function loadTemplateIntoForm(tpl) {
    if (!tpl || tpl.kind !== "CUSTOM") return;
    setEditingTplId(String(tpl.id));
    setTplName(String(tpl.name || ""));
    setTplPackKey(String(tpl.packKey || "CUSTOM"));
    setTplPeople(tpl.people != null ? String(tpl.people) : "");

    const it = (tpl.items || [])[0];
    if (it) {
      setTplStart(String(it.startHHMM || "08:00"));
      setTplEnd(String(it.endHHMM || "10:00"));
      setTplDirection(String(it.direction || "INBOUND"));
      setTplPattern(String(it.pattern || "ONE_WAY"));
    }
  }

  function saveCustomTemplate(e) {
    e?.preventDefault?.();
    setErr?.("");

    const name = String(tplName || "").trim();
    if (!name) {
      setErr?.("Şablon adı zorunlu.");
      return;
    }

    const pplRaw = String(tplPeople || "").trim();
    const ppl = pplRaw ? Number(pplRaw) : null;
    if (pplRaw && (!Number.isFinite(ppl) || ppl <= 0)) {
      setErr?.("Varsayılan kişi sayısı pozitif sayı olmalı (opsiyonel).");
      return;
    }

    const weekMask = DEFAULT_WEEKMASK;

    let items = [];
    if (tplPackKey === "CUSTOM") {
      const s = String(tplStart || "").trim();
      const en = String(tplEnd || "").trim();
      if (minutesOf(s) == null || minutesOf(en) == null) {
        setErr?.("Start/End HH:MM formatında olmalı (örn 07:00).");
        return;
      }
      items = [{ label: "Özel", startHHMM: s, endHHMM: en, direction: tplDirection, pattern: tplPattern }];
    } else {
      const pk = TEMPLATE_PACKS.find((p) => p.key === tplPackKey);
      items = (pk?.items || []).map((it) => ({ ...it }));
    }

    if (!items.length) {
      setErr?.("Şablon içeriği boş.");
      return;
    }

    const id = editingTplId || `tpl_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const next = {
      id,
      name,
      packKey: tplPackKey,
      weekMask,
      durationKey: DEFAULT_DURATION_KEY,
      items,
      people: ppl,
      kind: "CUSTOM",
    };

    setCustomTemplates?.((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const idx = list.findIndex((x) => x.id === id);
      if (idx >= 0) {
        const copy = list.slice();
        copy[idx] = next;
        return copy;
      }
      return [next, ...list];
    });

    resetTemplateForm();
  }

  function deleteCustomTemplate(id) {
    const t = (customTemplates || []).find((x) => x.id === id);
    if (!t) return;
    if (!confirm(`"${t.name}" şablonunu silmek istiyor musun?`)) return;
    setCustomTemplates?.((prev) => (prev || []).filter((x) => x.id !== id));
    if (editingTplId === id) resetTemplateForm();
  }

  return (
    <>
      <div className="card">
      <h3>Vardiya Şablonları</h3>
      <div className="muted">
        Guided Mode’daki <b>plan paketi</b> (slot/saat/direction) mantığını burada şablon olarak kaydedebilirsin. Bu şablonları hem{" "}
        <b>Yeni Talep</b> ekranında saat doldurmak için, hem de ileride planlama için kullanacağız. Custom şablonlar company bazlı tarayıcıda saklanır.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start", marginTop: 12 }}>
        {/* 1) Plan paketi */}
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ marginTop: 0 }}>1) Plan paketi seç</h3>

          {(TEMPLATE_PACKS || []).map((p) => (
            <label key={p.key} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 10 }}>
              <input type="radio" name="tplPack" checked={tplPackKey === p.key} onChange={() => setTplPackKey(p.key)} />
              <div>
                <div style={{ fontWeight: 700 }}>{p.title}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {p.desc}
                </div>
              </div>
            </label>
          ))}

          <div className="card" style={{ marginTop: 12 }}>
            <div className="muted" style={{ marginBottom: 6 }}>
              Şablon adı
            </div>
            <input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="örn. Hafta içi Sabah (A)" />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              <div>
                <div className="muted">Start (HH:MM)</div>
                <input value={tplStart} onChange={(e) => setTplStart(e.target.value)} disabled={tplPackKey !== "CUSTOM"} />
              </div>
              <div>
                <div className="muted">End (HH:MM)</div>
                <input value={tplEnd} onChange={(e) => setTplEnd(e.target.value)} disabled={tplPackKey !== "CUSTOM"} />
              </div>
            </div>

            <div className="muted" style={{ marginTop: 10 }}>
              Varsayılan kişi sayısı (opsiyonel)
            </div>
            <input type="number" value={tplPeople} onChange={(e) => setTplPeople(e.target.value)} placeholder="örn. 16" />

            <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
              İpucu: End, Start’tan küçükse “gece vardiyası” gibi değerlendirilir (bir sonraki güne taşar).
            </div>
          </div>
        </div>

        {/* 2) Kaydet */}
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ marginTop: 0 }}>2) Kaydet</h3>

          <div className="muted">
            Şablonlar sadece <b>slot/saat/direction</b> içindir. <b>Günler + süre</b> seçimi Agreement oluştururken yapılır.
          </div>

          <div className="card" style={{ marginTop: 12, borderStyle: "dashed" }}>
            <div style={{ fontWeight: 700 }}>Özet</div>
            <ul className="muted" style={{ margin: "8px 0 0 18px" }}>
              <li>
                <b>Paket:</b>{" "}
                {templateItemsSummary({
                  items: tplPackKey === "CUSTOM" ? [{ label: "Özel", startHHMM: tplStart, endHHMM: tplEnd }] : pack?.items || [],
                })}
              </li>
              <li>
                <b>Kişi (vars.):</b> {String(tplPeople || "").trim() ? tplPeople : "-"}
              </li>
            </ul>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "end", marginTop: 12, flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={resetTemplateForm}>
              Temizle
            </button>
            <button type="button" disabled={busy} onClick={saveCustomTemplate}>
              {editingTplId ? "Güncelle" : "Kaydet"}
            </button>
          </div>
        </div>
      </div>
      </div>

    {/* Liste */}
    <div className="card" style={{ marginTop: 12, overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>Şablon Listesi</h3>
        <table className="tbl" style={{ whiteSpace: "nowrap" }}>
          <thead>
            <tr>
              <th>Ad</th>
              <th>Vardiya(lar)</th>
              <th>Kişi (vars.)</th>
              <th>Tip</th>
              <th>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {(allTemplates || []).map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td className="muted">{templateItemsSummary(t)}</td>
                                <td className="muted">{t.people != null ? t.people : "-"}</td>
                <td>
                  <span className="pill" data-status={t.kind === "PRESET" ? "PRESET" : "CUSTOM"}>
                    {t.kind}
                  </span>
                </td>
                <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(t.items || []).map((it, idx) => (
                    <button key={idx} type="button" disabled={busy} onClick={() => onUseTemplate?.(t, idx)}>
                      Kullan{t.items.length > 1 ? ` (${it.label})` : ""}
                    </button>
                  ))}
                  {t.kind === "CUSTOM" ? (
                    <>
                      <button type="button" className="btn" disabled={busy} onClick={() => loadTemplateIntoForm(t)}>
                        Düzenle
                      </button>
                      <button type="button" className="btn" disabled={busy} onClick={() => deleteCustomTemplate(t.id)}>
                        Sil
                      </button>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          “Kullan” → Yeni Talep’e geçer ve Start/End’i doldurur.
        </div>
      </div>
    </>
  );
}
