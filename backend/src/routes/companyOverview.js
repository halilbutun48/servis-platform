import express from "express";
import { prisma } from "../prisma.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { rememberResponse } from "../utils/responseCache.js";
import { ymdTR, addDaysTR, atTR, dateOnlyUTCFromYmd, dayBitTRFromYmd } from "../time/tr.js";

function scopeOf(user) {
  return { role: user?.role, companyId: user?.companyId, userId: user?.id };
}

async function resolveCompany(req) {
  const role = String(req.user?.role || "").toUpperCase();
  const rawCompanyId = role === "COMPANY" ? req.user?.companyId : Number(req.query?.companyId || 0);
  const companyId = Number(rawCompanyId || 0) || 0;
  if (!companyId) return null;
  return prisma.company.findUnique({ where: { id: companyId }, select: { id: true, kind: true, name: true } });
}

function fmtTRY(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "-";
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n) + " ₺";
}

function statusOf(value) {
  return String(value || "").trim().toUpperCase();
}

function offerAmountLabel(offer) {
  const parts = [];
  const company = fmtTRY(offer?.amountCompany);
  const room = fmtTRY(offer?.amountRoom);
  if (company !== "-") parts.push(`Firma: ${company}`);
  if (room !== "-") parts.push(`Oda: ${room}`);
  return parts.length ? parts.join(" / ") : "-";
}

async function buildWorkflowSummary(company) {
  const today = ymdTR();
  const todayDate = dateOnlyUTCFromYmd(today);
  const todayBit = dayBitTRFromYmd(today);
  const tomorrowStart = atTR(addDaysTR(today, 1), 0);
  const todayStart = atTR(today, 0);
  const geoKind = String(company?.kind || "COMPANY").toUpperCase() === "SCHOOL" ? "STUDENT" : "PERSONEL";

  const [agreementRows, todayShiftCount, marketShiftCount, geoNeedsReview, openOffersCount] = await Promise.all([
    prisma.agreement.findMany({
      where: {
        companyId: company.id,
        status: { in: ["REQUESTED", "APPROVED", "ACTIVE"] },
        startDate: { lte: todayDate },
        endDate: { gte: todayDate },
      },
      select: { id: true, weekMask: true },
      take: 240,
      orderBy: { id: "desc" },
    }),
    prisma.shift.count({ where: { companyId: company.id, startAt: { gte: todayStart, lt: tomorrowStart } } }),
    prisma.shift.count({ where: { companyId: company.id, roomId: null } }),
    prisma.personel.count({ where: { companyId: company.id, kind: geoKind, geoStatus: "NEEDS_REVIEW" } }),
    prisma.shiftOffer.count({ where: { shift: { companyId: company.id }, status: { in: ["OPEN", "COUNTERED"] } } }),
  ]);

  const todayAgreements = (agreementRows || []).filter((row) => (Number(row?.weekMask || 0) & todayBit) !== 0).length;

  return {
    todayYmd: today,
    cards: {
      todayAgreements,
      todayShiftCount,
      marketShiftCount,
      geoNeedsReview,
      openOffersCount,
    },
  };
}

async function buildCommercialFlowSummary(company) {
  const FINAL_STATUSES = ["APPROVED", "ACTIVE", "DONE", "REJECTED"];
  const [marketOffersCount, counterOffersCount, acceptedOffersCount, listCount, activeOps, offerRows, finalRows] = await Promise.all([
    prisma.shiftOffer.count({ where: { shift: { companyId: company.id }, status: { in: ["OPEN", "COUNTERED"] } } }),
    prisma.shiftOffer.count({ where: { shift: { companyId: company.id }, status: "COUNTERED" } }),
    prisma.shiftOffer.count({ where: { shift: { companyId: company.id }, status: "ACCEPTED" } }),
    prisma.shift.count({ where: { companyId: company.id, status: { in: FINAL_STATUSES } } }),
    prisma.shift.count({ where: { companyId: company.id, status: { in: ["APPROVED", "ACTIVE"] } } }),
    prisma.shiftOffer.findMany({
      where: { shift: { companyId: company.id }, status: { in: ["OPEN", "COUNTERED", "ACCEPTED"] } },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { room: { select: { id: true, name: true } }, shift: { select: { id: true, status: true, startAt: true, createdAt: true } } },
    }),
    prisma.shift.findMany({
      where: { companyId: company.id, status: { in: FINAL_STATUSES } },
      orderBy: [{ startAt: "desc" }, { id: "desc" }],
      take: 8,
      include: { room: { select: { id: true, name: true } } },
    }),
  ]);

  const offerItems = (offerRows || []).map((o) => {
    const status = statusOf(o?.status);
    return {
      id: `offer-${o.id}`,
      shiftId: Number(o?.shiftId || o?.shift?.id || 0) || null,
      counterparty: o?.room?.name || (Number(o?.roomId || 0) > 0 ? `Room #${o.roomId}` : "Room"),
      flowLabel: status === "OPEN" ? "Teklif" : status === "COUNTERED" ? "Karşı teklif" : status === "ACCEPTED" ? "Kabul" : "Kapanan teklif",
      amountLabel: offerAmountLabel(o),
      statusLabel: status || "-",
      updatedAt: o?.updatedAt || o?.createdAt || o?.shift?.startAt || null,
      nextStep: status === "ACCEPTED" ? "Pazarlık bitti; Bekleyen Taleplerde operasyon hazırlığını takip et" : "Pazarlığı Market / Teklifler ekranında sürdür",
      section: status === "ACCEPTED" ? "pending" : "market",
    };
  });

  const shiftItems = (finalRows || []).map((s) => ({
    id: `shift-${s.id}`,
    shiftId: Number(s.id) || null,
    counterparty: s?.room?.name || (Number(s?.roomId || 0) > 0 ? `Room #${s.roomId}` : "Room"),
    flowLabel: "Operasyon",
    amountLabel: "-",
    statusLabel: statusOf(s?.status) || "-",
    updatedAt: s?.startAt || s?.createdAt || null,
    nextStep: "Vardiya / hizmet tarafını aç",
    section: "list",
  }));

  const items = [...offerItems, ...shiftItems]
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    .slice(0, 8);

  return {
    cards: { marketOffers: marketOffersCount, counterOffers: counterOffersCount, acceptedOffers: acceptedOffersCount, listCount, activeOps },
    items,
  };
}

export function companyOverviewRouter() {
  const r = express.Router();
  r.use(authRequired(), requireRole("COMPANY", "SUPER_ADMIN"));

  r.get("/workflow-summary", async (req, res) => {
    const company = await resolveCompany(req);
    if (!company) return res.status(400).json({ ok: false, error: "companyId required" });
    const payload = await rememberResponse(`company-overview:workflow:${company.id}`, () => buildWorkflowSummary(company), { ttlMs: 15000, scope: scopeOf(req.user) });
    return res.json(payload);
  });

  r.get("/commercial-flow-summary", async (req, res) => {
    const company = await resolveCompany(req);
    if (!company) return res.status(400).json({ ok: false, error: "companyId required" });
    const payload = await rememberResponse(`company-overview:commercial-flow:${company.id}`, () => buildCommercialFlowSummary(company), { ttlMs: 15000, scope: scopeOf(req.user) });
    return res.json(payload);
  });

  return r;
}
