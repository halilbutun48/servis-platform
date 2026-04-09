M90C.1 + M90C.2 minimal overlay

Changed files:
- backend/src/ai/chat/helpComposer.js
- backend/src/ai/chat/helpComposerEntityRuntime.js
- web/src/panels/room/roomVehiclesPanelSections.jsx

Purpose:
- Fix M79 verify:hot runtime failure caused by missing analyzerEvidenceText helper wiring.
- Fix M82.2 verify:web-contract failure for room VehiclesPanel extracted section contract.

Validation run on patched snapshot:
- npm run verify:hot -> PASS
- npm run verify:web-contract -> PASS
