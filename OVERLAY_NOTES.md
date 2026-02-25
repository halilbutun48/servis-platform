M33.x — Leaflet Mini Map upgrade

- Replaces SVG mini preview in RoutePreviewModal with Leaflet (OpenStreetMap tiles).
- Draws route polyline from route-preview path.points (fallback: stop points).
- Draws stop markers with numbers, plus Start(S)/End(E) markers.

M32.x — Plan Builder API mount + docs UTF-8 cleanup

- backend: mount /api/plan-builder (server.js)
- docs: API_SPEC_V1.md updated (M0→M32 status + Plan Builder endpoints)
- docs: NEXT_BACKLOG_V1.md tail cleaned (duplicate mojibake removed)
- docs/_archive: SPRINT_2/3/4 plans rewritten in UTF-8
- root README restored to project overview; README.txt marked deprecated
