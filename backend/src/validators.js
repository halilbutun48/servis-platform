import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
});

export const createVehicleSchema = z.object({
  plate: z.string().min(3),
  capacity: z.number().int().min(1),
  speedLimitKmh: z.number().int().min(10).max(200).optional(),
  nextMaintenanceAt: z.string().datetime().optional(),
});

export const createDriverSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(6),
  deviceInfo: z.string().min(1).default(""),
  backupDriverId: z.number().int().optional(),

  // Opsiyonel: driver login hesabı da açmak istersen
  email: z.string().email().optional(),
  password: z.string().min(3).optional(),
});

// Milestone-1'de araç/driver ataması Shift approve akışıyla yapılacak.
// Bu schema eski sürüm uyumluluğu için burada kalabilir; şu an route'larda kullanılmıyor.
export const assignDriverSchema = z.object({
  driverId: z.number().int(),
  backupDriverId: z.number().int().optional(),
  deviceInfo: z.string().optional(),
});

export const createShiftSchema = z.object({
  roomId: z.number().int(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

export const approveShiftSchema = z.object({
  vehicleId: z.number().int(),
  driverId: z.number().int(),
});

export const setRouteSchema = z.object({
  stops: z.array(z.object({
    name: z.string().min(1),
    lat: z.number(),
    lng: z.number(),
    order: z.number().int().min(1).optional(),
    type: z.enum(["COMMON", "MANUAL"]).optional(),
  })).min(1),
});

export const gpsIngestSchema = z.object({
  vehicleId: z.number().int(),
  lat: z.number(),
  lng: z.number(),
  speed: z.number().optional(),
  at: z.string().datetime().optional(),
  // geriye dönük uyum
  ts: z.string().datetime().optional(),
});

export const createRequestSchema = z.object({
  shiftId: z.number().int(),
  lat: z.number(),
  lng: z.number(),
});
