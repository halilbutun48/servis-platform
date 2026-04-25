import { prisma } from "../src/prisma.js";
import { banner, step, assertOk, login, getRoomCompanyIds, reqJson } from "./_harness.js";
import { ensureTotpStepUp } from "./_totp_harness.js";
import {
  createSourceShift,
  createAgreementBundleFromSource,
  createGeneratedAgreementShift,
  cleanupAgreementSmokeArtifacts,
  fetchOpsBridge,
  makeSmokeTag,
} from "./_m91_smoke_helpers.js";

async function loadRoutePreview(token, shiftId) {
  const response = await reqJson("GET", `/api/shifts/${shiftId}/route-preview`, { token });
  assertOk(response.ok, `route preview loaded for shift #${shiftId}`);
  return response.json;
}

function stopNamesOf(payload) {
  return Array.isArray(payload?.stops)
    ? payload.stops.map((item) => String(item?.name || "").trim()).filter(Boolean)
    : [];
}

async function main() {
  const tag = makeSmokeTag("M91-RP");
  const agreementIds = [];
  const shiftIds = [];

  banner("M91 behavioral smoke: route preview fallback + previewAvailable");
  step(`tag=${tag}`);

  const companyToken = await ensureTotpStepUp(await login("company@demo.com", "demo123"), "company");
  const roomToken = await ensureTotpStepUp(await login("room@demo.com", "demo123"), "room");
  const { roomId, companyId } = await getRoomCompanyIds(roomToken, companyToken);
  assertOk(Number(roomId || 0) > 0, "room scope resolved");
  assertOk(Number(companyId || 0) > 0, "company scope resolved");

  try {
    const source = await createSourceShift({ companyToken, roomId, tag });
    shiftIds.push(source.shiftId);

    const created = await createAgreementBundleFromSource({
      companyToken,
      roomId,
      sourceShiftId: source.shiftId,
      hubLat: source.hubLat,
      hubLng: source.hubLng,
      noteTag: tag,
    });
    agreementIds.push(...created.agreementIds);

    const ownPreviewStopName = `${tag} Generated Preview Stop`;
    const ownPreviewShift = await createGeneratedAgreementShift({
      agreementId: created.agreementId,
      companyId,
      roomId,
      hubLat: source.hubLat,
      hubLng: source.hubLng,
      startAt: new Date(Date.now() + 5 * 60 * 60_000).toISOString(),
      endAt: new Date(Date.now() + 6 * 60 * 60_000).toISOString(),
      withSnapshot: true,
      stopSpec: [
        {
          name: ownPreviewStopName,
          lat: source.hubLat + 0.012,
          lng: source.hubLng + 0.012,
          order: 1,
          type: "COMMON",
        },
      ],
    });
    shiftIds.push(ownPreviewShift.id);

    const ownPreviewPayload = await loadRoutePreview(companyToken, ownPreviewShift.id);
    const ownPreviewStopNames = stopNamesOf(ownPreviewPayload);
    assertOk(ownPreviewStopNames.includes(ownPreviewStopName), "preview keeps generated shift stops when meaningful");
    assertOk(!ownPreviewStopNames.includes(source.stopNames[0]), "preview does not fall back when generated stops are meaningful");

    const bridgeBeforeFallback = await fetchOpsBridge(companyToken, created.agreementId);
    assertOk(Number(bridgeBeforeFallback?.sourceShiftId || 0) === source.shiftId, "ops bridge source link before fallback");
    assertOk(Number(bridgeBeforeFallback?.lastShift?.id || 0) === ownPreviewShift.id, "ops bridge lastShift points to latest generated preview shift");
    assertOk(Boolean(bridgeBeforeFallback?.lastShift?.previewAvailable), "ops bridge previewAvailable true for generated preview shift");

    const fallbackGeneratedStopName = `${tag} Hub Only Stop`;
    const fallbackShift = await createGeneratedAgreementShift({
      agreementId: created.agreementId,
      companyId,
      roomId,
      hubLat: source.hubLat,
      hubLng: source.hubLng,
      startAt: new Date(Date.now() + 7 * 60 * 60_000).toISOString(),
      endAt: new Date(Date.now() + 8 * 60 * 60_000).toISOString(),
      withSnapshot: false,
      stopSpec: [
        {
          name: fallbackGeneratedStopName,
          lat: source.hubLat,
          lng: source.hubLng,
          order: 1,
          type: "COMMON",
        },
      ],
    });
    shiftIds.push(fallbackShift.id);

    const fallbackPayload = await loadRoutePreview(companyToken, fallbackShift.id);
    const fallbackStopNames = stopNamesOf(fallbackPayload);
    assertOk(fallbackStopNames.includes(source.stopNames[0]), "fallback preview pulls source shift stops");
    assertOk(fallbackStopNames.includes(source.stopNames[1]), "fallback preview keeps multiple source stops");
    assertOk(!fallbackStopNames.includes(fallbackGeneratedStopName), "fallback preview hides hub-only generated stop");

    const bridgeAfterFallback = await fetchOpsBridge(companyToken, created.agreementId);
    assertOk(Number(bridgeAfterFallback?.sourceShiftId || 0) === source.shiftId, "ops bridge source link after fallback");
    assertOk(Number(bridgeAfterFallback?.lastShift?.id || 0) === fallbackShift.id, "ops bridge lastShift moves to fallback candidate");
    assertOk(Boolean(bridgeAfterFallback?.lastShift?.previewAvailable), "ops bridge previewAvailable stays true through source fallback");
    assertOk(Boolean(bridgeAfterFallback?.lastShift?.routeSnapshotValidatedAt), "ops bridge carries source snapshot proof on fallback");

    console.log("\nOK M91 ROUTE PREVIEW FALLBACK SMOKE PASS");
  } finally {
    await cleanupAgreementSmokeArtifacts({ agreementIds, shiftIds });
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(String(error?.stack || error));
  try {
    await prisma.$disconnect();
  } catch {}
  process.exit(1);
});
