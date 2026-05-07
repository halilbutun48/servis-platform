export const OPERATION_PROOF_VERSION = "OP-01";

export const OPERATION_PROOF_STATUSES = Object.freeze({
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  EVIDENCE_PARTIAL: "EVIDENCE_PARTIAL",
  EVIDENCE_READY: "EVIDENCE_READY",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  COMPLETED: "COMPLETED",
});

export const OPERATION_PROOF_SIGNAL_TYPES = Object.freeze([
  "SHIFT_STARTED",
  "SHIFT_COMPLETED",
  "GPS_SEEN",
  "DRIVER_PHONE_GPS_SEEN",
  "VEHICLE_GPS_SEEN",
  "BOARDING_RECORDED",
  "NO_BOARD_RECORDED",
  "ETA_AVAILABLE",
  "MANUAL_OPERATOR_NOTE",
  "COMPANY_VISIBLE",
  "ROOM_VISIBLE",
  "SCHOOL_VISIBLE",
  "PARENT_PERSONEL_VISIBLE",
]);

const PROOF_SIGNAL_SET = new Set(OPERATION_PROOF_SIGNAL_TYPES);
const PROOF_SIGNAL_ALIASES = new Map([
  ["SHIFT_START", "SHIFT_STARTED"],
  ["STARTED", "SHIFT_STARTED"],
  ["SERVIS_BASLADI", "SHIFT_STARTED"],
  ["SHIFT_END", "SHIFT_COMPLETED"],
  ["DONE", "SHIFT_COMPLETED"],
  ["SERVIS_TAMAMLANDI", "SHIFT_COMPLETED"],
  ["GPS", "GPS_SEEN"],
  ["GPS_SEEN", "GPS_SEEN"],
  ["GPS_KANITI", "GPS_SEEN"],
  ["DRIVER_PHONE", "DRIVER_PHONE_GPS_SEEN"],
  ["DRIVER_PHONE_GPS", "DRIVER_PHONE_GPS_SEEN"],
  ["SURUCUNUN_TELEFON_GPSI_GORULDU", "DRIVER_PHONE_GPS_SEEN"],
  ["ARAC_GPSI_GORULDU", "VEHICLE_GPS_SEEN"],
  ["VEHICLE_GPS", "VEHICLE_GPS_SEEN"],
  ["BOARDING", "BOARDING_RECORDED"],
  ["BOARD", "BOARDING_RECORDED"],
  ["BINIS_KAYDI", "BOARDING_RECORDED"],
  ["NO_SHOW", "NO_BOARD_RECORDED"],
  ["NO_BOARD", "NO_BOARD_RECORDED"],
  ["BUGUN_SERVISI_KULLANMAYACAGIM_KAYDI_VAR", "NO_BOARD_RECORDED"],
  ["ETA", "ETA_AVAILABLE"],
  ["ETA_AVAILABLE", "ETA_AVAILABLE"],
  ["OPERATOR_NOTE", "MANUAL_OPERATOR_NOTE"],
  ["OPERATOR", "MANUAL_OPERATOR_NOTE"],
  ["OPERATOR_NOTU_VAR", "MANUAL_OPERATOR_NOTE"],
  ["COMPANY", "COMPANY_VISIBLE"],
  ["COMPANY_VISIBLE", "COMPANY_VISIBLE"],
  ["ROOM", "ROOM_VISIBLE"],
  ["ROOM_VISIBLE", "ROOM_VISIBLE"],
  ["SCHOOL", "SCHOOL_VISIBLE"],
  ["SCHOOL_VISIBLE", "SCHOOL_VISIBLE"],
  ["PARENT_PERSONEL", "PARENT_PERSONEL_VISIBLE"],
  ["PARENT_PERSONEL_VISIBLE", "PARENT_PERSONEL_VISIBLE"],
]);

const VISIBILITY_SIGNAL_IDS = new Set([
  "COMPANY_VISIBLE",
  "ROOM_VISIBLE",
  "SCHOOL_VISIBLE",
  "PARENT_PERSONEL_VISIBLE",
]);

function cleanText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function cleanUpper(value, fallback = "") {
  const text = cleanText(value, fallback);
  return text ? text.toUpperCase() : "";
}

function hasText(value) {
  return cleanText(value, "").length > 0;
}

function normalizeSignalId(raw) {
  const text = cleanUpper(raw).replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!text) return "";
  return PROOF_SIGNAL_ALIASES.get(text) || (PROOF_SIGNAL_SET.has(text) ? text : "");
}

