import express from "express";
import { asyncHandler, wrapAsyncRouterMethods } from "../middleware/asyncHandler.js";
import { prisma } from "../prisma.js";
import { authRequired, requireRole, requireStepUpWrite } from "../auth/middleware.js";
import { rememberResponse } from "../utils/responseCache.js";
import {
  ymdTR,
  addDaysTR,
  atTR,
  dateOnlyUTCFromYmd,
  dayBitTRFromYmd,
} from "../time/tr.js";
import {
  buildCompanyBudgetAndServiceCostPreview,
} from "../finance/companyBudgetAndServiceCost.js";
import {
  buildCompanyBudgetPlanPreviewInputs,
  getCompanyBudgetAgreementEvidence,
  getCompanyHistoricalFinancialEvidence,
  getCompanyBudgetPlanOverview,
  selectCompanyBudgetPlanForPreview,
} from "../services/financialOperationsLifecycle.js";
import { enrichAgreementCommercialEvidence } from "../services/companyBudgetScope.js";
import { buildInvoiceCollectionSummary } from "../services/invoiceCollectionLedger.js";
import { attachCompanyBudgetLifecycleRoutes } from "./companyBudgetLifecycleRoutes.js";

export { selectCompanyBudgetPlanForPreview };

function scopeOf(user) {
  return {
    role: user?.role,
    companyId: user?.companyId,
    userId: user?.id,
  };
}

async function resolveCompany(req) {
  const role = String(req.user?.role || "").toUpperCase();
  const rawCompanyId =
    role === "COMPANY"
      ? req.user?.companyId
      : Number(req.query?.companyId || 0);

  const companyId = Number(rawCompanyId || 0) || 0;

  if (!companyId) {
    return null;
  }

  return prisma.company.findUnique({
    where: {
      id: companyId,
    },
    select: {
      id: true,
      kind: true,
      name: true,
      regionId: true,
      region: { select: { id: true, name: true } },
    },
  });
}

async function resolveTargetCompany(req) {
  const role = String(req.user?.role || "").toUpperCase();
  const rawCompanyId =
    role === "COMPANY"
      ? req.user?.companyId
      : Number(req.body?.companyId || req.query?.companyId || 0);

  const companyId = Number(rawCompanyId || 0) || 0;

  if (!companyId) {
    return null;
  }

  return prisma.company.findUnique({
    where: {
      id: companyId,
    },
    select: {
      id: true,
      kind: true,
      name: true,
    },
  });
}

const COMPANY_FINANCIAL_SHIFT_STATUSES = new Set([
  "APPROVED",
  "ACTIVE",
  "DONE",
  "SPLIT",
]);

function positiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function dateOnly(value) {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function compareFinancialShiftDesc(left, right) {
  const leftStart = new Date(left?.startAt || 0).getTime() || 0;
  const rightStart = new Date(right?.startAt || 0).getTime() || 0;
  if (rightStart !== leftStart) return rightStart - leftStart;
  return (Number(right?.id) || 0) - (Number(left?.id) || 0);
}

export function resolveCompanyFinancialContext({
  companyId,
  requestedAgreementId = null,
  requestedShiftId = null,
  candidateShifts = [],
} = {}) {
  const scopedCompanyId = positiveId(companyId);
  const agreementId = positiveId(requestedAgreementId);
  const shiftId = positiveId(requestedShiftId);

  const validCandidates = (Array.isArray(candidateShifts) ? candidateShifts : [])
    .filter((shift) => {
      const shiftCompanyId = positiveId(shift?.companyId);
      const linkedAgreement = shift?.agreement;
      const linkedAgreementId = positiveId(shift?.agreementId ?? linkedAgreement?.id);
      const agreementCompanyId = positiveId(linkedAgreement?.companyId);
      const status = String(shift?.status || "").toUpperCase();
      const shiftDate = dateOnly(shift?.startAt);
      const agreementStart = dateOnly(linkedAgreement?.startDate);
      const agreementEnd = dateOnly(linkedAgreement?.endDate);

      if (!scopedCompanyId || shiftCompanyId !== scopedCompanyId) return false;
      if (!linkedAgreementId || !linkedAgreement || linkedAgreement.id !== linkedAgreementId) return false;
      if (agreementCompanyId !== scopedCompanyId) return false;
      if (!COMPANY_FINANCIAL_SHIFT_STATUSES.has(status)) return false;
      if (agreementId && linkedAgreementId !== agreementId) return false;
      if (shiftId && positiveId(shift?.id) !== shiftId) return false;
      if (agreementStart && shiftDate && shiftDate < agreementStart) return false;
      if (agreementEnd && shiftDate && shiftDate > agreementEnd) return false;
      return true;
    })
    .sort(compareFinancialShiftDesc);

  if (validCandidates.length === 0) {
    return {
      status: "NO_CANONICAL_CONTEXT",
      shift: null,
      agreement: null,
      relatedShiftCount: 0,
      relatedShiftIds: [],
    };
  }

  const selectedShift = validCandidates[0];
  const selectedAgreement = selectedShift.agreement;
  const relatedShifts = validCandidates.filter(
    (shift) => positiveId(shift?.agreementId ?? shift?.agreement?.id) === positiveId(selectedAgreement?.id),
  );

  return {
    status: "RESOLVED",
    shift: selectedShift,
    agreement: selectedAgreement,
    relatedShiftCount: relatedShifts.length,
    relatedShiftIds: relatedShifts.map((shift) => positiveId(shift?.id)).filter(Boolean),
  };
}

function isBlockedCompanyKindForWrite(req, company) {
  if (String(req.user?.role || "").toUpperCase() !== "COMPANY") return false;
  return !["COMPANY", "SCHOOL", "ORGANIZATION"].includes(String(company?.kind || "").toUpperCase());
}

function fmtTRY(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  const n = Number(value);

  if (!Number.isSafeInteger(n) || n < 0) {
    return "-";
  }

  return (
    new Intl.NumberFormat("tr-TR", {
      maximumFractionDigits: 2,
    }).format(n / 100) + " ₺"
  );
}

function statusOf(value) {
  return String(value || "").trim().toUpperCase();
}

const FINAL_SHIFT_STATUSES = new Set([
  "APPROVED",
  "ACTIVE",
  "DONE",
  "REJECTED",
  "SPLIT",
]);

const NON_MARKET_SHIFT_STATUSES = [
  "DRAFT",
  ...Array.from(FINAL_SHIFT_STATUSES),
];

function isFinalShiftStatus(value) {
  return FINAL_SHIFT_STATUSES.has(statusOf(value));
}

export function offerAmountLabel(offer) {
  const parts = [];

  const company = fmtTRY(offer?.amountCompany);
  const room = fmtTRY(offer?.amountRoom);

  if (company !== "-") {
    parts.push(`Firma: ${company}`);
  }

  if (room !== "-") {
    parts.push(`Oda: ${room}`);
  }

  return parts.length
    ? parts.join(" / ")
    : "-";
}

async function buildWorkflowSummary(company) {
  const today = ymdTR();
  const todayDate = dateOnlyUTCFromYmd(today);
  const todayBit = dayBitTRFromYmd(today);
  const tomorrowStart = atTR(
    addDaysTR(today, 1),
    0
  );
  const todayStart = atTR(today, 0);

  const geoKind =
    String(company?.kind || "COMPANY").toUpperCase() === "SCHOOL"
      ? "STUDENT"
      : "PERSONEL";

  const [
    agreementRows,
    todayShiftCount,
    marketShiftCount,
    geoNeedsReview,
    openOffersCount,
  ] = await Promise.all([
    prisma.agreement.findMany({
      where: {
        companyId: company.id,
        status: {
          in: [
            "REQUESTED",
            "APPROVED",
            "ACTIVE",
          ],
        },
        startDate: {
          lte: todayDate,
        },
        endDate: {
          gte: todayDate,
        },
      },
      select: {
        id: true,
        weekMask: true,
      },
      take: 240,
      orderBy: {
        id: "desc",
      },
    }),

    prisma.shift.count({
      where: {
        companyId: company.id,
        startAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
    }),

    prisma.shift.count({
      where: {
        companyId: company.id,
        roomId: null,
        status: {
          not: "DRAFT",
        },
      },
    }),

    prisma.personel.count({
      where: {
        companyId: company.id,
        kind: geoKind,
        geoStatus: "NEEDS_REVIEW",
      },
    }),

    prisma.shiftOffer.count({
      where: {
        shift: {
          companyId: company.id,
        },
        status: "OPEN",
      },
    }),
  ]);

  const todayAgreements = (
    agreementRows || []
  ).filter(
    (row) =>
      (Number(row?.weekMask || 0) & todayBit) !== 0
  ).length;

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
  const [
    marketShiftCount,
    pendingShiftCount,
    finalShiftCount,
    activeShiftCount,
    counterShiftCount,
    shiftRows,
  ] = await Promise.all([
    prisma.shift.count({
      where: {
        companyId: company.id,
        status: {
          notIn: NON_MARKET_SHIFT_STATUSES,
        },
        roomId: null,
      },
    }),

    prisma.shift.count({
      where: {
        companyId: company.id,
        status: {
          notIn: NON_MARKET_SHIFT_STATUSES,
        },
        NOT: [
          {
            roomId: null,
          },
          {
            AND: [
              {
                status: "SPLIT",
              },
              {
                splitRootId: null,
              },
            ],
          },
        ],
      },
    }),

    prisma.shift.count({
      where: {
        companyId: company.id,
        status: {
          in: Array.from(FINAL_SHIFT_STATUSES),
        },
      },
    }),

    prisma.shift.count({
      where: {
        companyId: company.id,
        status: {
          in: [
            "APPROVED",
            "ACTIVE",
            "SPLIT",
          ],
        },
      },
    }),

    prisma.shift.count({
      where: {
        companyId: company.id,
        status: {
          notIn: NON_MARKET_SHIFT_STATUSES,
        },
        roomId: null,
        offers: {
          some: {
            status: "COUNTERED",
          },
        },
      },
    }),

    prisma.shift.findMany({
      where: {
        companyId: company.id,
        status: {
          not: "DRAFT",
        },
      },
      orderBy: [
        {
          startAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      take: 12,
      include: {
        room: {
          select: {
            id: true,
            name: true,
          },
        },
        offers: {
          select: {
            id: true,
            roomId: true,
            status: true,
            updatedAt: true,
            amountCompany: true,
            amountRoom: true,
            room: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [
            {
              createdAt: "desc",
            },
            {
              id: "desc",
            },
          ],
        },
      },
    }),
  ]);

  const items = (
    Array.isArray(shiftRows)
      ? shiftRows
      : []
  )
    .map((shift) => {
      const shiftId =
        Number(shift?.id || 0) || null;

      const status =
        statusOf(shift?.status) || "-";

      const isFinal =
        isFinalShiftStatus(status);

      const roomId =
        Number(shift?.roomId || 0);

      const offers =
        Array.isArray(shift?.offers)
          ? shift.offers
          : [];

      const latestOffer =
        offers[0] || null;

      const hasCounter =
        offers.some(
          (offer) =>
            statusOf(offer?.status) ===
            "COUNTERED"
        );

      const amountLabel =
        latestOffer
          ? offerAmountLabel(latestOffer)
          : "-";

      const updatedAt =
        latestOffer?.updatedAt ||
        shift?.startAt ||
        shift?.createdAt ||
        null;

      const counterparty =
        shift?.room?.name ||
        (
          roomId > 0
            ? `Room #${roomId}`
            : (
                latestOffer?.room?.name ||
                "Market"
              )
        );

      if (isFinal) {
        return {
          id: `shift-${shiftId}`,
          shiftId,
          offerId: latestOffer?.id || null,
          agreementId: shift?.agreementId || null,
          counterparty,
          flowLabel: "Operasyon",
          amountLabel,
          statusLabel: status,
          updatedAt,
          nextStep:
            status === "SPLIT"
              ? "Bölünmüş vardiya kaydını aç"
              : "Vardiya / hizmet tarafını aç",
          section: "list",
        };
      }

      if (roomId > 0) {
        return {
          id: `shift-${shiftId}`,
          shiftId,
          offerId: latestOffer?.id || null,
          agreementId: shift?.agreementId || null,
          counterparty,
          flowLabel: "Bekleyen",
          amountLabel,
          statusLabel: status,
          updatedAt,
          nextStep:
            "Pazarlık bitti; Bekleyen Taleplerde operasyon hazırlığını takip et",
          section: "pending",
        };
      }

      return {
        id: `shift-${shiftId}`,
        shiftId,
        offerId: latestOffer?.id || null,
        agreementId: shift?.agreementId || null,
        counterparty,
        flowLabel:
          hasCounter
            ? "Karşı Teklif"
            : "Market Teklifi",
        amountLabel,
        statusLabel:
          hasCounter
            ? "COUNTERED"
            : status,
        updatedAt,
        nextStep:
          "Pazarlığı Market / Teklifler ekranında sürdür",
        section: "market",
      };
    })
    .sort(
      (a, b) =>
        new Date(
          b.updatedAt || 0
        ).getTime() -
        new Date(
          a.updatedAt || 0
        ).getTime()
    )
    .slice(0, 12);

  return {
    cards: {
      marketShiftCount,
      counterShiftCount,
      pendingShiftCount,
      finalShiftCount,
      activeShiftCount,
      marketOffers:
        marketShiftCount,
      counterOffers:
        counterShiftCount,
      acceptedOffers:
        pendingShiftCount,
      listCount:
        finalShiftCount,
      activeOps:
        activeShiftCount,
    },
    items,
  };
}

export function companyOverviewRouter() {
  const r = express.Router();
  wrapAsyncRouterMethods(r);

  r.use(
    authRequired(),
    requireRole(
      "COMPANY",
      "SUPER_ADMIN"
    )
  );

  function isForceRefresh(req) {
    return [
      "1",
      "true",
      "yes",
      "on",
    ].includes(
      String(
        req?.query?.force || ""
      )
        .trim()
        .toLowerCase()
    );
  }

  // Route ownership anchor for company overview.

  r.get(
    "/workflow-summary",
    asyncHandler(async (req, res) => {
      const company =
        await resolveCompany(req);

      if (!company) {
        return res.status(400).json({
          ok: false,
          error: "companyId required",
        });
      }

      const payload =
        await rememberResponse(
          `company-overview:workflow:${company.id}`,
          () =>
            buildWorkflowSummary(
              company
            ),
          {
            ttlMs: 15000,
            scope: scopeOf(req.user),
          }
        );

      return res.json(payload);
    })
  );

  r.get(
    "/commercial-flow-summary",
    asyncHandler(async (req, res) => {
      const company =
        await resolveCompany(req);

      if (!company) {
        return res.status(400).json({
          ok: false,
          error: "companyId required",
        });
      }

      const payload =
        isForceRefresh(req)
          ? await buildCommercialFlowSummary(
              company
            )
          : await rememberResponse(
              `company-overview:commercial-flow:${company.id}`,
              () =>
                buildCommercialFlowSummary(
                  company
                ),
              {
                ttlMs: 15000,
                scope:
                  scopeOf(req.user),
              }
            );

      return res.json(payload);
    })
  );

  r.get(
    "/financial-operations/preview",
    asyncHandler(async (req, res) => {
      const company =
        await resolveCompany(req);

      if (!company) {
        return res.status(400).json({
          ok: false,
          error: "companyId required",
        });
      }

      const requestedAgreementId = positiveId(
        req.query?.agreementId ?? req.query?.focusAgreementId,
      );
      const requestedShiftId = positiveId(
        req.query?.shiftId ?? req.query?.focusShiftId,
      );

      const [
        workflowSummary,
        commercialFlowSummary,
        budgetPlanOverview,
        candidateFinancialShifts,
        companyOfferCandidates,
        historicalHakedisAgreementRefs,
      ] = await Promise.all([
        buildWorkflowSummary(company),

        buildCommercialFlowSummary(
          company
        ),

        getCompanyBudgetPlanOverview(
          company.id
        ),

        prisma.shift.findMany({
          where: {
            companyId:
              company.id,
            status: {
              in: [
                "APPROVED",
                "ACTIVE",
                "DONE",
                "SPLIT",
              ],
            },
            agreementId: {
              not: null,
              ...(requestedAgreementId ? { equals: requestedAgreementId } : {}),
            },
            ...(requestedShiftId ? { id: requestedShiftId } : {}),
          },
          orderBy: [
            {
              routeSnapshotValidatedAt:
                "desc",
            },
            {
              createdAt: "desc",
            },
            {
              id: "desc",
            },
          ],
          take: 400,
          select: {
            id: true,
            status: true,
            roomId: true,
            companyId: true,
            routeSnapshotDistanceM: true,
            routeSnapshotDurationSec: true,
            routeSnapshotValidatedAt: true,
            routeSnapshotInputHash: true,
            requiredPaxOverride: true,
            direction: true,
            pattern: true,
            organizationPlanId: true,
            companyOfferAmount: true,
            roomOfferAmount: true,
            companyOfferNote: true,
            roomOfferNote: true,
            startAt: true,
            endAt: true,

            room: {
              select: {
                id: true,
                name: true,
                regionId: true,
                region: { select: { id: true, name: true } },
              },
            },

            company: {
              select: {
                id: true,
                name: true,
                kind: true,
                regionId: true,
                region: { select: { id: true, name: true } },
              },
            },

            vehicle: {
              select: {
                id: true,
                plate: true,
                capacity: true,
              },
            },

            _count: {
              select: {
                people: true,
                stops: true,
              },
            },

            organizationPlan: {
              select: {
                id: true,
                title: true,
                planDate: true,
                startMin: true,
                endMin: true,
                status: true,
                stops: {
                  select: { id: true, passengerCount: true },
                  orderBy: { order: "asc" },
                },
              },
            },

            agreement: {
              select: {
                id: true,
                status: true,
                companyId: true,
                roomId: true,
                startDate: true,
                endDate: true,
                weekMask: true,
                startMin: true,
                endMin: true,
                direction: true,
                pattern: true,
                companyOfferAmount: true,
                roomOfferAmount: true,
                companyOfferNote: true,
                roomOfferNote: true,
                updatedAt: true,

                room: {
                  select: {
                    id: true,
                    name: true,
                    regionId: true,
                    region: { select: { id: true, name: true } },
                  },
                },

                company: {
                  select: {
                    id: true,
                    name: true,
                    kind: true,
                    regionId: true,
                    region: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        }),

        prisma.shiftOffer.findMany({
          where: {
            status: { in: ["OPEN", "COUNTERED", "ACCEPTED", "CANCELLED"] },
            shift: { companyId: company.id },
          },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: 400,
          select: {
            id: true,
            shiftId: true,
            roomId: true,
            status: true,
            amountCompany: true,
            amountRoom: true,
            room: { select: { id: true, name: true } },
            shift: {
              select: {
                id: true,
                companyId: true,
                agreementId: true,
                status: true,
                startAt: true,
                endAt: true,
                requiredPaxOverride: true,
                routeSnapshotDistanceM: true,
                routeSnapshotDurationSec: true,
                _count: { select: { stops: true, people: true } },
              },
            },
          },
        }),

        prisma.hakedisRecord.findMany({
          where: { companyId: company.id },
          select: { agreementId: true },
        }),

      ]);

      const financialContext = resolveCompanyFinancialContext({
        companyId: company.id,
        requestedAgreementId,
        requestedShiftId,
        candidateShifts: candidateFinancialShifts,
      });
      const latestShift = financialContext.shift;
      const latestAgreement = financialContext.agreement
        ? (await enrichAgreementCommercialEvidence(prisma, [financialContext.agreement]))[0] || null
        : null;
      const latestOrganizationPlan = latestShift?.organizationPlan || null;
      const linkedCompanyInvoice = latestAgreement?.id
        ? await prisma.invoiceRecord.findFirst({
          where: {
            agreementId: Number(latestAgreement.id),
            companyId: Number(company.id),
            roomId: { not: null },
          },
          orderBy: [{ issuedAt: "desc" }, { id: "desc" }],
          select: { id: true },
        })
        : null;
      const companyInvoicePayment = linkedCompanyInvoice
        ? await buildInvoiceCollectionSummary({
          prisma,
          actor: { id: req.user?.id, role: "COMPANY", companyId: company.id },
          invoiceId: linkedCompanyInvoice.id,
        })
        : null;

      const mergedCompanySummary = {
        ...workflowSummary,
        cards: {
          ...(
            workflowSummary?.cards ||
            {}
          ),
          ...(
            commercialFlowSummary?.cards ||
            {}
          ),
        },
      };

      const selectedBudgetPlan = selectCompanyBudgetPlanForPreview(
        budgetPlanOverview,
        req.query?.budgetPlanId,
      );
      const selectedBudgetPlanOverview = budgetPlanOverview
        ? { ...budgetPlanOverview, current: selectedBudgetPlan }
        : budgetPlanOverview;

      const commitmentEvidence = await getCompanyBudgetAgreementEvidence(
        company.id,
        selectedBudgetPlan?.agreementIds || [],
      );

      const historicalAgreementIds = [...new Set(
        (historicalHakedisAgreementRefs || [])
          .map((row) => Number(row?.agreementId || 0))
          .filter((id) => Number.isSafeInteger(id) && id > 0),
      )];
      const historicalAgreementRows = historicalAgreementIds.length
        ? await prisma.agreement.findMany({
          where: { companyId: company.id, id: { in: historicalAgreementIds } },
          select: { id: true, companyId: true, status: true, companyOfferAmount: true, roomOfferAmount: true, startDate: true, endDate: true },
          orderBy: [{ endDate: "desc" }, { id: "desc" }],
        })
        : [];
      const historicalFinancialEvidence = await getCompanyHistoricalFinancialEvidence(
        company.id,
        historicalAgreementRows,
      );

      return res.json(
        {
          ...buildCompanyBudgetAndServiceCostPreview({
          role:
            req.user?.role,
          companyKind:
            company.kind,
          company,
          shift:
            latestShift,
          agreement:
            latestAgreement,
          organizationPlan:
            latestOrganizationPlan,
          companySummary:
            mergedCompanySummary,
          budgetInputs:
            {
              ...buildCompanyBudgetPlanPreviewInputs(
                selectedBudgetPlan
              ),
              ...(req.query || {}),
            },
          serviceCostInputs:
            req.query || {},
          supplierInputs:
            req.query || {},
          previewInputs:
            req.query || {},
          commitmentInputs: {
            budgetPlan: selectedBudgetPlan || null,
            agreements: selectedBudgetPlan?.scope?.eligible || [],
            evidenceByAgreementId: commitmentEvidence,
          },
          offerInputs: {
            offers: companyOfferCandidates,
          },
        }),
          contextResolution: {
            status: financialContext.status,
            requestedAgreementId,
            requestedShiftId,
            selectedAgreementId: positiveId(financialContext.agreement?.id),
            selectedShiftId: positiveId(financialContext.shift?.id),
            relatedShiftCount: financialContext.relatedShiftCount,
            relatedShiftIds: financialContext.relatedShiftIds,
          },
          budgetPlan: selectedBudgetPlanOverview,
          historicalFinancialEvidence,
          companyInvoicePayment,
        }
      );
    })
  );

  // Read-only buyer-finance previews do not require step-up. Keep the
  // approval boundary on budget-plan lifecycle writes below.
  r.use(requireStepUpWrite("COMPANY", "SUPER_ADMIN"));

  attachCompanyBudgetLifecycleRoutes(
    r,
    {
      resolveTargetCompany,
      isBlockedCompanyKindForWrite,
    }
  );

  return r;
}
