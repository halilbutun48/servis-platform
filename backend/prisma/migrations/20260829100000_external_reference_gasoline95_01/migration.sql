-- #2: preserve the existing gasoline family and add the source-specific 95 octane family.
ALTER TYPE "ExternalReferenceFamily" ADD VALUE IF NOT EXISTS 'FUEL_GASOLINE_95';
