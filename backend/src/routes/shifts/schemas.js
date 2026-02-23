// backend/src/routes/shifts/schemas.js
// Zod schema'lar burada tutulur (shifts.js satır sayısını azaltmak için)

import { z } from "zod";

// ---------------------------
// Helpers (string/number -> int, allow null)
// ---------------------------
const coercePosInt = z.coerce.number().int().positive();

const posIntOpt = coercePosInt.optional();

// "" | "   " | undefined -> null
// "25.000" -> 25000
// 0 / NaN -> fail (null değilse)
const posIntOrNullOpt = z
  .preprocess((v) => {
    if (v === undefined) return undefined; // optional alan
    if (v === null) return null;

    if (typeof v === "string") {
      const s = v.trim();
      if (!s) return null;
      const digits = s.replace(/[^\d]/g, "");
      if (!digits) return null;
      return digits; // z.coerce.number bunu Number(digits) yapar
    }

    return v; // number vb
  }, z.union([z.null(), coercePosInt]))
  .optional();

const strOrNullMax = (max) =>
  z
    .preprocess((v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const s = String(v).trim();
      return s ? s : null;
    }, z.union([z.string().max(max), z.null()]))
    .optional();

// ----------------------------------
// Create shift
// ----------------------------------
export const createShiftSchema = z.object({
  companyId: posIntOpt,
  // ✅ M24: roomId optional (market shift)
  roomId: posIntOpt,
  startAt: z.string(),
  endAt: z.string(),
  status: z.string().optional(),

  // ✅ M19: routing meta (optional)
  hubLat: z.preprocess((v) => (v == null || v === "" ? null : Number(v)), z.number().finite().nullable()).optional(),
  hubLng: z.preprocess((v) => (v == null || v === "" ? null : Number(v)), z.number().finite().nullable()).optional(),
  direction: z.enum(["INBOUND", "OUTBOUND"]).optional(),
  pattern: z.enum(["ONE_WAY", "LOOP"]).optional(),

  // COMPANY → ROOM teklif (shift seviyesinde)
  companyOfferVehicleId: posIntOpt,
  companyOfferAmount: posIntOpt,
  companyOfferNote: z.string().max(500).optional(),

  stops: z
    .array(
      z.object({
        name: z.string().min(1),
        lat: z.number(),
        lng: z.number(),
        order: z.number().int().min(1),
        address: z.string().max(250).optional(),
        // Back-compat: if client omits type, default to MANUAL
        type: z.enum(["COMMON", "MANUAL"]).default("MANUAL"),
      })
    )
    .optional(),
});

// ----------------------------------
// M24: Marketplace offers
// ----------------------------------
export const createShiftOffersSchema = z.object({
  roomIds: z.array(coercePosInt).min(1).max(10),
  amountCompany: posIntOpt,
  noteCompany: z.string().max(500).optional(),
});

export const counterShiftOfferSchema = z.object({
  amountRoom: posIntOpt,
  noteRoom: z.string().max(500).optional(),
});

// ----------------------------------
// Update shift
// ----------------------------------
export const updateShiftSchema = z
  .object({
    roomId: posIntOpt,
    startAt: z
      .string()
      .datetime({ offset: true })
      .or(z.string().datetime({ offset: false }))
      .optional(),
    endAt: z
      .string()
      .datetime({ offset: true })
      .or(z.string().datetime({ offset: false }))
      .optional(),
    status: z.string().optional(),

    // harmless extras (ignored by handler)
    hubLat: z.preprocess((v) => (v == null || v === "" ? null : Number(v)), z.number().finite().nullable()).optional(),
    hubLng: z.preprocess((v) => (v == null || v === "" ? null : Number(v)), z.number().finite().nullable()).optional(),
    direction: z.enum(["INBOUND", "OUTBOUND"]).optional(),
    pattern: z.enum(["ONE_WAY", "LOOP"]).optional(),
    companyOfferVehicleId: posIntOpt,
    companyOfferAmount: z.coerce.number().nonnegative().optional(),
    companyOfferNote: z.string().max(500).optional(),
  })
  .strict();

export const approveSchema = z.object({
  vehicleId: coercePosInt,
  driverId: posIntOpt,
  status: z.string().optional(),
});

// Backward-compatible alias
export const approveShiftSchema = approveSchema;

export const roomApproveShiftSchema = z
  .object({
    vehicleId: posIntOpt,
    driverId: posIntOpt,
    status: z.string().optional(),
    roomOfferVehicleId: posIntOpt,
    roomOfferDriverId: posIntOpt,
  })
  .strict();

export const assignShiftSchema = z
  .object({
    vehicleId: coercePosInt,
    driverId: coercePosInt,
  })
  .strict();

// ----------------------------------
// ROOM → COMPANY teklif schema (pazarlık)
// ✅ string sayı kabul eder + null kabul eder
// ----------------------------------
export const roomOfferSchema = z
  .object({
    roomOfferVehicleId: posIntOrNullOpt,
    roomOfferAmount: posIntOrNullOpt,
    roomOfferNote: strOrNullMax(500),

    // opsiyonel: driver'a ilet (room isterse)
    notifyDriver: z.boolean().optional(),
    driverNote: strOrNullMax(500),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field required" });

// COMPANY: room teklifine karar (kabul/red)
export const roomOfferDecisionSchema = z
  .object({
    decision: z.enum(["ACCEPTED", "REJECTED"]),
    note: z.string().max(200).optional(),
  })
  .strict();

// COMPANY: mevcut shift üstünde teklif güncelle (karşı teklif)
// ✅ string sayı kabul eder + null kabul eder
export const companyOfferSchema = z
  .object({
    companyOfferVehicleId: posIntOrNullOpt,
    companyOfferAmount: posIntOrNullOpt,
    companyOfferNote: strOrNullMax(500),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field required" });

export const rejectShiftSchema = z
  .object({
    reason: z.string().max(200).optional(),
  })
  .strict();

// Compat aliases (routes expect these names)
export const updateCompanyOfferSchema = companyOfferSchema;
export const updateRoomOfferSchema = roomOfferSchema;
export const updateRoomOfferDecisionSchema = roomOfferDecisionSchema;

export const addStopSchema = z.object({
  name: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  order: z.number().int().min(1).optional(),
  // Back-compat: if client omits type, default to MANUAL
  type: z.enum(["COMMON", "MANUAL"]).default("MANUAL"),
});

export const updateStopSchema = z
  .object({
    name: z.string().min(1).optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    order: z.number().int().min(1).optional(),
    type: z.enum(["COMMON", "MANUAL"]).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field required" });

export const reorderSchema = z
  .object({
    idsInOrder: z.array(z.number().int().positive()).optional(),
    orders: z
      .array(
        z.object({
          id: z.number().int().positive().optional(),
          stopId: z.number().int().positive().optional(),
          order: z.number().int().min(1).optional(),
        })
      )
      .optional(),
  })
  .strict();

export const reachedSchema = z.object({ order: z.number().int().min(1) });

export const fromTemplateSchema = z
  .object({
    templateId: z.number().int().positive(),
    mode: z.enum(["REPLACE", "APPEND"]).default("REPLACE"),
  })
  .strict();

// Back-compat aliases (older modules expect these names)
export const shiftCreateSchema = createShiftSchema;
export const stopCreateSchema = addStopSchema;
export const stopPatchSchema = updateStopSchema;
export const stopUpdateSchema = updateStopSchema;
export const applyTemplateSchema = fromTemplateSchema;
export const reorderStopsSchema = reorderSchema;
