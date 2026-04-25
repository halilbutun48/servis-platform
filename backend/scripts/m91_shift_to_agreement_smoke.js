import { prisma } from "../src/prisma.js";
import { banner, step, assertOk, login, getRoomCompanyIds, reqJson } from "./_harness.js";
import { ensureTotpStepUp } from "./_totp_harness.js";
import {
  createSourceShift,
  createAgreementBundleFromSource,
  agreementBodyFromSourceShift,
  cleanupAgreementSmokeArtifacts,
  fetchOpsBridge,
  makeSmokeTag,
} from "./_m91_smoke_helpers.js";

async function main() {
  const tag = makeSmokeTag("M91-AG");
  const agreementIds = [];
  const shiftIds = [];

  banner("M91 behavioral smoke: shift -> sözleşme dönüşümü");
  step(`tag=${tag}`);

  const companyToken = await ensureTotpStepUp(await login("company@demo.com", "demo123"), "company");
  const roomToken = await ensureTotpStepUp(await login("room@demo.com", "demo123"), "room");
  const { roomId } = await getRoomCompanyIds(roomToken, companyToken);
  assertOk(Number(roomId || 0) > 0, "room scope resolved");

  try {
    const source = await createSourceShift({ companyToken, roomId, tag });
    shiftIds.push(source.shiftId);

    const blockedAttempt = await reqJson("POST", "/api/agreements", {
      token: companyToken,
      body: agreementBodyFromSourceShift({
        roomId,
        sourceShiftId: 0,
        hubLat: source.hubLat,
        hubLng: source.hubLng,
        startDate: source.startAt.slice(0, 10),
        endDate: source.endAt.slice(0, 10),
        noteTag: tag,
      }),
    });
    assertOk(
      !blockedAttempt.ok && blockedAttempt.status === 400,
      `direct agreement create blocked without sourceShiftId (${blockedAttempt.status} ${String(blockedAttempt.text || "").slice(0, 500)})`
    );
    assertOk(
      String(blockedAttempt.text || "").includes("SOURCE_SHIFT_REQUIRED") ||
      String(blockedAttempt.text || "").includes("Doğrudan sözleşme açma kapalı"),
      "block reason reports sourceShift requirement"
    );

    const created = await createAgreementBundleFromSource({
      companyToken,
      roomId,
      sourceShiftId: source.shiftId,
      hubLat: source.hubLat,
      hubLng: source.hubLng,
      noteTag: tag,
    });
    agreementIds.push(...created.agreementIds);

    const sourceRow = await prisma.commercialSource.findFirst({
      where: { agreementId: created.agreementId },
      select: {
        agreementId: true,
        shiftRootId: true,
        sourceType: true,
      },
    });
    assertOk(Number(sourceRow?.agreementId || 0) === created.agreementId, "commercial source row created for agreement");
    assertOk(Number(sourceRow?.shiftRootId || 0) === source.shiftId, "commercial source keeps sourceShiftId");
    assertOk(String(sourceRow?.sourceType || "") === "AGREEMENT", "commercial source type is AGREEMENT");

    const bridge = await fetchOpsBridge(companyToken, created.agreementId);
    assertOk(Number(bridge?.sourceShiftId || 0) === source.shiftId, "ops bridge exposes sourceShiftId");
    assertOk(String(bridge?.sourceSummary || "").includes(`Kaynak vardiya #${source.shiftId}`), "ops bridge source summary keeps origin");

    console.log("\nOK M91 SHIFT -> AGREEMENT SMOKE PASS");
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
