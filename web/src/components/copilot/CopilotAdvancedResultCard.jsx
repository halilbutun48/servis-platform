import { formatDateTimeTR } from "../../utils/time";
import {
  actionPriorityLabel,
  confidencePct,
  decisionTone,
  priorityTone,
  severityStyle,
  signalStyle,
} from "../../utils/copilotPanelHelpers";

function ReferenceList({ data }) {
  const entries = Object.entries(data || {});
  if (!entries.length) return <div className="muted">Referans görünmüyor.</div>;
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {entries.map(([k, v]) => (
        <li key={k}>
          <b>{k}</b>: {Array.isArray(v) ? (v.length ? v.join(", ") : "-") : (v ?? "-").toString()}
        </li>
      ))}
    </ul>
  );
}

function DecisionBadge({ label, value }) {
  return (
    <div style={{ borderRadius: 999, padding: "6px 10px", fontWeight: 700, display: "inline-flex", gap: 6, alignItems: "center", ...decisionTone(value) }}>
      <span>{label}</span>
      <span>{value || "-"}</span>
    </div>
  );
}

function ListBlock({ title, items, empty }) {
  return (
    <div>
      <div className="title" style={{ fontSize: 16 }}>{title}</div>
      {items?.length ? <ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul> : <div className="muted">{empty}</div>}
    </div>
  );
}

function ActionCard({ action, index }) {
  return (
    <div key={`${action.title || "action"}:${index}`} style={{ border: "1px solid #d0d5dd", borderRadius: 12, padding: 12, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700 }}>{action.title || "-"}</div>
        <div style={{ borderRadius: 999, padding: "2px 8px", ...priorityTone(action.priorityScore) }}>
          {actionPriorityLabel(action)}
        </div>
      </div>
      <div className="muted">{action.reason || "-"}</div>
      {action.whyNow ? <div><b>Neden şimdi:</b> {action.whyNow}</div> : null}
      {action.preconditions?.length ? <div><b>Ön koşullar:</b> {action.preconditions.join(" • ")}</div> : null}
      {action.dependsOn?.length ? <div><b>Bağlı olduğu şeyler:</b> {action.dependsOn.join(" • ")}</div> : null}
      {action.blockedBy?.length ? <div><b>Engeller:</b> {action.blockedBy.join(" • ")}</div> : null}
      {action.evidenceLinks?.length ? <div><b>Kanıt bağları:</b> {action.evidenceLinks.join(" • ")}</div> : null}
      {action.referenceLinks?.length ? <div><b>Referans bağları:</b> {action.referenceLinks.join(", ")}</div> : null}
    </div>
  );
}

