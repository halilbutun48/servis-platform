import { createElement } from "react";
import { agreementStatusPillLabel, agreementStatusText } from "../../utils/agreementLabels";

export function moneyTry(v) {
  if (v == null || v === "") return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `₺${n}`;
}

export function daysLeftYmd(ymd) {
  if (!ymd || String(ymd).length < 10) return null;
  const end = new Date(String(ymd).slice(0, 10) + "T23:59:59.999+03:00");
  const diff = end.getTime() - Date.now();
  const d = Math.ceil(diff / 86400000);
  return Number.isFinite(d) ? d : null;
}

export function ShiftSummary({ st }) {
  const tTot = Number(st?.todayTotal ?? 0);
  const tDone = Number(st?.todayDone ?? 0);
  const h = Number(st?.horizonOpen ?? 0);
  return createElement(
    "div",
    { className: "muted", style: { lineHeight: 1.2 } },
    createElement("div", null, `Bugün: ${tTot ? `${tDone}/${tTot} tamamlandı` : "-"}`),
    createElement("div", null, `Ufuk: ${h ? `${h} kabul edildi` : "-"}`)
  );
}

export function pill(status) {
  const s = String(status || "").toUpperCase();
  return createElement(
    "span",
    { className: "pill", "data-status": s, title: agreementStatusText(s) },
    agreementStatusPillLabel(s)
  );
}

export function parseTryInput(raw) {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/\./g, "").replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function resolveRoomAgreementsDefaultTab({ routeRefreshPendingCount, pendingCount, extendCount }) {
  if (routeRefreshPendingCount > 0) return "route";
  if (pendingCount > 0) return "bridge";
  if (extendCount > 0) return "extend";
  return "bridge";
}
