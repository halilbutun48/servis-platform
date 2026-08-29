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
  buildFinancialOperationsCompanyKindDeniedPreview,
} from "../finance/companyBudgetAndServiceCost.js";
import {
  buildCompanyBudgetPlanPreviewInputs,
  getCompanyBudgetPlanOverview,
} from "../services/financialOperationsLifecycle.js";
import { attachCompanyBudgetLifecycleRoutes } from "./companyBudgetLifecycleRoutes.js";

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

function isBlockedCompanyKindForWrite(req, company) {
  return (
    String(req.user?.role || "").toUpperCase() === "COMPANY" &&
    [
      "SCHOOL",
      "ORGANIZATION",
    ].includes(
      String(
        company?.kind || ""
      ).toUpperCase()
    )
  );
}

function fmtTRY(value) {
  const n = Number(value);

  if (!Number.isFinite(n) || n <= 0) {
    return "-";
  }

  return (
    new Intl.NumberFormat("tr-TR", {
      maximumFractionDigits: 0,
    }).format(n) + " ₺"
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

function offerAmountLabel(offer) {
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
    ),
    requireStepUpWrite(
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

  attachCompanyBudgetLifecycleRoutes(
    r,
    {
      resolveTargetCompany,
      isBlockedCompanyKindForWrite,
    }
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

      if (
        String(
          req.user?.role || ""
        ).toUpperCase() ===
          "COMPANY" &&
        [
          "SCHOOL",
          "ORGANIZATION",
        ].includes(
          String(
            company.kind || ""
          ).toUpperCase()
        )
      ) {
        return res
          .status(403)
          .json(
            buildFinancialOperationsCompanyKindDeniedPreview({
              role:
                req.user?.role,
              companyKind:
                company.kind,
              scope: "COMPANY",
            })
          );
      }

      const [
        workflowSummary,
        commercialFlowSummary,
        budgetPlanOverview,
        latestShift,
        latestAgreement,
      ] = await Promise.all([
        buildWorkflowSummary(company),

        buildCommercialFlowSummary(
          company
        ),

        prisma.shift.findFirst({
          where: {
            companyId:
              company.id,
            status: {
              in: [
                "APPROVED",
                "ACTIVE",
                "SPLIT",
              ],
            },
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
          },
        }),

        prisma.agreement.findFirst({
          where: {
            companyId:
              company.id,
          },
          orderBy: [
            {
              updatedAt: "desc",
            },
            {
              id: "desc",
            },
          ],
          select: {
            id: true,
            status: true,
            companyId: true,
            roomId: true,
            startDate: true,
            endDate: true,
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
        }),

        getCompanyBudgetPlanOverview(
          company.id
        ),
      ]);

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
          companySummary:
            mergedCompanySummary,
          budgetInputs:
            {
              ...buildCompanyBudgetPlanPreviewInputs(
                budgetPlanOverview?.current
              ),
              ...(req.query || {}),
            },
          serviceCostInputs:
            req.query || {},
          supplierInputs:
            req.query || {},
          previewInputs:
            req.query || {},
        }),
          budgetPlan: budgetPlanOverview,
        }
      );
    })
  );

  return r;
}