export function normalizeProofSignal(signal) {
  if (!signal) return "";
  if (typeof signal === "string") {
    return normalizeSignalId(signal);
  }
  if (typeof signal === "object") {
    return normalizeSignalId(
      signal.id ||
        signal.signal ||
        signal.type ||
        signal.key ||
        signal.name ||
        signal.code ||
        signal.value
    );
  }
  return "";
}

function normalizeManualNoteText(value, max = 120) {
  const text = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!text) return "";
  const limit = Number(max || 0) > 0 ? Math.trunc(max) : 120;
  return text.slice(0, limit);
}

function collectManualNoteEntries(source = []) {
  const items = Array.isArray(source) ? source : [];
  return items
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") {
        const note = normalizeManualNoteText(item, 120);
        return note ? { note, preview: note, updatedAt: null } : null;
      }
      if (typeof item !== "object") return null;
      const signal = normalizeProofSignal(item);
      const proofType = cleanUpper(item?.proofType);
      const checkId = cleanUpper(item?.checkId);
      const rawNote = item?.note || item?.message || item?.text || item?.preview || item?.manualNote;
      const note = normalizeManualNoteText(rawNote, 120);
      const looksLikeManualNote =
        signal === "MANUAL_OPERATOR_NOTE" ||
        proofType === "MANUAL_OPERATOR_NOTE" ||
        checkId.includes("MANUAL_OPERATOR_NOTE") ||
        Boolean(note);
      if (!looksLikeManualNote) return null;
      return {
        note,
        preview: note,
        updatedAt: item?.updatedAt || item?.createdAt || null,
      };
    })
    .filter((item) => item && hasText(item.note))
    .sort((a, b) => String(b?.updatedAt || "").localeCompare(String(a?.updatedAt || "")));
}

