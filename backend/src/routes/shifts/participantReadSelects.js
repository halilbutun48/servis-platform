// The 66-migration runtime intentionally does not include the pending P9
// Vehicle.hgsClass column. Participant views only need operational vehicle
// identity/status/GPS data, so keep this projection explicit and migration-safe.
export function participantVehicleSelect() {
  return {
    id: true,
    roomId: true,
    plate: true,
    capacity: true,
    status: true,
    speedLimitKmh: true,
    driverId: true,
    type: true,
    gpsLast: true,
    gpsState: true,
  };
}
