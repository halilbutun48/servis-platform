Sabit şema (v1):

{
  "v": 1,
  "title": "GPS stale",
  "message": "Vehicle 1 last seen 120s ago",
  "vehicleId": 1,
  "at": "2026-01-25T00:00:00.000Z",
  "ageSec": 120
}

Kural:

payloadJson DB’de string tutuluyorsa: her zaman JSON.stringify(payload) bas.

UI: safeParseJson(payloadJson) ile direkt title/message/vehicleId/at/ageSec okur.
