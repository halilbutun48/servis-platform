function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/gu, " ");
}

export function isSchoolParentAccessHistoryQuestion(message = "") {
  const text = normalizeText(message);
  if (!text) return false;
  const mentionsAccess = /(?:erişim|erisim).{0,32}(?:geçmiş|gecmis|kaydı|kaydi|durumu|aktif|iptal)|(?:aktif|iptal(?:\s+edilmiş|\s+edilmis)?|sona|geçerli|gecerli).{0,20}(?:erişim|erisim|kayıt|kayit)/iu.test(text);
  return mentionsAccess;
}

function inviteStatus(invite, now = Date.now()) {
  if (invite?.revokedAt) return "REVOKED";
  if (invite?.expiresAt && new Date(invite.expiresAt).getTime() <= now) return "EXPIRED";
  if (invite?.consumedAt) return "CONSUMED";
  return "ACTIVE";
}

export function buildSchoolParentAccessHistoryReply({ student, invites = [], now = Date.now() } = {}) {
  if (!student?.id) return null;

  const rows = Array.isArray(invites) ? invites : [];
  const statuses = rows.map((invite) => inviteStatus(invite, now));
  const revoked = statuses.filter((status) => status === "REVOKED").length;
  const active = statuses.filter((status) => status === "ACTIVE").length;
  const expired = statuses.filter((status) => status === "EXPIRED").length;
  const consumed = statuses.filter((status) => status === "CONSUMED").length;
  const historySummary = rows.length
    ? `${rows.length} kayıt; ${revoked} iptal edilmiş, ${active} aktif, ${expired} süresi dolmuş${consumed ? `, ${consumed} kullanılmış` : ""}.`
    : "Bu öğrenci için kayıtlı veli erişim kaydı bulunmuyor.";
  const reply = `Seçili öğrenci ${student.fullName || `#${student.id}`} için veli erişim geçmişi: ${historySummary} Gizli erişim bilgilerini göstermiyorum.`;

  return {
    ok: true,
    intent: "CHAT_HELP",
    intentLabel: "Veli erişim geçmişi",
    provider: "local-school-parent-access-read",
    providerSummary: "authorized-school-student-parent-access-history",
    mode: "RULE_BASED",
    reply,
    summary: reply,
    contextSummary: `Yetkili okul kapsamındaki seçili öğrenci #${student.id} için veli erişim durumu okundu.`,
    questionType: "SCHOOL_PARENT_ACCESS_HISTORY",
    assistantIntent: "SCHOOL_PARENT_ACCESS_HISTORY",
    authorizedRecords: [{ type: "student", id: Number(student.id) }],
    retrievedFacts: [
      `studentId=${Number(student.id)}`,
      `accessHistoryCount=${rows.length}`,
      `revokedCount=${revoked}`,
      `activeCount=${active}`,
      `expiredCount=${expired}`,
      `consumedCount=${consumed}`,
    ],
    responseSections: [{ title: "Seçili öğrenci", body: reply }],
    dataSources: ["yetkili SCHOOL ParentInvite kayıtları"],
    readOnly: true,
    writeAction: false,
    persisted: false,
    safety: {
      readOnly: true,
      writeAction: false,
      noLiveMutation: true,
      notPersisted: true,
      privacyBoundary: "Yalnız aynı SCHOOL tenantındaki seçili öğrenci; token, PIN, gizli bağlantı ve iletişim bilgisi yok.",
    },
  };
}

export async function buildSchoolParentAccessHistoryResponse({ user, screenContext, message, prisma: db } = {}) {
  const role = String(user?.role || "").toUpperCase();
  const companyKind = String(user?.companyKind || "").toUpperCase();
  const path = String(screenContext?.path || "").split("?")[0];
  const selectedType = String(screenContext?.selectedEntityType || "").toLowerCase();
  const selectedId = Number(screenContext?.selectedEntityId || screenContext?.selectedRecordId || 0);
  if (role !== "COMPANY" || companyKind !== "SCHOOL" || path !== "/school/parents" || selectedType !== "student" || !Number.isSafeInteger(selectedId) || selectedId <= 0) return null;
  if (!isSchoolParentAccessHistoryQuestion(message)) return null;
  if (!db?.personel?.findFirst || !db?.parentInvite?.findMany) return null;

  const companyId = Number(user?.companyId || 0);
  if (!Number.isSafeInteger(companyId) || companyId <= 0) return null;
  const student = await db.personel.findFirst({
    where: { id: selectedId, companyId, kind: "STUDENT" },
    select: { id: true, fullName: true, kind: true },
  });
  if (!student) {
    return {
      ok: true,
      intent: "CHAT_HELP",
      intentLabel: "Yetkili öğrenci erişimi",
      provider: "local-school-parent-access-read",
      providerSummary: "authorized-school-student-boundary",
      mode: "RULE_BASED",
      reply: "Seçili öğrenci bu okulun yetkili kapsamında bulunamadı; başka okul veya tenant kaydı hakkında bilgi veremem.",
      summary: "Seçili öğrenci yetkili okul kapsamı dışında.",
      contextSummary: "SCHOOL tenant sınırı nedeniyle kayıt okunmadı.",
      questionType: "SAFE_AUTHORIZATION_BOUNDARY",
      assistantIntent: "SAFE_AUTHORIZATION_BOUNDARY",
      authorizedRecords: [],
      retrievedFacts: [],
      responseSections: [{ title: "Güvenlik sınırı", body: "Seçili öğrenci yetkili okul kapsamı dışında." }],
      dataSources: ["SCHOOL tenant sınırı"],
      readOnly: true,
      writeAction: false,
      persisted: false,
      safety: { readOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
    };
  }

  const invites = await db.parentInvite.findMany({
    where: { companyId, childPersonelId: student.id },
    orderBy: { id: "desc" },
    take: 50,
    select: { id: true, expiresAt: true, consumedAt: true, revokedAt: true },
  });
  return buildSchoolParentAccessHistoryReply({ student, invites });
}
