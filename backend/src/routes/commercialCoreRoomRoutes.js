import { asyncHandler } from "../middleware/asyncHandler.js";
import { authRequired, requireRole } from "../auth/middleware.js";
import { prisma } from "../prisma.js";
import {
  buildRoomCommercialSummary,
  buildRoomCommercialItems,
} from "../ops/commercialCoreManifest.js";
import {
  buildRoomProfitabilityAndQuoteFloorPreview,
} from "../finance/roomProfitabilityAndQuoteFloor.js";
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
        buildRoomProfitabilityAndQuoteFloorPreview({
          role: req.user?.role,
          companyKind: req.user?.companyKind,
          room,
          shift: latestShift,
          agreement: latestAgreement,
          roomSummary,
          costInputs: req.query || {},
          quoteFloorInputs: req.query || {},
        })
      );
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
