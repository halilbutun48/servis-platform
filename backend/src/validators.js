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
  // ✅ M41: optional device binding fields
  deviceId: z.string().trim().min(2).optional(),
  deviceName: z.string().trim().min(1).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().trim().min(8),
  deviceId: z.string().trim().min(2).optional(),
});

export const logoutSchema = z.object({
  refreshToken: z.string().trim().min(8).optional(),
});

export const createVehicleSchema = z.object({
  plate: z.string().min(3),
  capacity: z.number().int().min(1),
  speedLimitKmh: z.number().int().min(10).max(200).optional(),

  // V1 meta (opsiyonel)
  type: z.enum(["MINIBUS", "MIDIBUS", "OTOBUS"]).optional(),
  brand: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).optional(),
  modelYear: z.number().int().min(1970).max(2100).optional(),
  color: z.string().trim().min(1).optional(),
  vin: z.string().trim().min(5).optional(),
  note: z.string().trim().min(1).optional(),

  // Resmi tarihler
  inspectionDueAt: dateTimeString.optional(),
  insuranceDueAt: dateTimeString.optional(),
  cascoDueAt: dateTimeString.optional(),

  // Bakım (tarih + km)
  lastServiceAt: dateTimeString.optional(),
  lastServiceKm: z.number().int().min(0).optional(),
  serviceIntervalKm: z.number().int().min(1000).max(100000).optional(),
  serviceIntervalDays: z.number().int().min(1).max(3650).optional(),

  // Odometer
  odometerKm: z.number().int().min(0).optional(),

  // Geriye dönük uyum
  nextMaintenanceAt: dateTimeString.optional(),
});


export const createDriverSchema = z.object({
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(6),
  // boş bırakılabilir
  deviceInfo: z.string().trim().optional().default(""),
  backupDriverId: z.number().int().optional(),

  // opsiyonel: driver login hesabı
  email: z.string().trim().email().optional(),
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