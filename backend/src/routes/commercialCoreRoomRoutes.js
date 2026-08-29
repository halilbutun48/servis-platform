import { asyncHandler } from "../middleware/asyncHandler.js";
import { authRequired, requireRole, requireStepUpWrite } from "../auth/middleware.js";
import { prisma } from "../prisma.js";
import {
  buildRoomCommercialSummary,
  buildRoomCommercialItems,
} from "../ops/commercialCoreManifest.js";
import {
  buildRoomProfitabilityAndQuoteFloorPreview,
} from "../finance/roomProfitabilityAndQuoteFloor.js";
import {
  applyRoomQuoteFloorDraft,
  archiveRoomQuoteFloorDraft,
  buildRoomQuoteFloorDraftPreviewInputs,
  getRoomQuoteFloorDraftOverview,
  saveRoomQuoteFloorDraft,
} from "../services/financialOperationsLifecycle.js";

async function resolveTargetRoom(req) {
  const role = String(req.user?.role || "").toUpperCase();
  const rawRoomId =
    role === "ROOM"
      ? req.user?.roomId
      : Number(req.body?.roomId || req.query?.roomId || 0);

  const roomId = Number(rawRoomId || 0) || 0;

  if (!roomId) {
    return null;
  }

  return prisma.room.findUnique({
    where: {
      id: roomId,
    },
    select: {
      id: true,
      name: true,
      status: true,
    },
  });
}