function asCount(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

function asBool(value) {
  return Boolean(value);
}

function itemNote(done, onText, offText) {
  return done ? onText : offText;
}

function proofTextMap(status) {
  switch (status) {
    case OPERATION_PROOF_STATUSES.NOT_STARTED:
      return {
        summaryText: "Servis kanıtı hazırlanıyor",
        nextAction: "Servis başladığında ilk kanıtları ve biniş kaydını kontrol edin.",
      };
    case OPERATION_PROOF_STATUSES.IN_PROGRESS:
      return {
        summaryText: "Kanıt toplanıyor",
        nextAction: "Sürücünün telefon GPS’i, araç GPS’i ve biniş kaydı görünür oldukça kontrol edin.",
      };
    case OPERATION_PROOF_STATUSES.EVIDENCE_PARTIAL:
      return {
        summaryText: "Kanıt kısmi",
        nextAction: "Eksik kanıtı operatör notu veya zaman işareti ile tamamlayın.",
      };
    case OPERATION_PROOF_STATUSES.EVIDENCE_READY:
      return {
        summaryText: "Kanıt denetime hazır",
        nextAction: "Denetim öncesi özet ve notu son kez gözden geçirin.",
      };
    case OPERATION_PROOF_STATUSES.NEEDS_REVIEW:
      return {
        summaryText: "Operatör notu bekleniyor",
        nextAction: "Operatör notu eklenmeden nihai karar vermeyin.",
      };
    case OPERATION_PROOF_STATUSES.COMPLETED:
      return {
        summaryText: "Kanıt tamamlandı",
        nextAction: "Kapanış kontrolünü yapın ve hakediş için sonraki adıma geçin.",
      };
    default:
      return {
        summaryText: "Servis kanıtı hazırlanıyor",
        nextAction: "Servis başladığında ilk kanıtları ve biniş kaydını kontrol edin.",
      };
  }
}

export function buildProofChecklist(input = {}) {
  const scope = input?.scope || {};
  const companyKind = cleanUpper(scope?.companyKind);
  const scopeRole = cleanUpper(scope?.role);
  const manualNoteEntries = collectManualNoteEntries(input.manualNotes ?? input.operationVerificationRecords);

  const shiftStartedCount = asCount(input.shiftStartedCount ?? input.startedShiftCount);
  const shiftCompletedCount = asCount(input.shiftCompletedCount ?? input.completedShiftCount);
  const gpsSeenCount = asCount(input.gpsSeenCount);
  const driverPhoneGpsSeenCount = asCount(input.driverPhoneGpsSeenCount);
  const vehicleGpsSeenCount = asCount(input.vehicleGpsSeenCount);
  const boardingRecordedCount = asCount(input.boardingRecordedCount ?? input.boardingsRecordedCount);
  const noBoardRecordedCount = asCount(input.noBoardRecordedCount);
  const etaAvailableCount = asCount(input.etaAvailableCount);
  const manualOperatorNoteCount = asCount(input.manualOperatorNoteCount ?? manualNoteEntries.length);

  const companyVisible = asBool(
    input.companyVisible ?? (scopeRole === "SUPER_ADMIN" || scopeRole === "COMPANY")
  );
  const roomVisible = asBool(
    input.roomVisible ?? (scopeRole === "SUPER_ADMIN" || scopeRole === "ROOM")
  );
  const schoolVisible = asBool(
    input.schoolVisible ?? (companyKind === "SCHOOL" || scopeRole === "SUPER_ADMIN")
  );
  const parentPersonelVisible = asBool(
    input.parentPersonelVisible ??
      (companyKind === "SCHOOL" ||
        companyKind === "ORGANIZATION" ||
        scopeRole === "SUPER_ADMIN")
  );

  const gpsSeen = gpsSeenCount > 0;
  const driverPhoneGpsSeen = driverPhoneGpsSeenCount > 0;
  const vehicleGpsSeen = vehicleGpsSeenCount > 0;
  const boardingRecorded = boardingRecordedCount > 0;
  const noBoardRecorded = noBoardRecordedCount > 0;
  const etaAvailable = etaAvailableCount > 0;
  const manualOperatorNote = manualOperatorNoteCount > 0;
  const shiftStarted = shiftStartedCount > 0;
  const shiftCompleted = shiftCompletedCount > 0;

  return [
    {
      id: "SHIFT_STARTED",
      label: "Servis başladı",
      done: shiftStarted,
      count: shiftStartedCount,
      note: itemNote(shiftStarted, "Servis akışı başladı.", "Servis başlangıcı bekleniyor."),
    },
    {
      id: "GPS_SEEN",
      label: "GPS kanıtı var",
      done: gpsSeen,
      count: gpsSeenCount,
      note: itemNote(gpsSeen, "GPS işareti görüldü.", "GPS işareti henüz görünmedi."),
    },
    {
      id: "DRIVER_PHONE_GPS_SEEN",
      label: "Sürücünün telefon GPS’i görüldü",
      done: driverPhoneGpsSeen,
      count: driverPhoneGpsSeenCount,
      note: itemNote(driverPhoneGpsSeen, "Sürücünün telefon GPS’i görüldü.", "Sürücünün telefon GPS’i beklemede."),
    },
    {
      id: "VEHICLE_GPS_SEEN",
      label: "Araç GPS’i görüldü",
      done: vehicleGpsSeen,
      count: vehicleGpsSeenCount,
      note: itemNote(vehicleGpsSeen, "Araç GPS’i görüldü.", "Araç GPS’i henüz görünmedi."),
    },
    {
      id: "BOARDING_RECORDED",
      label: "Biniş kaydı var",
      done: boardingRecorded,
      count: boardingRecordedCount,
      note: itemNote(boardingRecorded, "Biniş kaydı var.", "Biniş kaydı bekleniyor."),
    },
    {
      id: "NO_BOARD_RECORDED",
      label: "Bugün servisi kullanmayacağım kaydı var",
      done: noBoardRecorded,
      count: noBoardRecordedCount,
      note: itemNote(noBoardRecorded, "Bugün servisi kullanmayacağım kaydı var.", "Bu kayıt henüz yok."),
    },
    {
      id: "ETA_AVAILABLE",
      label: "ETA hazır",
      done: etaAvailable,
      count: etaAvailableCount,
      note: itemNote(etaAvailable, "Tahmini geliş bilgisi hazır.", "Tahmini geliş bilgisi bekleniyor."),
    },
    {
      id: "MANUAL_OPERATOR_NOTE",
      label: "Operatör notu var",
      done: manualOperatorNote,
      count: manualOperatorNoteCount,
      note: itemNote(manualOperatorNote, "Operatör notu mevcut.", "Operatör notu bekleniyor."),
    },
    {
      id: "COMPANY_VISIBLE",
      label: "Firma görünür",
      done: companyVisible,
      count: companyVisible ? 1 : 0,
      note: itemNote(companyVisible, "Firma kapsamı görünür.", "Firma kapsamı bu özet için kapalı."),
    },
    {
      id: "ROOM_VISIBLE",
      label: "Oda görünür",
      done: roomVisible,
      count: roomVisible ? 1 : 0,
      note: itemNote(roomVisible, "Oda kapsamı görünür.", "Oda kapsamı bu özet için kapalı."),
    },
    {
      id: "SCHOOL_VISIBLE",
      label: "Okul görünür",
      done: schoolVisible,
      count: schoolVisible ? 1 : 0,
      note: itemNote(schoolVisible, "Okul kapsamı görünür.", "Okul kapsamı bu özet için kapalı."),
    },
    {
      id: "PARENT_PERSONEL_VISIBLE",
      label: "Veli / personel görünür",
      done: parentPersonelVisible,
      count: parentPersonelVisible ? 1 : 0,
      note: itemNote(parentPersonelVisible, "Veli / personel yüzeyi görünür.", "Veli / personel yüzeyi bu özet için kapalı."),
    },
    {
      id: "SHIFT_COMPLETED",
      label: "Servis tamamlandı",
      done: shiftCompleted,
      count: shiftCompletedCount,
      note: itemNote(shiftCompleted, "Servis tamamlandı.", "Servis kapanışı bekleniyor."),
    },
  ];
}

export function buildServiceProofStatus(input = {}) {
  const checklist = Array.isArray(input.checklist) ? input.checklist : buildProofChecklist(input);
  const coreChecklist = checklist.filter((item) => !VISIBILITY_SIGNAL_IDS.has(item.id));
  const activeCore = coreChecklist.filter((item) => item?.done);
  const activeIds = new Set(activeCore.map((item) => item.id));

  if (!activeCore.length) return OPERATION_PROOF_STATUSES.NOT_STARTED;
  if (activeIds.has("SHIFT_COMPLETED") && activeIds.has("GPS_SEEN") && activeIds.has("BOARDING_RECORDED") && activeIds.has("MANUAL_OPERATOR_NOTE")) {
    return OPERATION_PROOF_STATUSES.COMPLETED;
  }
  if (activeIds.has("GPS_SEEN") && activeIds.has("BOARDING_RECORDED") && activeIds.has("MANUAL_OPERATOR_NOTE")) {
    return OPERATION_PROOF_STATUSES.EVIDENCE_READY;
  }
  if (activeIds.has("NO_BOARD_RECORDED") && !activeIds.has("MANUAL_OPERATOR_NOTE")) {
    return OPERATION_PROOF_STATUSES.NEEDS_REVIEW;
  }
  if (activeIds.has("SHIFT_STARTED") || activeIds.has("GPS_SEEN") || activeIds.has("BOARDING_RECORDED")) {
    if (activeIds.has("ETA_AVAILABLE") || activeIds.has("VEHICLE_GPS_SEEN") || activeIds.has("DRIVER_PHONE_GPS_SEEN")) {
      return OPERATION_PROOF_STATUSES.EVIDENCE_PARTIAL;
    }
    return OPERATION_PROOF_STATUSES.IN_PROGRESS;
  }
  return OPERATION_PROOF_STATUSES.EVIDENCE_PARTIAL;
}

function buildTitle(scope = {}) {
  const role = cleanUpper(scope?.role);
  const companyKind = cleanUpper(scope?.companyKind);
  if (role === "ROOM") return "Oda servis kanıtı";
  if (companyKind === "SCHOOL") return "Okul servis kanıtı";
  if (companyKind === "ORGANIZATION") return "Organizasyon servis kanıtı";
  if (companyKind === "COMPANY") return "Firma servis kanıtı";
  return "Servis kanıtı";
}

export function buildOperationProofSummary(input = {}) {
  const scope = input?.scope || {};
  const manualNoteEntries = collectManualNoteEntries(input.manualNotes ?? input.operationVerificationRecords);
  const manualNotePreview = manualNoteEntries[0]?.preview || "";
  const checklist = buildProofChecklist(input);
  const status = buildServiceProofStatus({ ...input, checklist });
  const signals = checklist
    .filter((item) => item?.done)
    .map((item) => ({
      id: normalizeProofSignal(item.id) || item.id,
      label: cleanText(item.label, item.id),
      count: asCount(item.count) || 1,
      note:
        item.id === "MANUAL_OPERATOR_NOTE" && manualNotePreview
          ? `Operatör notu: ${manualNotePreview}`
          : cleanText(item.note, ""),
    }));
  const title = cleanText(input.title, buildTitle(scope));
  const text = proofTextMap(status);
  const visibilityNote = cleanText(
    input.visibilityNote,
    "KVKK görünürlük sınırı korunur. Bu özet hakediş için nihai karar değildir."
  );

  return {
    version: OPERATION_PROOF_VERSION,
    status,
    title,
    summaryText: text.summaryText,
    checklist,
    signals,
    nextAction: cleanText(input.nextAction, text.nextAction),
    visibilityNote,
  };
}
