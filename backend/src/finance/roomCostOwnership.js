const VEHICLE_OWNER_CATEGORIES = new Set([
  'FUEL', 'ADBLUE', 'MAINTENANCE', 'REPAIR', 'TIRE_RIM', 'MTV_TAX', 'TRAFFIC_INSURANCE', 'CASCO',
  'INSPECTION', 'EMISSION_TEST', 'MANDATORY_DOCUMENT', 'LOAN_PRINCIPAL', 'FINANCE_CHARGE', 'LEASING',
  'RENT', 'DEPRECIATION', 'CLEANING', 'ROADSIDE_ASSISTANCE', 'GPS', 'CAMERA', 'VEHICLE_EQUIPMENT',
  'OTHER_VEHICLE',
]);

const DRIVER_OWNER_CATEGORIES = new Set([
  'EMPLOYER_MONTHLY_COST', 'BASE_SALARY', 'BENEFIT', 'OVERTIME', 'PER_DIEM', 'MEAL_ALLOWANCE', 'SOCIAL_COST', 'OTHER_DRIVER',
]);

const DIRECT_TRIP_CATEGORIES = new Set(['SERVICE_DIRECT', 'ROUTE_FEE', 'HGS_TOLL', 'PARKING']);

function positiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function ownershipError(code, message) {
  const error = new Error(message);
  error.code = code;
  error.status = 400;
  return error;
}

export function resolveEconomicOwner({ categoryKey, vehicleId = null, driverId = null, shiftId = null } = {}) {
  const category = String(categoryKey || '').trim().toUpperCase();
  const vehicle = positiveId(vehicleId);
  const driver = positiveId(driverId);
  const shift = positiveId(shiftId);

  if (DRIVER_OWNER_CATEGORIES.has(category)) return { kind: 'DRIVER', relation: driver ? 'driver' : null };
  if (VEHICLE_OWNER_CATEGORIES.has(category)) return { kind: 'VEHICLE', relation: vehicle ? 'vehicle' : null };
  if (DIRECT_TRIP_CATEGORIES.has(category) && shift) return { kind: 'DIRECT_TRIP', relation: 'shift' };
  if (vehicle) return { kind: 'VEHICLE', relation: 'vehicle' };
  if (driver) return { kind: 'DRIVER', relation: 'driver' };
  return { kind: 'COMPANY', relation: null };
}

export function assertEconomicOwner({ categoryKey, vehicleId = null, driverId = null, shiftId = null } = {}) {
  const category = String(categoryKey || '').trim().toUpperCase();
  if (DIRECT_TRIP_CATEGORIES.has(category) && !positiveId(shiftId)) {
    throw ownershipError('SHIFT_REQUIRED', 'Bu gider ilgili seferle ilişkilendirilmelidir.');
  }
  if (VEHICLE_OWNER_CATEGORIES.has(category) && !positiveId(vehicleId)) {
    throw ownershipError('VEHICLE_REQUIRED', 'Bu gider aynı ROOM içindeki araçla ilişkilendirilmelidir.');
  }
  if (DRIVER_OWNER_CATEGORIES.has(category) && !positiveId(driverId)) {
    throw ownershipError('DRIVER_REQUIRED', 'Bu sürücü gideri aynı ROOM içindeki sürücüye bağlanmalıdır.');
  }
  return resolveEconomicOwner({ categoryKey: category, vehicleId, driverId, shiftId });
}

export { DRIVER_OWNER_CATEGORIES, VEHICLE_OWNER_CATEGORIES };
