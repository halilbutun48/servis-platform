// backend/src/routes/shifts.schemas.js
// Zod schema'lar burada tutulur (shifts.js satır sayısını azaltmak için)

import { z } from "zod";

export const createShiftSchema = z.object({
  // COMPANY rolünde companyId body'de zorunlu değil (token'dan alınır).
  // SUPER_ADMIN için ise handler tarafında companyId zorunlu tutulur.
  companyId: z.number().int().positive().optional(),
  roomId: z.number().int().positive(),
  startAt: z.string(),
  endAt: z.string(),
  status: z.string().optional(),

  // COMPANY → ROOM teklif (shift seviyesinde)
  companyOfferVehicleId: z.number().int().positive().optional(),
  // teklif tutarı (TL)
  companyOfferAmount: z.number().int().positive().optional(),
  companyOfferNote: z.string().max(200).optional(),

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

// COMPANY: shift update (partial)
// Not: update handler zaten yalnızca roomId/startAt/endAt/status alanlarını kullanıyor.
// Burada geniş tutuyoruz ki eski payload'larla da kırılmasın.
export const updateShiftSchema = z
  .object({
    roomId: z.number().int().positive().optional(),
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
    // status update (string bırakıyoruz; handler kendi guard'larını uygular)
    status: z.string().optional(),

    // optional company offer fields (harmless if ignored by handler)
    companyOfferVehicleId: z.number().int().positive().optional(),
    companyOfferAmount: z.number().nonnegative().optional(),
    companyOfferNote: z.string().max(500).optional(),
  })
  .strict();

export const approveSchema = z.object({
  vehicleId: z.number().int().positive(),
  driverId: z.number().int().positive().optional(),
  status: z.string().optional(),
});

// Backward-compatible alias (bazı dosyalar approveShiftSchema import ediyor)
export const approveShiftSchema = approveSchema;

// ROOM: approve shift (optional assignment; supports legacy bodies)
export const roomApproveShiftSchema = z
  .object({
    vehicleId: z.number().int().positive().optional(),
    driverId: z.number().int().positive().optional(),
    status: z.string().optional(),
    // legacy / negotiation fields
    roomOfferVehicleId: z.number().int().positive().optional(),
    roomOfferDriverId: z.number().int().positive().optional(),
  })
  .strict();

// ROOM: explicit assign (back-compat for older clients/tests)
export const assignShiftSchema = z
  .object({
    vehicleId: z.number().int().positive(),
    driverId: z.number().int().positive(),
  })
  .strict();


// ROOM → COMPANY teklif schema (pazarlık)
export const roomOfferSchema = z
  .object({
    roomOfferVehicleId: z.union([z.number().int().positive(), z.null()]).optional(),
    roomOfferAmount: z.union([z.number().int().positive(), z.null()]).optional(),
    roomOfferNote: z.union([z.string().max(200), z.null()]).optional(),

    // opsiyonel: driver'a ilet (room isterse)
    notifyDriver: z.boolean().optional(),
    driverNote: z.union([z.string().max(200), z.null()]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field required" });

// COMPANY: room teklifine karar (kabul/red)
export const roomOfferDecisionSchema = z.object({
  decision: z.enum(["ACCEPTED", "REJECTED"]),
  note: z.string().max(200).optional(),
});

// COMPANY: mevcut shift üstünde teklif güncelle (karşı teklif)
export const companyOfferSchema = z
  .object({
    companyOfferVehicleId: z.union([z.number().int().positive(), z.null()]).optional(),
    companyOfferAmount: z.union([z.number().int().positive(), z.null()]).optional(),
    companyOfferNote: z.union([z.string().max(200), z.null()]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field required" });

// ROOM/SUPER_ADMIN: shift reject (payload opsiyonel)
// UI'da buton sadece aksiyon; istersek ileride reason/not ekleyebiliriz.
export const rejectShiftSchema = z.object({
  reason: z.string().max(200).optional(),
});

// Compat aliases: eski modüller (ve bazı test harness'ları) bu isimleri bekleyebilir.
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
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field required" });

export const reorderSchema = z.object({
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
});

export const reachedSchema = z.object({ order: z.number().int().min(1) });

export const fromTemplateSchema = z.object({
  templateId: z.number().int().positive(),
  mode: z.enum(["REPLACE", "APPEND"]).default("REPLACE"),
});

// ---------------------------------------------------------------------------
// Back-compat aliases (older route modules expect these export names)
// ---------------------------------------------------------------------------
export const shiftCreateSchema = createShiftSchema;
export const stopCreateSchema = addStopSchema;
export const stopPatchSchema = updateStopSchema;
export const stopUpdateSchema = updateStopSchema;
export const applyTemplateSchema = fromTemplateSchema;
export const reorderStopsSchema = reorderSchema;
