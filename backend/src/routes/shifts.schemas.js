// backend/src/routes/shifts.schemas.js
// Zod schema'lar burada tutulur (shifts.js satır sayısını azaltmak için)

import { z } from "zod";

export const createShiftSchema = z.object({
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
        type: z.enum(["COMMON", "MANUAL"]).optional(),
      })
    )
    .optional(),
});

export const approveSchema = z.object({
  vehicleId: z.number().int().positive(),
  driverId: z.number().int().positive().optional(),
  status: z.string().optional(),
});

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

export const addStopSchema = z.object({
  name: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  order: z.number().int().min(1).optional(),
  type: z.enum(["COMMON", "MANUAL"]).optional(),
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
