// backend/src/validators.js
import { z } from "zod";

/**
 * dateTimeString:
 * - boş olamaz
 * - Date.parse ile parse edilebilmeli
 * Not: PowerShell ToString("o") => 2026-01-25T18:32:19.4726985+03:00 gibi offsetli string üretir, bu kabul edilir.
 */
const dateTimeString = z
  .string()
  .trim()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid datetime" });

// Ortak lat/lng check (opsiyonel ama güvenli)
const latNumber = z.number().min(-90).max(90);
const lngNumber = z.number().min(-180).max(180);

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
});

export const createVehicleSchema = z.object({
  plate: z.string().min(3),
  capacity: z.number().int().min(1),
  speedLimitKmh: z.number().int().min(10).max(200).optional(),
  nextMaintenanceAt: dateTimeString.optional(),
});

export const createDriverSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(6),
  deviceInfo: z.string().min(1).default(""),
  backupDriverId: z.number().int().optional(),

  // opsiyonel: driver login hesabı
  email: z.string().email().optional(),
  password: z.string().min(3).optional(),
});

// (Yeni) COMPANY personel oluşturma
export const createPersonelSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().email(),
  password: z.string().min(3),
});

// Eski uyumluluk için kalabilir
export const assignDriverSchema = z.object({
  driverId: z.number().int(),
  backupDriverId: z.number().int().optional(),
  deviceInfo: z.string().optional(),
});

export const createShiftSchema = z
  .object({
    roomId: z.number().int(),
    startAt: dateTimeString,
    endAt: dateTimeString,
  })
  .superRefine((val, ctx) => {
    const s = Date.parse(val.startAt);
    const e = Date.parse(val.endAt);
    if (!Number.isNaN(s) && !Number.isNaN(e) && e <= s) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endAt"],
        message: "endAt must be after startAt",
      });
    }
  });

export const approveShiftSchema = z.object({
  vehicleId: z.number().int(),
  driverId: z.number().int(),
});

export const setRouteSchema = z.object({
  stops: z
    .array(
      z.object({
        name: z.string().min(1),
        lat: latNumber,
        lng: lngNumber,
        order: z.number().int().min(1).optional(),
        type: z.enum(["COMMON", "MANUAL"]).optional(),
      })
    )
    .min(1),
});

export const gpsIngestSchema = z.object({
  vehicleId: z.number().int(),
  lat: latNumber,
  lng: lngNumber,
  speed: z.number().optional(),
  at: dateTimeString.optional(),
  // geriye dönük uyum
  ts: dateTimeString.optional(),
});

export const createRequestSchema = z.object({
  shiftId: z.number().int(),
  lat: latNumber,
  lng: lngNumber,
});