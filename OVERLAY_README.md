M19 OSRM hub anchor fix
- Fixes M19CHECK 'start near hub' failing when route-preview returns source=OSRM and geometry snaps away from hub.
- Ensures first/last point anchored to hub for LOOP and correct end for OUTBOUND/INBOUND, even after OSRM dense path override.
Files:
- backend/src/routes/shifts/people.js