function SignalBlock({ title, items, empty, statusKey }) {
  return (
    <div>
      <div className="title" style={{ fontSize: 16 }}>{title}</div>
      {items?.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((x, i) => (
            <div key={`${x.label || title}:${i}`} style={{ borderRadius: 10, padding: 10, ...signalStyle(x[statusKey]) }}>
              <div style={{ fontWeight: 700 }}>{x.label || "-"}</div>
              <div>{x.detail || "-"}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="muted">{empty}</div>
      )}
    </div>
  );
}

export default function CopilotAdvancedResultCard({ result, role, copyText, copyMsg }) {
  return (
    <div className="card" style={{ display: "grid", gap: 12 }}>
      <div>
        <div className="title">Sonuç</div>
        <div className="muted" style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span>Provider: <b>{result.provider || "-"}</b></span>
          <span>Mode: <b>{result.mode || "-"}</b></span>
          <span>Scope: <b>{result.scope?.role || role || "-"}</b></span>
          <span>Versiyon: <b>{result.copilotVersion || "-"}</b></span>
          <span>Oluşturma: <b>{result.generatedAt ? formatDateTimeTR(result.generatedAt) : "-"}</b></span>
          <span>Güven: <b>{confidencePct(result.confidence)}</b></span>
          <span style={{ ...severityStyle(result.severity), padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>{result.severity || "-"}</span>
        </div>
        {result.providerSummary ? <div className="muted" style={{ marginTop: 6 }}>{result.providerSummary}</div> : null}
      </div>

      <div className="muted" style={{ display: "grid", gap: 4 }}>
        <div><b>{result.intentLabel || result.intent || "-"}</b></div>
        <div>{result.entityLabel || `${result.entityType || "entity"} #${result.entityId || "-"}`}</div>
        <div>{result.scope?.summary || "-"}</div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <DecisionBadge label="Genel Durum" value={result.overallStatus} />
        <DecisionBadge label="Hazırlık" value={result.actionability} />
        <DecisionBadge label="Tazelik" value={result.dataFreshness} />
        <DecisionBadge label="Kapsam" value={result.coverage} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => copyText(result.summary || "")}>Kopyala özet</button>
        {result.noteDraft ? <button type="button" onClick={() => copyText(result.noteDraft || "")}>Kopyala not</button> : null}
        {copyMsg ? <span className="muted">{copyMsg}</span> : null}
      </div>

      <div style={{ fontSize: 16, fontWeight: 700 }}>{result.summary || "-"}</div>
      {result.explanation ? (
        <div>
          <div className="title" style={{ fontSize: 16 }}>Açıklama</div>
          <div className="muted" style={{ marginTop: 8 }}>{result.explanation}</div>
        </div>
      ) : null}

      {result.recommendedFirstAction ? (
        <div style={{ borderRadius: 12, padding: 12, ...priorityTone(result.recommendedFirstAction.priorityScore) }}>
          <div className="title" style={{ fontSize: 16 }}>İlk Önerilen Adım</div>
          <ActionCard action={result.recommendedFirstAction} index="first" />
          {result.actionPlanSummary ? <div className="muted" style={{ marginTop: 8 }}>{result.actionPlanSummary}</div> : null}
        </div>
      ) : null}

      <ListBlock title="Kalibrasyon Notları" items={result.calibrationNotes} empty="Kalibrasyon notu görünmüyor." />
      <ListBlock title="Öne Çıkanlar" items={result.highlights} empty="Öne çıkan görünmüyor." />

      <div>
        <div className="title" style={{ fontSize: 16 }}>Önerilen Adımlar</div>
        {result.recommendedActions?.length ? (
          <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
            {result.recommendedActions.map((x, i) => <ActionCard key={`${x.title || "action"}:${i}`} action={x} index={i} />)}
          </div>
        ) : (
          <div className="muted" style={{ marginTop: 8 }}>Önerilen adım görünmüyor.</div>
        )}
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <ListBlock title="Gerçekler" items={result.facts} empty="Gerçek görünmüyor." />
        <ListBlock title="Riskler" items={result.risks} empty="Risk görünmüyor." />
        <ListBlock title="Öneriler" items={result.suggestions} empty="Öneri yok." />
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <ListBlock title="Engeller" items={result.blockers} empty="Açıklanmış engel görünmüyor." />
        <ListBlock title="Eksik Veri" items={result.missingData} empty="Eksik veri görünmüyor." />
        <ListBlock title="Blok Kodları" items={result.blocks} empty="Kod seviyesinde blok görünmüyor." />
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <ListBlock title="Sonraki Kontroller" items={result.nextChecks} empty="Ek kontrol önerisi yok." />
        <div>
          <div className="title" style={{ fontSize: 16 }}>Referanslar</div>
          <ReferenceList data={result.references} />
        </div>
        <ListBlock title="Kanıtlar" items={result.evidence} empty="Kanıt görünmüyor." />
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <SignalBlock title="Karar Sinyalleri" items={result.decisionSignals} empty="Karar sinyali görünmüyor." statusKey="state" />
        <SignalBlock title="Tutarlılık Kontrolleri" items={result.consistencyChecks} empty="Tutarlılık kontrolü görünmüyor." statusKey="status" />
      </div>

      {result.noteDraft ? (
        <div>
          <div className="title" style={{ fontSize: 16 }}>Not Taslağı</div>
          <textarea readOnly value={result.noteDraft} rows={8} style={{ width: "100%", marginTop: 8 }} />
        </div>
      ) : null}
    </div>
  );
}
