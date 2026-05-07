import { useMemo, useState } from "react";
import ChatQuickActions from "./ChatQuickActions";
import ChatDiagnosticSignals from "./ChatDiagnosticSignals";

const FEEDBACK_KEY = "vardis:copilot:chat-feedback";
const FEEDBACK_LOG_KEY = "vardis:copilot:chat-feedback-log";
const FEEDBACK_EVENT = "vardis:copilot-feedback-updated";

function bubbleStyle(role) {
  if (role === "user") {
    return {
      justifySelf: "end",
      background: "#175cd3",
      color: "#fff",
      border: "1px solid #175cd3",
    };
  }
  return {
    justifySelf: "start",
    background: "#f8fafc",
    color: "#101828",
    border: "1px solid #d0d5dd",
  };
}

function safeReadFeedback() {
  try {
    return JSON.parse(window.localStorage.getItem(FEEDBACK_KEY) || "{}");
  } catch {
    return {};
  }
}

function feedbackId(message) {
  return [message?.generatedAt || "", message?.screenLabel || "", message?.questionType || "", message?.text || ""].join("|").slice(0, 320);
}

function safeReadFeedbackLog() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FEEDBACK_LOG_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFeedbackLog(entry) {
  const prev = safeReadFeedbackLog();
  const next = [entry, ...prev.filter((row) => String(row?.messageId || "") !== String(entry?.messageId || ""))].slice(0, 30);
  try {
    window.localStorage.setItem(FEEDBACK_LOG_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(FEEDBACK_EVENT, { detail: { count: next.length } }));
  } catch { /* no-op: feedback persistence is best-effort */ }
}

