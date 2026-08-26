import { useEffect, useMemo, useState } from "react";
import {
  getToken,
  getQualityProofSignalSummary,
  getQualityDraftScoreSummary,
  getQualityReviewDecisionSummary,
} from "../../api";
import { buildOfferQualityRanking } from "../../utils/offerQualityRanking";

function compactText(value, fallback = "") {
  const text = String(value ?? "")
    .normalize("NFKC")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  return text || String(fallback || "").trim();
}

function compactList(values = [], limit = 6) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(values) ? values : []) {
    const text = compactText(raw, "");
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function toneForStatus(value) {
  const status = compactText(value, "INFO").toUpperCase();
  if (["READY", "GOOD", "OK", "REVIEWED", "READY_FOR_REVIEW", "CLEAR"].includes(status)) return "good";
  if (["WARN", "REVIEW_NEEDED", "PARTIAL", "MISSING", "MISSING_PROOF", "NEEDS_REVIEW", "NEEDS_RECHECK"].includes(status)) return "warn";
  if (["RISKY", "CRITICAL", "ERROR", "BLOCKED", "RISK"].includes(status)) return "danger";
  return "neutral";
}

function toneStyles(tone) {
  const key = String(tone || "neutral").toLowerCase();
  if (key === "good") {
    return {
      border: "1px solid rgba(18,183,106,0.28)",
      background: "rgba(18,183,106,0.08)",
      color: "#d1fadf",
    };
  }
  if (key === "warn") {
    return {
      border: "1px solid rgba(242,153,74,0.32)",
      background: "rgba(242,153,74,0.08)",
      color: "#fbd5a5",
    };
  }
  if (key === "danger") {
    return {
      border: "1px solid rgba(255,123,123,0.34)",
      background: "rgba(255,123,123,0.10)",
      color: "#ffc4c4",
    };
  }
  return {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    color: "#d0d5dd",
  };
}

function fmtPercent(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "%0";
  return `%${Math.max(0, Math.min(100, Math.round(n)))}`;
}

function formatTRY(amount) {
  if (amount == null || amount === "") return "-";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("tr-TR").format(Math.trunc(n));
}

function Pill({ label, value, tone = "neutral", title }) {
  const styles = toneStyles(tone);
  return (
    <span
      className="pill"
      data-status={String(tone || "neutral").toUpperCase()}
      title={title || `${label}: ${value}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 999,
        border: styles.border,
        background: styles.background,
        color: styles.color,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ opacity: 0.82 }}>{label}</span>
      <span>{value}</span>
    </span>
  );
}

function SignalChips({ title, items = [], tone = "neutral", emptyText = "Yok" }) {
  const chips = compactList(items, 6);
  if (!chips.length) {
    return <div className="muted" style={{ marginTop: 6 }}>{emptyText}</div>;
  }
  return (
    <div style={{ marginTop: 10 }}>
      <div className="muted">{title}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {chips.map((item) => (
          <span
            key={item}
            className="pill"
            data-status={String(tone || "neutral").toUpperCase()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 999,
              border: toneStyles(tone).border,
              background: toneStyles(tone).background,
              color: toneStyles(tone).color,
              fontSize: 12,
              fontWeight: 700,
            }}
            title={item}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function RowCard({ row }) {
  const rowTone = toneForStatus(row?.riskLevel === "Yüksek" ? "RISKY" : row?.riskLevel === "Orta" ? "REVIEW_NEEDED" : row?.riskLevel);
  const roomScoreTone = row?.roomScore?.ready ? "good" : "neutral";
  const safeDriveTone = row?.safeDrive?.risky ? "danger" : row?.safeDrive?.reviewNeeded ? "warn" : row?.safeDrive?.ready ? "good" : "neutral";
  return (
    <div
      className="card"
      style={{
        border: `1px solid ${row?.riskLevel === "Yüksek" ? "rgba(255,123,123,0.34)" : row?.confidence >= 70 ? "rgba(18,183,106,0.24)" : "rgba(255,255,255,0.08)"}`,
        background: row?.confidence >= 70 ? "linear-gradient(180deg, rgba(18,183,106,0.08), rgba(255,255,255,0.02))" : "rgba(255,255,255,0.02)",
        padding: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <div style={{ fontWeight: 900 }}>
            {row?.roomName || "Taşımacılık Firması"} {row?.roomId ? `(#${row.roomId})` : ""}
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <Pill label="Kalite" value={row?.qualityLabel || "-"} tone={rowTone} />
            <Pill label="Risk" value={row?.riskLevel || "-"} tone={rowTone} />
            <Pill label="Güven" value={fmtPercent(row?.confidence)} tone={row?.confidence >= 70 ? "good" : row?.confidence >= 45 ? "warn" : "neutral"} />
            <Pill label="Karar" value={row?.offerStatus || "-"} tone="neutral" />
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Pill label="Hizmet Alan Firma" value={row?.amountCompany != null ? `${formatTRY(row.amountCompany)} ₺` : "-"} tone="neutral" />
            <Pill label="Taşımacılık Firması" value={row?.amountRoom != null ? `${formatTRY(row.amountRoom)} ₺` : "-"} tone="neutral" />
            <Pill label="Fiyat" value={row?.priceSignal?.value || "-"} tone={row?.priceSignal?.tone || "neutral"} title={row?.priceSignal?.reason || row?.priceSignal?.value || "-"} />
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Pill label="Puan" value={row?.roomScore?.ready ? row.roomScore.summaryLabel : "Bekleniyor"} tone={roomScoreTone} />
            <Pill label="Telematics" value={row?.safeDrive?.statusText || "Bekleniyor"} tone={safeDriveTone} />
          </div>
        </div>
      </div>

      <div className="muted" style={{ marginTop: 10, lineHeight: 1.5 }}>
        {compactList(row?.comparisonSummary || [], 4).join(" • ") || "Karşılaştırma özeti bekleniyor."}
      </div>

      <SignalChips title="Pozitif sinyaller" items={row?.positiveSignals || []} tone="good" emptyText="Pozitif sinyal görünmüyor." />
      <SignalChips title="Eksik sinyaller" items={row?.missingSignals || []} tone="warn" emptyText="Eksik sinyal görünmüyor." />

      <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.03)" }}>
        <div className="muted">Son kontrol</div>
        <div style={{ fontWeight: 800, marginTop: 4 }}>{row?.nextReviewStep || "Karar kullanıcıdadır."}</div>
      </div>
    </div>
  );
}

export default function OfferQualityRankingCard({
  title = "Teklif kalite karşılaştırması",
  subtitle = "Kalite, güven, telematik, kanıt/check-in ve operasyon riski salt okunur gösterilir.",
  offers = [],
  roomScores = {},
  me = null,
  summaryParams = {},
  proofSummary = null,
  draftScoreSummary = null,
  reviewDecisionSummary = null,
  safeDriveSummary = null,
  safeDriveInput = null,
  token = "",
  maxRows = 4,
  className = "card",
  style = {},
}) {
  const [loadedProofSummary, setLoadedProofSummary] = useState(proofSummary);
  const [loadedDraftScoreSummary, setLoadedDraftScoreSummary] = useState(draftScoreSummary);
  const [loadedReviewDecisionSummary, setLoadedReviewDecisionSummary] = useState(reviewDecisionSummary);
  const normalizedToken = compactText(token || getToken(), "");
  const shouldAutoLoadProof = !proofSummary || !draftScoreSummary || !reviewDecisionSummary;

  useEffect(() => {
    setLoadedProofSummary(proofSummary);
  }, [proofSummary]);

  useEffect(() => {
    setLoadedDraftScoreSummary(draftScoreSummary);
  }, [draftScoreSummary]);

  useEffect(() => {
    setLoadedReviewDecisionSummary(reviewDecisionSummary);
  }, [reviewDecisionSummary]);

  useEffect(() => {
    let alive = true;
    if (!shouldAutoLoadProof || !normalizedToken) return undefined;

    (async () => {
      const [proof, draft, review] = await Promise.all([
        proofSummary ? Promise.resolve(null) : getQualityProofSignalSummary({}, { token: normalizedToken }).catch(() => null),
        draftScoreSummary ? Promise.resolve(null) : getQualityDraftScoreSummary({}, { token: normalizedToken }).catch(() => null),
        reviewDecisionSummary ? Promise.resolve(null) : getQualityReviewDecisionSummary({}, { token: normalizedToken }).catch(() => null),
      ]);
      if (!alive) return;
      if (proof) setLoadedProofSummary(proof);
      if (draft) setLoadedDraftScoreSummary(draft);
      if (review) setLoadedReviewDecisionSummary(review);
    })();

    return () => {
      alive = false;
    };
  }, [draftScoreSummary, normalizedToken, proofSummary, reviewDecisionSummary, shouldAutoLoadProof]);

  const ranking = useMemo(() => buildOfferQualityRanking({
    offers,
    roomScores,
    proofSummary: loadedProofSummary,
    draftScoreSummary: loadedDraftScoreSummary,
    reviewDecisionSummary: loadedReviewDecisionSummary,
    safeDriveSummary,
    safeDriveInput: safeDriveInput || offers?.[0]?.shift || offers?.[0]?.safeDriveInput || summaryParams?.safeDrive || null,
    me,
    summaryParams,
  }), [
    offers,
    roomScores,
    loadedProofSummary,
    loadedDraftScoreSummary,
    loadedReviewDecisionSummary,
    safeDriveSummary,
    safeDriveInput,
    me,
    summaryParams,
  ]);

  const topRows = ranking.rows.slice(0, Math.max(1, Math.min(6, Number(maxRows || 4) || 4)));
  const hasRows = topRows.length > 0;
  const rowCountLabel = `${ranking.offerCount || 0} teklif`;

  return (
    <div
      className={className}
      style={{
        display: "grid",
        gap: 12,
        border: "1px solid rgba(88,166,255,.22)",
        background: "rgba(255,255,255,.02)",
        minWidth: 0,
        ...style,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <div className="panelSectionTitle">{title}</div>
          <div className="panelMeta" style={{ marginTop: 4, lineHeight: 1.45 }}>
            {subtitle}
          </div>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Pill label="Scope" value={ranking.scopeLabel || "Teklif karşılaştırması"} tone="neutral" />
          <Pill label="Kayıt" value={rowCountLabel} tone={ranking.offerCount > 0 ? "good" : "neutral"} />
          <Pill label="Kalite" value={ranking.qualityLabel || "-"} tone={ranking.riskLevel === "Yüksek" ? "danger" : ranking.confidence >= 70 ? "good" : "warn"} />
          <Pill label="Risk" value={ranking.riskLevel || "-"} tone={ranking.riskLevel === "Yüksek" ? "danger" : ranking.riskLevel === "Orta" ? "warn" : "neutral"} />
          <Pill label="Güven" value={fmtPercent(ranking.confidence)} tone={ranking.confidence >= 70 ? "good" : ranking.confidence >= 45 ? "warn" : "neutral"} />
        </div>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <Pill label="Kanıt" value={ranking.proofSummary || "Bekleniyor"} tone={toneForStatus(loadedProofSummary?.status || loadedProofSummary?.reviewStatus || "INFO")} />
        <Pill label="Taslak" value={ranking.draftScoreSummary || "Bekleniyor"} tone={toneForStatus(loadedDraftScoreSummary?.status || "INFO")} />
        <Pill label="İnceleme" value={ranking.reviewDecisionSummary || "Bekleniyor"} tone={toneForStatus(loadedReviewDecisionSummary?.reviewStatus || loadedReviewDecisionSummary?.status || "INFO")} />
        <Pill label="Telematics" value={ranking.safeDriveSummary || "Bekleniyor"} tone={ranking.riskLevel === "Yüksek" ? "danger" : ranking.riskLevel === "Orta" ? "warn" : "good"} />
        <Pill label="Auto-select" value={ranking.autoSelectionBlocked ? "Kapalı" : "Açık"} tone={ranking.autoSelectionBlocked ? "good" : "warn"} />
        <Pill label="Auto-accept" value={ranking.autoAcceptBlocked ? "Kapalı" : "Açık"} tone={ranking.autoAcceptBlocked ? "good" : "warn"} />
      </div>

      <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.03)", lineHeight: 1.5 }}>
        <div className="muted">Kalite / güven / telematik / kanıt-biniş doğrulaması / operasyon riski</div>
        <div style={{ fontWeight: 800, marginTop: 4 }}>{ranking.summaryText || "Teklif karşılaştırması hazır."}</div>
        <div className="muted" style={{ marginTop: 4 }}>
          {ranking.summaryNote || "Salt okunur karşılaştırma satırı; otomatik seçim ve otomatik kabul kapalıdır."}
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {hasRows ? topRows.map((row) => <RowCard key={row.id} row={row} />) : (
          <div className="muted" style={{ padding: 12, borderRadius: 12, border: "1px dashed rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.01)" }}>
            Karşılaştırılacak teklif yok. Salt okunur kalite satırı boş görünüyor.
          </div>
        )}
        {ranking.rows.length > topRows.length ? (
          <div className="muted" style={{ marginTop: 2 }}>
            + {ranking.rows.length - topRows.length} teklif daha var.
          </div>
        ) : null}
      </div>

      <div className="muted" style={{ lineHeight: 1.5 }}>
        {ranking.humanApprovalRequired ? "Kullanıcı onayı gerekir. " : ""}
        {ranking.autoSelectionBlocked ? "Otomatik tedarikçi sıralama kapalı. " : ""}
        {ranking.autoAcceptBlocked ? "Otomatik teklif kabulü kapalı. " : ""}
        Contract execute, payment/hakediş execute ve AI runtime action açılmaz.
      </div>
    </div>
  );
}
