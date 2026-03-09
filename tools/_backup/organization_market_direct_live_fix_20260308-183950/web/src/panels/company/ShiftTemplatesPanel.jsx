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

function cloneItems(items) {
  return (items || []).map((it) => ({
    label: String(it?.label || "Vardiya"),
    startHHMM: String(it?.startHHMM || ""),
    endHHMM: String(it?.endHHMM || ""),
    direction: String(it?.direction || "INBOUND"),
    pattern: String(it?.pattern || "ONE_WAY"),
  }));
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

  // Custom editor state (1..2 item)
  const [c1Label, setC1Label] = useState("Özel");
  const [c1Start, setC1Start] = useState("08:00");
  const [c1End, setC1End] = useState("10:00");
  const [c1Direction, setC1Direction] = useState("INBOUND");
  const [c1Pattern, setC1Pattern] = useState("ONE_WAY");

  const [customMulti, setCustomMulti] = useState(false);
  const [c2Label, setC2Label] = useState("Akşam");
  const [c2Start, setC2Start] = useState("17:00");
  const [c2End, setC2End] = useState("19:00");
  const [c2Direction, setC2Direction] = useState("OUTBOUND");
  const [c2Pattern, setC2Pattern] = useState("ONE_WAY");

  const pack = useMemo(
    () => TEMPLATE_PACKS.find((p) => p.key === tplPackKey) || TEMPLATE_PACKS[0],
    [tplPackKey],
  );

  // keep custom editor aligned when switching packs (read-only view still uses these defaults)
  useEffect(() => {
    const it0 = (pack?.items || [])[0];
    const it1 = (pack?.items || [])[1];

    if (tplPackKey === "CUSTOM") {
      // reset to default custom on explicit selection (simple + predictable)
      if (it0) {
        setC1Label(String(it0.label || "Özel"));
        setC1Start(String(it0.startHHMM || "08:00"));
        setC1End(String(it0.endHHMM || "10:00"));
        setC1Direction(String(it0.direction || "INBOUND"));
        setC1Pattern(String(it0.pattern || "ONE_WAY"));
      }
      setCustomMulti(false);
      setC2Label("Akşam");
      setC2Start("17:00");
      setC2End("19:00");
      setC2Direction("OUTBOUND");
      setC2Pattern("ONE_WAY");
      return;
    }

    // non-custom pack: keep inputs in sync (for readonly display / convert-to-custom shortcut)
    if (it0) {
      setC1Label(String(it0.label || "Vardiya"));
      setC1Start(String(it0.startHHMM || "08:00"));
      setC1End(String(it0.endHHMM || "10:00"));
      setC1Direction(String(it0.direction || "INBOUND"));
      setC1Pattern(String(it0.pattern || "ONE_WAY"));
    }
    if (it1) {
      setCustomMulti(true);
      setC2Label(String(it1.label || "Vardiya 2"));
      setC2Start(String(it1.startHHMM || "17:00"));
      setC2End(String(it1.endHHMM || "19:00"));
      setC2Direction(String(it1.direction || "OUTBOUND"));
      setC2Pattern(String(it1.pattern || "ONE_WAY"));
    } else {
      setCustomMulti(false);
      setC2Label("Akşam");
      setC2Start("17:00");
      setC2End("19:00");
      setC2Direction("OUTBOUND");
      setC2Pattern("ONE_WAY");
    }
  }, [tplPackKey, pack]);

  const formItems = useMemo(() => {
    if (tplPackKey !== "CUSTOM") return cloneItems(pack?.items || []);

    const out = [
      {
        label: String(c1Label || "Vardiya 1").trim() || "Vardiya 1",
        startHHMM: String(c1Start || "").trim(),
        endHHMM: String(c1End || "").trim(),
        direction: String(c1Direction || "INBOUND"),
        pattern: String(c1Pattern || "ONE_WAY"),
      },
    ];

    if (customMulti) {
      out.push({
        label: String(c2Label || "Vardiya 2").trim() || "Vardiya 2",
        startHHMM: String(c2Start || "").trim(),
        endHHMM: String(c2End || "").trim(),
        direction: String(c2Direction || "INBOUND"),
        pattern: String(c2Pattern || "ONE_WAY"),
      });
    }

    return out;
  }, [tplPackKey, pack, c1Label, c1Start, c1End, c1Direction, c1Pattern, customMulti, c2Label, c2Start, c2End, c2Direction, c2Pattern]);

  function resetTemplateForm() {
    setEditingTplId("");
    setTplName("");
    setTplPackKey("WK_MORNING_EVENING");
    setTplPeople("");
  }

  function convertSelectedPackToCustom() {
    // current pack items -> custom editor
    const its = cloneItems(pack?.items || []);
    const it0 = its[0];
    const it1 = its[1];

    if (it0) {
      setC1Label(String(it0.label || "Vardiya 1"));
      setC1Start(String(it0.startHHMM || "08:00"));
      setC1End(String(it0.endHHMM || "10:00"));
      setC1Direction(String(it0.direction || "INBOUND"));
      setC1Pattern(String(it0.pattern || "ONE_WAY"));
    }
    if (it1) {
      setCustomMulti(true);
      setC2Label(String(it1.label || "Vardiya 2"));
      setC2Start(String(it1.startHHMM || "17:00"));
      setC2End(String(it1.endHHMM || "19:00"));
      setC2Direction(String(it1.direction || "INBOUND"));
      setC2Pattern(String(it1.pattern || "ONE_WAY"));
    } else {
      setCustomMulti(false);
    }

    if (!String(tplName || "").trim()) setTplName(String(pack?.title || "").trim());
    setTplPackKey("CUSTOM");
  }

  function loadTemplateIntoForm(tpl) {
    if (!tpl || tpl.kind !== "CUSTOM") return;

    setEditingTplId(String(tpl.id));
    setTplName(String(tpl.name || ""));
    setTplPeople(tpl.people != null ? String(tpl.people) : "");

    // Always load into editable CUSTOM editor
    setTplPackKey("CUSTOM");

    const its = cloneItems(tpl.items || []);
    const it0 = its[0];
    const it1 = its[1];

    if (it0) {
      setC1Label(String(it0.label || "Vardiya 1"));
      setC1Start(String(it0.startHHMM || "08:00"));
      setC1End(String(it0.endHHMM || "10:00"));
      setC1Direction(String(it0.direction || "INBOUND"));
      setC1Pattern(String(it0.pattern || "ONE_WAY"));
    }

    if (it1) {
      setCustomMulti(true);
      setC2Label(String(it1.label || "Vardiya 2"));
      setC2Start(String(it1.startHHMM || "17:00"));
      setC2End(String(it1.endHHMM || "19:00"));
      setC2Direction(String(it1.direction || "INBOUND"));
      setC2Pattern(String(it1.pattern || "ONE_WAY"));
    } else {
      setCustomMulti(false);
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
      const its = formItems;
      for (const it of its) {
        if (minutesOf(it.startHHMM) == null || minutesOf(it.endHHMM) == null) {
          setErr?.("Start/End HH:MM formatında olmalı (örn 07:00). ");
          return;
        }
      }
      items = cloneItems(its);
    } else {
      items = cloneItems(pack?.items || []);
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

  function addSecondCustomShift() {
    setCustomMulti(true);
    if (!String(c2Label || "").trim()) setC2Label("Akşam");
    if (!String(c2Start || "").trim()) setC2Start("17:00");
    if (!String(c2End || "").trim()) setC2End("19:00");
    if (!String(c2Direction || "").trim()) setC2Direction("OUTBOUND");
    if (!String(c2Pattern || "").trim()) setC2Pattern("ONE_WAY");
  }

  function removeSecondCustomShift() {
    setCustomMulti(false);
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

              {tplPackKey === "CUSTOM" ? (
                <>
                  {/* Custom item 1 */}
                  <div className="card" style={{ marginTop: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <div className="muted">Etiket</div>
                        <input value={c1Label} onChange={(e) => setC1Label(e.target.value)} placeholder="örn. Sabah" />
                      </div>
                      <div>
                        <div className="muted">Direction</div>
                        <select value={c1Direction} onChange={(e) => setC1Direction(e.target.value)}>
                          <option value="INBOUND">INBOUND (Toplama → Hub)</option>
                          <option value="OUTBOUND">OUTBOUND (Hub → Dağıtım)</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                      <div>
                        <div className="muted">Start (HH:MM)</div>
                        <input value={c1Start} onChange={(e) => setC1Start(e.target.value)} />
                      </div>
                      <div>
                        <div className="muted">End (HH:MM)</div>
                        <input value={c1End} onChange={(e) => setC1End(e.target.value)} />
                      </div>
                    </div>
                    <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
                      İpucu: End, Start’tan küçükse “gece vardiyası” gibi değerlendirilir (bir sonraki güne taşar).
                    </div>
                  </div>

                  {/* Custom item 2 */}
                  {customMulti ? (
                    <div className="card" style={{ marginTop: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontWeight: 700 }}>2. Vardiya</div>
                        <button type="button" className="btn" onClick={removeSecondCustomShift}>
                          Kaldır
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                        <div>
                          <div className="muted">Etiket</div>
                          <input value={c2Label} onChange={(e) => setC2Label(e.target.value)} placeholder="örn. Akşam" />
                        </div>
                        <div>
                          <div className="muted">Direction</div>
                          <select value={c2Direction} onChange={(e) => setC2Direction(e.target.value)}>
                            <option value="INBOUND">INBOUND (Toplama → Hub)</option>
                            <option value="OUTBOUND">OUTBOUND (Hub → Dağıtım)</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                        <div>
                          <div className="muted">Start (HH:MM)</div>
                          <input value={c2Start} onChange={(e) => setC2Start(e.target.value)} />
                        </div>
                        <div>
                          <div className="muted">End (HH:MM)</div>
                          <input value={c2End} onChange={(e) => setC2End(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 10 }}>
                      <button type="button" className="btn" onClick={addSecondCustomShift}>
                        + 2. Vardiya ekle (Sabah + Akşam)
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="card" style={{ marginTop: 10, borderStyle: "dashed" }}>
                  <div className="muted" style={{ marginBottom: 6 }}>
                    Bu paket <b>{(pack?.items || []).length}</b> vardiya içerir:
                  </div>
                  <ul className="muted" style={{ margin: "8px 0 0 18px" }}>
                    {(pack?.items || []).map((it, idx) => (
                      <li key={idx}>
                        <b>{it.label}</b>: {it.startHHMM}–{it.endHHMM} • {it.direction}
                      </li>
                    ))}
                  </ul>

                  {(pack?.items || []).length > 1 ? (
                    <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
                      Not: Bu paket “çoklu vardiya”dır. İstersen <b>Özele çevir</b> ile saatleri düzenleyip tek şablonda kaydedebilirsin.
                    </div>
                  ) : null}

                  {(pack?.items || []).length ? (
                    <div style={{ marginTop: 10, display: "flex", justifyContent: "end" }}>
                      <button type="button" className="btn" onClick={convertSelectedPackToCustom}>
                        Özele çevir (düzenle)
                      </button>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="muted" style={{ marginTop: 10 }}>
                Varsayılan kişi sayısı (opsiyonel)
              </div>
              <input type="number" value={tplPeople} onChange={(e) => setTplPeople(e.target.value)} placeholder="örn. 16" />
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
                  <b>Paket:</b> {templateItemsSummary({ items: formItems })}
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
          “Kullan” → Yeni Talep’e geçer ve Start/End’i doldurur. Çoklu vardiya şablonlarında her vardiya için ayrı “Kullan” butonu vardır.
        </div>
      </div>
    </>
  );
}
