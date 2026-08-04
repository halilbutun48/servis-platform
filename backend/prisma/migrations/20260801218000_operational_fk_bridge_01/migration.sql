ALTER TABLE "OrganizationPlan"
  ADD CONSTRAINT "OrganizationPlan_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DriverPenalty"
  ADD CONSTRAINT "DriverPenalty_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "Driver"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DriverPenalty"
  ADD CONSTRAINT "DriverPenalty_shiftId_fkey"
  FOREIGN KEY ("shiftId") REFERENCES "Shift"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DriverPenalty"
  ADD CONSTRAINT "DriverPenalty_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShiftPersonel"
  ADD CONSTRAINT "ShiftPersonel_shiftId_fkey"
  FOREIGN KEY ("shiftId") REFERENCES "Shift"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShiftPersonel"
  ADD CONSTRAINT "ShiftPersonel_personelId_fkey"
  FOREIGN KEY ("personelId") REFERENCES "Personel"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShiftImport"
  ADD CONSTRAINT "ShiftImport_shiftId_fkey"
  FOREIGN KEY ("shiftId") REFERENCES "Shift"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShiftImport"
  ADD CONSTRAINT "ShiftImport_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ShiftImportRow"
  ADD CONSTRAINT "ShiftImportRow_personelId_fkey"
  FOREIGN KEY ("personelId") REFERENCES "Personel"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StopAssignment"
  ADD CONSTRAINT "StopAssignment_shiftId_fkey"
  FOREIGN KEY ("shiftId") REFERENCES "Shift"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StopAssignment"
  ADD CONSTRAINT "StopAssignment_stopId_fkey"
  FOREIGN KEY ("stopId") REFERENCES "Stop"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StopAssignment"
  ADD CONSTRAINT "StopAssignment_personelId_fkey"
  FOREIGN KEY ("personelId") REFERENCES "Personel"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GpsDevice"
  ADD CONSTRAINT "GpsDevice_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RouteLearnSample"
  ADD CONSTRAINT "RouteLearnSample_shiftId_fkey"
  FOREIGN KEY ("shiftId") REFERENCES "Shift"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RouteLearnSample"
  ADD CONSTRAINT "RouteLearnSample_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ParentChild"
  ADD CONSTRAINT "ParentChild_parentUserId_fkey"
  FOREIGN KEY ("parentUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ParentChild"
  ADD CONSTRAINT "ParentChild_personelId_fkey"
  FOREIGN KEY ("personelId") REFERENCES "Personel"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ParentInvite"
  ADD CONSTRAINT "ParentInvite_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ParentInvite"
  ADD CONSTRAINT "ParentInvite_childPersonelId_fkey"
  FOREIGN KEY ("childPersonelId") REFERENCES "Personel"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ParentInvite"
  ADD CONSTRAINT "ParentInvite_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ParentInvite"
  ADD CONSTRAINT "ParentInvite_consumedByUserId_fkey"
  FOREIGN KEY ("consumedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
