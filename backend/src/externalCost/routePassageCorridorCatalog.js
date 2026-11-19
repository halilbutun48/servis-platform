import { findTurkeyTollCoverage } from "./tollCoverageCatalog.js";

function text(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalized(value) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function stepText(step) {
  return normalized([step?.name, step?.ref].filter(Boolean).join(" "));
}

function routeSteps(routeDetailsOrSteps) {
  if (Array.isArray(routeDetailsOrSteps)) return routeDetailsOrSteps;
  if (Array.isArray(routeDetailsOrSteps?.steps)) return routeDetailsOrSteps.steps;
  if (!Array.isArray(routeDetailsOrSteps?.legs)) return [];
  return routeDetailsOrSteps.legs.flatMap((leg) => Array.isArray(leg?.steps) ? leg.steps : []);
}

const CORRIDORS = Object.freeze([
  {
    coverageKey: "KGM-05-ANADOLU",
    routeRefs: ["O-4"],
    routeNamePatterns: ["ANADOLU OTOYOLU"],
    entryStation: "GEBZE",
    exitStation: "AKYAZI",
    entryMarkerPattern: /GEBZE/,
    exitMarkerPattern: /AKYAZI/,
    routeEvidence: "OSRM_STEP_REF_AND_STATION_MARKERS",
  },
  {
    // The official operator/provider is catalogued, but OSRM gate mapping is
    // intentionally not asserted until its entry/exit station evidence is
    // verified. This keeps an O-5 hit visible without pricing it as zero.
    coverageKey: "OTOYOL-O5-GEBZE-ORHANGAZI-IZMIR",
    routeRefs: ["O-5"],
    routeNamePatterns: ["ISTANBUL IZMIR OTOYOLU"],
    entryStation: null,
    exitStation: null,
    entryMarkerPattern: null,
    exitMarkerPattern: null,
    routeEvidence: "OSRM_STEP_REF_ONLY_GATE_MAPPING_PENDING",
  },
]);

function asPublicCorridor(row) {
  const coverage = findTurkeyTollCoverage(row.coverageKey);
  return {
    ...row,
    authority: coverage?.authority || null,
    operator: coverage?.operator || null,
    label: coverage?.label || null,
    family: coverage?.family || null,
    providerKey: coverage?.providerKey || null,
    highwayId: coverage?.highwayId || null,
    adapterStatus: coverage?.adapterStatus || "NOT_PROVEN",
    tariffSourceUrl: coverage?.tariffSourceUrl || null,
    tariffDocumentUrl: coverage?.tariffDocumentUrl || null,
    calculatorUrl: coverage?.calculatorUrl || null,
  };
}

export function listRoutePassageCorridors() {
  return CORRIDORS.map(asPublicCorridor);
}

export function findRoutePassageCorridor(routeDetailsOrSteps) {
  const steps = routeSteps(routeDetailsOrSteps);
  const matches = CORRIDORS.map((row) => {
    const indexes = steps
      .map((step, index) => {
        const ref = normalized(step?.ref).replace(/\s+/g, "");
        const name = normalized(step?.name);
        const refMatch = row.routeRefs.includes(ref);
        const nameMatch = row.routeNamePatterns.some((pattern) => name.includes(pattern));
        return refMatch || nameMatch ? index : -1;
      })
      .filter((index) => index >= 0);
    return indexes.length ? { corridor: asPublicCorridor(row), indexes } : null;
  }).filter(Boolean);

  if (!matches.length) return null;
  // Prefer the corridor with the strongest step evidence; a ref match wins
  // over a broad name marker and ties preserve catalog order.
  matches.sort((left, right) => {
    const leftRef = left.indexes.some((index) => rowHasRef(CORRIDORS.find((row) => row.coverageKey === left.corridor.coverageKey), steps[index])) ? 1 : 0;
    const rightRef = right.indexes.some((index) => rowHasRef(CORRIDORS.find((row) => row.coverageKey === right.corridor.coverageKey), steps[index])) ? 1 : 0;
    return rightRef - leftRef;
  });
  return { ...matches[0].corridor, indexes: matches[0].indexes };
}

function rowHasRef(row, step) {
  if (!row) return false;
  return row.routeRefs.includes(normalized(step?.ref).replace(/\s+/g, ""));
}

export function corridorStepText(step) {
  return stepText(step);
}

export function routeStepsForPassage(routeDetails) {
  return routeSteps(routeDetails);
}