async function loadRoomFinancialContext(roomId, previewUser) {
  const [
    room,
    roomSummary,
    latestShift,
    latestAgreement,
  ] = await Promise.all([
    prisma.room.findUnique({
      where: {
        id: roomId,
      },
      select: {
        id: true,
        name: true,
      },
    }),

    buildRoomCommercialSummary(previewUser),

    prisma.shift.findFirst({
      where: {
        roomId,
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
          routeSnapshotValidatedAt: "desc",
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
          },
        },

        company: {
          select: {
            id: true,
            name: true,
            kind: true,
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
        roomId,
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
        companyOfferAmount: true,
        roomOfferAmount: true,
        updatedAt: true,

        room: {
          select: {
            id: true,
            name: true,
            region: { select: { id: true, name: true } },
          },
        },

        company: {
          select: {
            id: true,
            name: true,
            kind: true,
          },
        },
      },
    }),
  ]);

  return {
    room,
    roomSummary,
    latestShift,
    latestAgreement,
  };
}
export function attachCommercialCoreRoomRoutes(r) {
  r.get(
    "/room/summary",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    async (req, res) => {
      return res.json(
        await buildRoomCommercialSummary(req.user)
      );
    }
  );

  r.get(
    "/room/financial-operations/preview",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    asyncHandler(async (req, res) => {
      const roomId =
        Number(
          req.user?.roomId ||
          req.query?.roomId ||
          0
        ) || 0;

      if (roomId <= 0) {
        return res.status(400).json({
          allowed: false,
          readOnly: true,
          previewOnly: true,
          writeAction: false,
          error: "ROOM_ID_REQUIRED",
          message:
            "Room financial operations preview için roomId gerekli.",
        });
      }

      const previewUser = {
        ...req.user,
        roomId,
      };

      const [
        room,
        roomSummary,
        quoteFloorDraftOverview,
        latestShift,
        latestAgreement,
      ] = await Promise.all([
        prisma.room.findUnique({
          where: {
            id: roomId,
          },
          select: {
            id: true,
            name: true,
            region: { select: { id: true, name: true } },
          },
        }),

        buildRoomCommercialSummary(previewUser),

        getRoomQuoteFloorDraftOverview(roomId),

        prisma.shift.findFirst({
          where: {
            roomId,
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
              routeSnapshotValidatedAt: "desc",
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
                region: { select: { id: true, name: true } },
              },
            },

            company: {
              select: {
                id: true,
                name: true,
                kind: true,
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
            roomId,
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
            companyOfferAmount: true,
            roomOfferAmount: true,
            updatedAt: true,

            room: {
              select: {
                id: true,
                name: true,
              },
            },

            company: {
              select: {
                id: true,
                name: true,
                kind: true,
              },
            },
          },
        }),
      ]);

      if (!room) {
        return res.status(404).json({
          allowed: false,
          readOnly: true,
          previewOnly: true,
          writeAction: false,
          error: "ROOM_NOT_FOUND",
          message:
            "Room financial operations preview için oda bulunamadı.",
        });
      }

      return res.json(
        {
          ...buildRoomProfitabilityAndQuoteFloorPreview({
          role: req.user?.role,
          companyKind: req.user?.companyKind,
          room,
          shift: latestShift,
          agreement: latestAgreement,
          roomSummary,
          costInputs: req.query || {},
          quoteFloorInputs: {
            ...buildRoomQuoteFloorDraftPreviewInputs(
              quoteFloorDraftOverview?.current
            ),
            ...(req.query || {}),
          },
        }),
          quoteFloorDraft: quoteFloorDraftOverview,
        }
      );
    })
  );

  r.get(
    "/room/financial-operations/quote-floor-drafts/current",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    asyncHandler(async (req, res) => {
      const roomId =
        Number(
          req.user?.roomId ||
          req.query?.roomId ||
          0
        ) || 0;

      if (roomId <= 0) {
        return res.status(400).json({
          ok: false,
          error: "ROOM_ID_REQUIRED",
        });
      }

      const overview =
        await getRoomQuoteFloorDraftOverview(
          roomId
        );

      return res.json({
        ok: true,
        roomId,
        current: overview.current,
        draft: overview.draft,
        applied: overview.applied,
        items: overview.items,
      });
    })
  );

  r.post(
    "/room/financial-operations/quote-floor-drafts",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    requireStepUpWrite("ROOM", "SUPER_ADMIN"),
    asyncHandler(async (req, res) => {
      const room =
        await resolveTargetRoom(req);

      if (!room) {
        return res.status(400).json({
          ok: false,
          error: "ROOM_ID_REQUIRED",
        });
      }

      const previewUser = {
        ...req.user,
        roomId: room.id,
      };

      const context =
        await loadRoomFinancialContext(
          room.id,
          previewUser
        );

      const preview =
        buildRoomProfitabilityAndQuoteFloorPreview({
          role: req.user?.role,
          companyKind: req.user?.companyKind,
          room,
          shift: context.latestShift,
          agreement: context.latestAgreement,
          roomSummary: context.roomSummary,
          costInputs: req.body || {},
          quoteFloorInputs: req.body || {},
        });

      const saved =
        await saveRoomQuoteFloorDraft({
          roomId: room.id,
          actorUserId: req.user?.id || null,
          payload: req.body || {},
          computed: preview?.quoteFloor || {},
        });

      return res.status(201).json({
        ok: true,
        item: saved,
        preview,
      });
    })
  );

  r.patch(
    "/room/financial-operations/quote-floor-drafts/:id",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    requireStepUpWrite("ROOM", "SUPER_ADMIN"),
    asyncHandler(async (req, res) => {
      const room =
        await resolveTargetRoom(req);

      if (!room) {
        return res.status(400).json({
          ok: false,
          error: "ROOM_ID_REQUIRED",
        });
      }

      const previewUser = {
        ...req.user,
        roomId: room.id,
      };

      const context =
        await loadRoomFinancialContext(
          room.id,
          previewUser
        );

      const preview =
        buildRoomProfitabilityAndQuoteFloorPreview({
          role: req.user?.role,
          companyKind: req.user?.companyKind,
          room,
          shift: context.latestShift,
          agreement: context.latestAgreement,
          roomSummary: context.roomSummary,
          costInputs: req.body || {},
          quoteFloorInputs: req.body || {},
        });

      const saved =
        await saveRoomQuoteFloorDraft({
          roomId: room.id,
          draftId: Number(req.params.id || 0),
          expectedVersion: req.body?.version,
          actorUserId: req.user?.id || null,
          payload: req.body || {},
          computed: preview?.quoteFloor || {},
        });

      return res.json({
        ok: true,
        item: saved,
        preview,
      });
    })
  );

  r.post(
    "/room/financial-operations/quote-floor-drafts/:id/apply",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    requireStepUpWrite("ROOM", "SUPER_ADMIN"),
    asyncHandler(async (req, res) => {
      const room =
        await resolveTargetRoom(req);

      if (!room) {
        return res.status(400).json({
          ok: false,
          error: "ROOM_ID_REQUIRED",
        });
      }

      const saved =
        await applyRoomQuoteFloorDraft({
          roomId: room.id,
          draftId: Number(req.params.id || 0),
          expectedVersion: req.body?.version,
          actorUserId: req.user?.id || null,
          payload: req.body || {},
        });

      return res.json({
        ok: true,
        item: saved,
      });
    })
  );

  r.post(
    "/room/financial-operations/quote-floor-drafts/:id/archive",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    requireStepUpWrite("ROOM", "SUPER_ADMIN"),
    asyncHandler(async (req, res) => {
      const room =
        await resolveTargetRoom(req);

      if (!room) {
        return res.status(400).json({
          ok: false,
          error: "ROOM_ID_REQUIRED",
        });
      }

      const saved =
        await archiveRoomQuoteFloorDraft({
          roomId: room.id,
          draftId: Number(req.params.id || 0),
          expectedVersion: req.body?.version,
          actorUserId: req.user?.id || null,
        });

      return res.json({
        ok: true,
        item: saved,
      });
    })
  );

  r.get(
    "/room/items",
    authRequired(),
    requireRole("ROOM", "SUPER_ADMIN"),
    asyncHandler(async (req, res) => {
      return res.json({
        items: await buildRoomCommercialItems(req.user),
      });
    })
  );

  return r;
}
