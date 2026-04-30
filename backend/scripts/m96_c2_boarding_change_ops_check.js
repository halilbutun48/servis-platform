#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(__dirname, "..", "..");

function readBackend(rel) {
  return fs.readFileSync(path.join(backendRoot, rel), "utf8");
}

function readRepo(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

function normalize(text) {
  return String(text || "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function has(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function must(condition, message) {
  if (!condition) throw new Error(`FAIL ${message}`);
  console.log(`OK ${message}`);
}

console.log("=== M96-C2 BOARDING CHANGE OPS CHECK ===");

const requests = readBackend("src/routes/requests.js");
const helper = readBackend("src/routes/boardingChangeRequestOps.js");
const companyPanel = readRepo("web/src/panels/company/OperationsPanel.jsx");
const schoolPanel = readRepo("web/src/panels/school/OperationsPanel.jsx");
const roomBoard = readRepo("web/src/panels/room/roomOperationsBoard.jsx");
const sharedUi = readRepo("web/src/panels/shared/boardingChangeUi.js");
const mobileHandlers = readRepo("mobile/src/app/mobileAppHandlers.js");
const mobileCard = readRepo("mobile/src/screens/BoardingChangeCard.js");

must(has(requests, "evaluateBoardingChangeDecision"), "requests uses auto-accept / cutoff decision engine");
must(has(requests, "formatBoardingChangeDecisionText"), "requests uses shared decision text formatter");
must(has(requests, "emitBoardingChangeNotifications"), "requests emits boarding-change notifications");
must(has(requests, "BOARDING_CHANGE_REQUEST_CLOSE_ACCEPT"), "requests keeps room accept audit action");
must(has(requests, "BOARDING_CHANGE_REQUEST_CLOSE_CANCEL"), "requests keeps room cancel audit action");
must(has(requests, "ROOM_ACCEPTED"), "requests exposes room accepted decision state");
must(has(requests, "ROOM_CANCELLED"), "requests exposes room cancelled decision state");
must(has(requests, "decisionText"), "requests returns decision text");
must(has(requests, "requestKind"), "requests returns request kind");

must(has(helper, "formatBoardingChangeDecisionText"), "helper formats decision text centrally");
must(has(helper, "ROOM_ACCEPTED"), "helper knows room accepted decision");
must(has(helper, "ROOM_CANCELLED"), "helper knows room cancelled decision");

must(has(sharedUi, "boardingChangeKindLabel"), "shared ui exposes boarding change kind label");
must(has(sharedUi, "boardingChangeDecisionLabel"), "shared ui exposes boarding change decision label");

must(has(companyPanel, "requestKind"), "company panel shows request kind");
must(has(companyPanel, "decisionState"), "company panel shows request decision state");
must(has(companyPanel, "Karar"), "company panel shows decision column");

must(has(schoolPanel, "requestKind"), "school panel shows request kind");
must(has(schoolPanel, "decisionState"), "school panel shows request decision state");
must(has(schoolPanel, "Karar"), "school panel shows decision column");

must(has(roomBoard, "decisionText"), "room board shows decision text");
must(has(roomBoard, "decisionState"), "room board keeps decision state");
must(has(roomBoard, "boardingChangeDecisionLabel"), "room board uses shared boarding change labels");

must(has(mobileHandlers, "submitBoardingChangeRequest"), "mobile handler submits boarding change to backend");
must(has(mobileHandlers, "buildBoardingChangeRequestPayload"), "mobile handler builds backend boarding payload");
must(has(mobileCard, "backendDecisionState"), "mobile card shows backend decision state");
must(has(mobileCard, "Operasyon onaylı"), "mobile card keeps approved label");
must(has(mobileCard, "İptal edildi"), "mobile card keeps cancelled label");
must(has(mobileCard, "Operasyon kuyruğunda"), "mobile card keeps queue label");

console.log("M96-C2 boarding change ops check passed");