function SectionCard({ section }) {
  if (!section) return null;
  return (
    <div style={{ borderRadius: 12, border: "1px solid #d0d5dd", padding: 10, background: "#fff" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#344054", marginBottom: 6 }}>{section.title || "-"}</div>
      {section.text ? <div style={{ fontSize: 13, lineHeight: 1.45 }}>{section.text}</div> : null}
      {section.hint ? <div style={{ fontSize: 12, color: "#475467", marginTop: 6 }}>{section.hint}</div> : null}
      {Array.isArray(section.items) && section.items.length ? (
        <div style={{ fontSize: 12, color: "#475467", marginTop: 8 }}>
          {section.items.join(" • ")}
        </div>
      ) : null}
    </div>
  );
}

export default function ChatMessageBubble({ message, onOpen, onGuide, onAsk, onCopy }) {
  const role = String(message?.role || "assistant");
  const isSimpleMode = String(message?.roleMode || "") === "SIMPLE";
  const messageId = useMemo(() => feedbackId(message), [message]);
  const [feedback, setFeedback] = useState(() => safeReadFeedback()[messageId] || "");
  const uncertaintyTone = String(message?.uncertaintyMeta?.cautionLevel || "");

  const handleFeedback = (value) => {
    if (role === "user") return;
    const current = safeReadFeedback();
    current[messageId] = value;
    try {
      window.localStorage.setItem(FEEDBACK_KEY, JSON.stringify(current));
    } catch { /* no-op: local feedback cache is best-effort */ }
    writeFeedbackLog({
      messageId,
      value,
      generatedAt: message?.generatedAt || new Date().toISOString(),
      questionType: message?.questionType || "",
      questionLabel: message?.questionLabel || "",
      screenLabel: message?.screenLabel || "",
      intentConfidence: Number(message?.intentConfidence || 0),
      uncertaintyLevel: message?.uncertaintyMeta?.cautionLevel || "",
      textPreview: String(message?.text || "").slice(0, 180),
    });
    setFeedback(value);
  };

  const summaryBits = [message?.screenLabel, message?.activeEntityLabel].filter(Boolean);

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ maxWidth: role === "user" ? "60%" : "78%", borderRadius: 16, padding: 12, ...bubbleStyle(role) }}>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6, fontWeight: 700 }}>
          {role === "user" ? "Sen" : "Copilot"}
        </div>

        {role !== "user" && (message?.questionLabel || message?.uncertaintyMeta?.label || message?.routePlan?.primaryRouteLabel || message?.continuity?.sameEntity || message?.continuity?.isFollowUp) ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {message?.questionLabel ? (
              <span style={{ borderRadius: 999, padding: "2px 8px", background: "#eef4ff", color: "#3538cd", border: "1px solid #c7d7fe", fontSize: 12, fontWeight: 700 }}>
                {message.questionLabel}
              </span>
            ) : null}
            {message?.uncertaintyMeta?.label ? (
              <span style={{ borderRadius: 999, padding: "2px 8px", background: uncertaintyTone === "HIGH" ? "#fef3f2" : "#fffaeb", color: uncertaintyTone === "HIGH" ? "#b42318" : "#b54708", border: uncertaintyTone === "HIGH" ? "1px solid #fecdca" : "1px solid #fcd34d", fontSize: 12, fontWeight: 700 }}>
                {message?.uncertaintyMeta?.label}
              </span>
            ) : null}
            {message?.routePlan?.primaryRouteLabel ? (
              <span style={{ borderRadius: 999, padding: "2px 8px", background: "#f2f4f7", color: "#344054", border: "1px solid #d0d5dd", fontSize: 12, fontWeight: 700 }}>
                Hedef ekran: {message.routePlan.primaryRouteLabel}
              </span>
            ) : null}
            {message?.continuity?.sameEntity ? (
              <span style={{ borderRadius: 999, padding: "2px 8px", background: "#ecfdf3", color: "#027a48", border: "1px solid #a6f4c5", fontSize: 12, fontWeight: 700 }}>
                Aynı kayıt
              </span>
            ) : null}
            {message?.continuity?.isFollowUp ? (
              <span style={{ borderRadius: 999, padding: "2px 8px", background: "#eef4ff", color: "#3538cd", border: "1px solid #c7d7fe", fontSize: 12, fontWeight: 700 }}>
                Devam sorusu
              </span>
            ) : null}
          </div>
        ) : null}

        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{message?.text || "-"}</div>

        {role !== "user" && (message?.diagnosticSignalsVisible || (Array.isArray(message?.diagnosticSignals) && message.diagnosticSignals.length)) ? (
          <ChatDiagnosticSignals
            signals={Array.isArray(message?.diagnosticSignals) ? message.diagnosticSignals : []}
            summary={String(message?.diagnosticSignalSummary || "")}
            visible={Boolean(message?.diagnosticSignalsVisible)}
            emptyText={message?.diagnosticSignalEmptyText || "Bu ekranda ek kanıt sinyali yok"}
          />
        ) : null}

        {role !== "user" && ((Array.isArray(message?.responseSections) && message.responseSections.length) || message?.contextSummary || summaryBits.length || message?.followUpPrompt) ? (
          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Neden böyle söyledim</summary>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              {message?.contextSummary ? <div style={{ fontSize: 12, color: "#475467" }}>{message.contextSummary}</div> : null}
              {summaryBits.length ? <div style={{ fontSize: 12, color: "#475467" }}>{summaryBits.join(" • ")}</div> : null}
              {message?.followUpPrompt ? <div style={{ fontSize: 12, color: "#475467" }}>{message.followUpPrompt}</div> : null}
              {Array.isArray(message?.responseSections) && message.responseSections.length ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {message.responseSections.slice(0, isSimpleMode ? 1 : 2).map((section, i) => (
                    <SectionCard key={`${section?.kind || "section"}:${i}`} section={section} />
                  ))}
                </div>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>

      {role !== "user" ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" onClick={() => handleFeedback("useful")} style={{ fontSize: 12 }}>
            {feedback === "useful" ? "İşe yaradı ✓" : "İşe yaradı"}
          </button>
          <button type="button" onClick={() => handleFeedback("needs-work")} style={{ fontSize: 12 }}>
            {feedback === "needs-work" ? "Eksik kaldı ✓" : "Eksik kaldı"}
          </button>
        </div>
      ) : null}

      {role !== "user" ? <ChatQuickActions actions={message?.quickActions} linkedGuides={message?.linkedGuides} onOpen={onOpen} onGuide={onGuide} onAsk={onAsk} onCopy={onCopy} /> : null}
    </div>
  );
}
