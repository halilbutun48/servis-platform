const AGREEMENT_CONVERSION_PENDING_STATUSES = new Set(["REQUESTED", "COUNTERED"]);
const AGREEMENT_CONVERSION_LINKED_STATUSES = new Set(["APPROVED", "ACTIVE", "DONE"]);
const AGREEMENT_CONVERSION_CLOSED_STATUSES = new Set(["REJECTED", "CANCELLED"]);

function agreementConversionState(status) {
  const st = String(status || "").toUpperCase();
  if (AGREEMENT_CONVERSION_PENDING_STATUSES.has(st)) return "pending";
  if (AGREEMENT_CONVERSION_LINKED_STATUSES.has(st)) return "linked";
  if (AGREEMENT_CONVERSION_CLOSED_STATUSES.has(st)) return "closed";
  return "";
}

function agreementConversionRank(state) {
  if (state === "pending") return 3;
  if (state === "linked") return 2;
  if (state === "closed") return 1;
  return 0;
}

export function buildAgreementConversionByShift(agreements) {
  const byShift = {};
  (Array.isArray(agreements) ? agreements : []).forEach((agreement) => {
    const shiftId = Number(agreement?.commercialBackbone?.shiftRootId || 0);
    const agreementId = Number(agreement?.id || 0);
    const status = String(agreement?.status || "").toUpperCase();
    const state = agreementConversionState(status);
    if (!shiftId || !agreementId || !state) return;

    const next = { agreementId, status, state };
    const prev = byShift[String(shiftId)] || null;
    const nextRank = agreementConversionRank(next.state);
    const prevRank = agreementConversionRank(prev?.state);
    if (!prev || nextRank > prevRank || (nextRank === prevRank && agreementId > Number(prev.agreementId || 0))) {
      byShift[String(shiftId)] = next;
    }
  });
  return byShift;
}

export function focusCompanyMarketById({ id, setMainTab, setTrackTab, ensureAcc, setMarketQ, marketSectionRef, marketSearchRef }) {
  if (!id) return;
  setMainTab("track");
  setTrackTab("market");
  ensureAcc("market");
  setMarketQ(String(id));
  setTimeout(() => {
    try {
      marketSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      // no-op
    }
    try {
      marketSearchRef.current?.focus?.();
    } catch {
      // no-op
    }
  }, 50);
}
