import { httpError } from "../errors/http.js";
import { resolveAgreementCommercialEvidence } from "../finance/agreementCommercialEvidence.js";

const VALID_PAYMENT_METHODS = new Set([
  "BANK_TRANSFER",
  "CASH",
  "CARD",
  "OTHER",
]);

const VALID_CURRENCIES = /^[A-Z]{3}$/;

// Tahsilat V1'de banka sağlayıcısı bağlı değildir. BANK_TRANSFER yalnızca
// ödeme yöntemidir; doğrulanmış banka ödemesi iddiası üretmez.
const MANUAL_VERIFICATION_MODE = "MANUAL";
const NOT_BANK_VERIFIED_STATUS = "NOT_BANK_VERIFIED";

function numberValue(value) {
  return Number.isSafeInteger(Number(value)) ? Number(value) : null;
}

function normalizeText(value, maxLength = 240) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, maxLength) : null;
}

function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const text = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function actorRoomId(actor) {
  const role = String(actor?.role || "").toUpperCase();
  const roomId = numberValue(actor?.roomId);
  if (role !== "ROOM" || !roomId || roomId <= 0) {
    throw httpError(403, "COLLECTION_ROOM_SCOPE_REQUIRED", "Tahsilat işlemi yalnızca kendi ROOM firması kapsamında yapılabilir.");
  }
  return roomId;
}

function actorCompanyId(actor) {
  const role = String(actor?.role || "").toUpperCase();
  const companyId = numberValue(actor?.companyId);
  if (role !== "COMPANY" || !companyId || companyId <= 0) {
    throw httpError(403, "COLLECTION_COMPANY_SCOPE_REQUIRED", "Ödeme beyanı yalnızca kendi firma kapsamınızdan yapılabilir.");
  }
  return companyId;
}

function validateAmount(amountMinor) {
  const amount = numberValue(amountMinor);
  if (!amount || amount <= 0) {
    throw httpError(422, "COLLECTION_AMOUNT_INVALID", "Tahsilat tutarı sıfırdan büyük, tam kuruş olarak girilmelidir.");
  }
  return amount;
}

function validateCurrency(currencyCode) {
  const currency = String(currencyCode || "").trim().toUpperCase();
  if (!VALID_CURRENCIES.test(currency)) {
    throw httpError(422, "COLLECTION_CURRENCY_INVALID", "Geçerli bir para birimi seçilmelidir.");
  }
  return currency;
}

function validatePaymentMethod(paymentMethod) {
  const method = String(paymentMethod || "").trim().toUpperCase();
  if (!VALID_PAYMENT_METHODS.has(method)) {
    throw httpError(422, "COLLECTION_PAYMENT_METHOD_INVALID", "Geçerli bir ödeme yöntemi seçilmelidir.");
  }
  return method;
}

function missingFoundationError(error) {
  return String(error?.code || "") === "P2021" ||
    /invoicecollection/i.test(String(error?.message || ""));
}

function throwIfFoundationMissing(error) {
  if (missingFoundationError(error)) {
    throw httpError(503, "COLLECTION_FOUNDATION_NOT_INSTALLED", "Tahsilat altyapısı bu çalışma ortamında henüz kurulmadı.");
  }
  throw error;
}

function assertCollectionModel(prisma) {
  if (!prisma?.invoiceCollection) {
    throw httpError(503, "COLLECTION_FOUNDATION_NOT_INSTALLED", "Tahsilat altyapısı bu çalışma ortamında henüz kurulmadı.");
  }
}

async function findInvoice({ prisma, roomId = null, companyId = null, invoiceId }) {
  const normalizedInvoiceId = numberValue(invoiceId);
  if (!normalizedInvoiceId || normalizedInvoiceId <= 0) {
    throw httpError(404, "INVOICE_NOT_FOUND", "Fatura bulunamadı.");
  }

  let invoice;
  try {
    invoice = await prisma.invoiceRecord.findFirst({
      where: {
        id: normalizedInvoiceId,
        ...(roomId ? { roomId } : {}),
        ...(companyId ? { companyId } : {}),
      },
      select: {
        id: true,
        reference: true,
        source: true,
        companyId: true,
        roomId: true,
        amountMinor: true,
        currencyCode: true,
        status: true,
        periodStart: true,
        periodEnd: true,
        agreementId: true,
        agreement: {
          select: {
            id: true,
            companyId: true,
            roomId: true,
            status: true,
            companyOfferAmount: true,
            roomOfferAmount: true,
          },
        },
        company: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
      },
    });
  } catch (error) {
    throwIfFoundationMissing(error);
  }

  if (!invoice || (roomId && Number(invoice.roomId) !== roomId) || (companyId && Number(invoice.companyId) !== companyId)) {
    throw httpError(404, "INVOICE_NOT_FOUND", "Bu firma kapsamında fatura bulunamadı.");
  }
  if (String(invoice.status || "").toUpperCase() === "CANCELLED") {
    throw httpError(409, "INVOICE_CANCELLED", "İptal edilmiş faturaya tahsilat eklenemez.");
  }
  return invoice;
}

async function findCollectionRows({ prisma, roomId = null, companyId = null, invoiceId }) {
  assertCollectionModel(prisma);
  try {
    return await prisma.invoiceCollection.findMany({
      where: {
        invoiceId,
        ...(roomId ? { roomId } : {}),
        ...(companyId ? { companyId } : {}),
      },
      include: {
        createdBy: { select: { role: true } },
        confirmedBy: { select: { role: true } },
      },
      orderBy: [{ collectedAt: "asc" }, { id: "asc" }],
    });
  } catch (error) {
    throwIfFoundationMissing(error);
  }
}

async function resolveCommercialInvoiceParties({ prisma, invoice } = {}) {
  const agreement = invoice?.agreement;
  const companyId = numberValue(invoice?.companyId);
  const roomId = numberValue(invoice?.roomId);
  const agreementMatches = agreement
    && Number(agreement.id) === Number(invoice?.agreementId)
    && Number(agreement.companyId) === companyId
    && Number(agreement.roomId) === roomId;
  const acceptedStatus = ["APPROVED", "ACTIVE", "DONE"].includes(String(agreement?.status || "").toUpperCase());
  let auditLogs = [];
  if (agreementMatches && prisma?.auditLog?.findMany) {
    auditLogs = await prisma.auditLog.findMany({
      where: { entity: "Agreement", entityId: Number(agreement.id) },
      orderBy: { createdAt: "asc" },
    });
  }
  const commercialEvidence = agreementMatches
    ? resolveAgreementCommercialEvidence({ agreement, auditLogs })
    : null;
  const acceptedPriceMinor = numberValue(commercialEvidence?.commercialReference?.amountMinor);
  if (!companyId || !roomId || !agreementMatches || !acceptedStatus || commercialEvidence?.commercialReference?.status !== "READY" || !acceptedPriceMinor || acceptedPriceMinor <= 0) {
    return {
      status: "NOT_PROVEN",
      reason: "Fatura, kabul edilmiş sözleşme ve ticari taraflar aynı kayıtta doğrulanamadı.",
    };
  }
  return {
    status: "READY",
    issuer: { role: "ROOM", id: roomId, name: invoice?.room?.name || null },
    debtor: { role: "COMPANY", id: companyId, name: invoice?.company?.name || null },
    paymentDirection: "COMPANY_TO_ROOM",
    acceptedPrice: {
      amountMinor: acceptedPriceMinor,
      currencyCode: String(invoice?.currencyCode || "TRY").toUpperCase(),
      source: commercialEvidence.commercialReference.source,
    },
    source: "INVOICE_AGREEMENT_ROOM_COMPANY_LINK",
  };
}

function confirmedEffectiveAmount(rows, currencyCode) {
  const expectedCurrency = String(currencyCode || "").toUpperCase();
  return rows
    .filter((row) => String(row?.status || "").toUpperCase() === "CONFIRMED")
    .reduce((sum, row) => {
      if (String(row?.currencyCode || "").toUpperCase() !== expectedCurrency) {
        throw httpError(409, "COLLECTION_RECONCILIATION_MISMATCH", "Tahsilat para birimi faturayla uyuşmuyor.");
      }
      const amount = numberValue(row?.amountMinor);
      if (!amount || amount <= 0) {
        throw httpError(409, "COLLECTION_RECONCILIATION_MISMATCH", "Tahsilat kaydının tutarı doğrulanamıyor.");
      }
      return sum + (String(row?.direction || "COLLECTION").toUpperCase() === "REVERSAL" ? -amount : amount);
    }, 0);
}

function publicCollectionRow(row) {
  return {
    id: numberValue(row?.id),
    invoiceId: numberValue(row?.invoiceId),
    amountMinor: numberValue(row?.amountMinor),
    currencyCode: String(row?.currencyCode || "").toUpperCase() || null,
    collectedAt: row?.collectedAt instanceof Date ? row.collectedAt.toISOString().slice(0, 10) : row?.collectedAt || null,
    paymentMethod: String(row?.paymentMethod || "").toUpperCase() || null,
    verificationMode: MANUAL_VERIFICATION_MODE,
    verificationStatus: NOT_BANK_VERIFIED_STATUS,
    createdByRole: String(row?.createdBy?.role || "").toUpperCase() || null,
    confirmedByRole: String(row?.confirmedBy?.role || "").toUpperCase() || null,
    direction: String(row?.direction || "COLLECTION").toUpperCase(),
    status: String(row?.status || "").toUpperCase(),
    sourceRef: normalizeText(row?.sourceRef),
    note: normalizeText(row?.note),
    reversalOfId: numberValue(row?.reversalOfId),
    version: numberValue(row?.version),
    createdAt: row?.createdAt instanceof Date ? row.createdAt.toISOString() : row?.createdAt || null,
    confirmedAt: row?.confirmedAt instanceof Date ? row.confirmedAt.toISOString() : row?.confirmedAt || null,
  };
}

function assertMatchingIdempotency(existing, payload) {
  const same = Number(existing?.invoiceId) === Number(payload.invoiceId) &&
    Number(existing?.amountMinor) === Number(payload.amountMinor) &&
    String(existing?.currencyCode || "").toUpperCase() === payload.currencyCode &&
    String(existing?.paymentMethod || "").toUpperCase() === payload.paymentMethod &&
    String(existing?.sourceRef || "") === String(payload.sourceRef || "");
  if (!same) {
    throw httpError(409, "COLLECTION_IDEMPOTENCY_CONFLICT", "Aynı işlem anahtarı farklı bir tahsilat içeriğiyle tekrar kullanılamaz.");
  }
}

async function writeAudit(tx, { action, entityId, actor, meta }) {
  if (!tx?.auditLog?.create) return;
  await tx.auditLog.create({
    data: {
      actorUserId: numberValue(actor?.id),
      actorRole: String(actor?.role || "ROOM"),
      action,
      entity: "InvoiceCollection",
      entityId: numberValue(entityId),
      meta: meta || null,
    },
  });
}

async function createCollectionDraftForActor({
  prisma,
  actor,
  invoiceId,
  amountMinor,
  currencyCode,
  collectedAt,
  paymentMethod,
  sourceRef = null,
  note = null,
  idempotencyKey,
  expectedRole,
} = {}) {
  assertCollectionModel(prisma);
  const role = String(actor?.role || "").toUpperCase();
  if (role !== expectedRole) {
    throw httpError(403, "COLLECTION_ROLE_SCOPE_REQUIRED", "Bu ödeme işlemi için yetkili rolünüz bulunmuyor.");
  }
  const roomId = role === "ROOM" ? actorRoomId(actor) : null;
  const companyId = role === "COMPANY" ? actorCompanyId(actor) : null;
  const amount = validateAmount(amountMinor);
  const currency = validateCurrency(currencyCode);
  const method = validatePaymentMethod(paymentMethod);
  const date = normalizeDate(collectedAt);
  const key = normalizeText(idempotencyKey, 160);
  if (!date) throw httpError(422, "COLLECTION_DATE_INVALID", "Tahsilat tarihi geçerli olmalıdır.");
  if (!key) throw httpError(422, "COLLECTION_IDEMPOTENCY_REQUIRED", "Tahsilat işlemi için işlem anahtarı gereklidir.");
  const invoice = await findInvoice({ prisma, roomId, companyId, invoiceId });
  if (currency !== String(invoice.currencyCode || "").toUpperCase()) {
    throw httpError(422, "COLLECTION_CURRENCY_MISMATCH", "Tahsilat para birimi faturayla aynı olmalıdır.");
  }

  const payload = {
    invoiceId: invoice.id,
    amountMinor: amount,
    currencyCode: currency,
    collectedAt: date,
    paymentMethod: method,
    sourceRef: normalizeText(sourceRef),
    note: normalizeText(note, 500),
    idempotencyKey: key,
  };

  try {
    const existing = await prisma.invoiceCollection.findFirst({
      where: { ...(roomId ? { roomId } : { companyId }), idempotencyKey: key },
    });
    if (existing) {
      assertMatchingIdempotency(existing, payload);
      return { ...publicCollectionRow(existing), idempotentReplay: true };
    }
    const created = await prisma.$transaction(async (tx) => {
      // ROOM taslakları da bakiye sınırına transaction içinde dahil edilir.
      // Böylece iki ayrı tarayıcı isteği aynı faturayı birlikte aşamaz.
      if (typeof tx.$queryRaw === "function") {
        await tx.$queryRaw`SELECT "id" FROM "InvoiceRecord" WHERE "id" = ${invoice.id} FOR UPDATE`;
      }
      const scope = role === "COMPANY"
        ? { companyId: invoice.companyId }
        : { roomId: invoice.roomId };
      const existingRows = await findCollectionRows({ prisma: tx, ...scope, invoiceId: invoice.id });
      const confirmedBefore = confirmedEffectiveAmount(existingRows, invoice.currencyCode);
      const pendingBefore = existingRows
        .filter((row) => String(row?.status || "").toUpperCase() === "DRAFT" && String(row?.direction || "COLLECTION").toUpperCase() === "COLLECTION")
        .reduce((sum, row) => sum + (numberValue(row?.amountMinor) || 0), 0);
      if (confirmedBefore + pendingBefore + amount > Number(invoice.amountMinor)) {
        if (role === "COMPANY") {
          throw httpError(422, "PAYMENT_DECLARATION_EXCEEDS_INVOICE", "Ödeme beyanlarının toplamı fatura tutarını aşamaz.");
        }
        throw httpError(422, "COLLECTION_EXCEEDS_INVOICE", "Tahsilat faturanın kalan alacağını aşamaz.");
      }
      const row = await tx.invoiceCollection.create({
        data: {
          ...payload,
          companyId: invoice.companyId,
          roomId: invoice.roomId,
          status: "DRAFT",
          direction: "COLLECTION",
          createdByUserId: actor.id,
        },
      });
      await writeAudit(tx, {
        action: role === "COMPANY" ? "INVOICE_PAYMENT_DECLARATION_DRAFT_CREATED" : "INVOICE_COLLECTION_DRAFT_CREATED",
        entityId: row.id,
        actor,
        meta: { invoiceId: invoice.id, amountMinor: amount, currencyCode: currency, idempotencyKey: key },
      });
      return row;
    });
    return { ...publicCollectionRow(created), idempotentReplay: false };
  } catch (error) {
    if (String(error?.code || "") === "P2002") {
      const existing = await prisma.invoiceCollection.findFirst({
        where: { ...(roomId ? { roomId } : { companyId }), idempotencyKey: key },
      });
      if (existing) {
        assertMatchingIdempotency(existing, payload);
        return { ...publicCollectionRow(existing), idempotentReplay: true };
      }
    }
    throwIfFoundationMissing(error);
  }
}

export async function createCollectionDraft(args = {}) {
  return createCollectionDraftForActor({ ...args, expectedRole: "ROOM" });
}

export async function createCompanyPaymentDeclarationDraft(args = {}) {
  return createCollectionDraftForActor({ ...args, expectedRole: "COMPANY" });
}

export async function confirmCollectionDraft({ prisma, actor, collectionId } = {}) {
  assertCollectionModel(prisma);
  const roomId = actorRoomId(actor);
  const id = numberValue(collectionId);
  if (!id || id <= 0) throw httpError(404, "COLLECTION_NOT_FOUND", "Tahsilat taslağı bulunamadı.");

  try {
    const confirmed = await prisma.$transaction(async (tx) => {
      const row = await tx.invoiceCollection.findUnique({ where: { id } });
      if (!row || Number(row.roomId) !== roomId) throw httpError(404, "COLLECTION_NOT_FOUND", "Bu firma kapsamında tahsilat bulunamadı.");
      if (String(row.direction || "COLLECTION") !== "COLLECTION") throw httpError(409, "COLLECTION_REVERSAL_NOT_CONFIRMABLE", "Ters kayıt taslak olarak onaylanamaz.");
      if (String(row.status || "") === "CONFIRMED") return row;
      if (String(row.status || "") !== "DRAFT") throw httpError(409, "COLLECTION_STATE_INVALID", "Yalnızca taslak tahsilat onaylanabilir.");
      // Aynı faturaya paralel onaylar, bakiye kontrolünü geçip fazla tahsilat
      // üretmemeli. PostgreSQL'de fatura satırını transaction boyunca kilitle.
      if (typeof tx.$queryRaw === "function") {
        await tx.$queryRaw`SELECT "id" FROM "InvoiceRecord" WHERE "id" = ${row.invoiceId} AND "roomId" = ${roomId} FOR UPDATE`;
      }
      const invoice = await findInvoice({ prisma: tx, roomId, invoiceId: row.invoiceId });
      const rows = await findCollectionRows({ prisma: tx, roomId, invoiceId: row.invoiceId });
      const confirmedBefore = confirmedEffectiveAmount(rows, invoice.currencyCode);
      const amount = validateAmount(row.amountMinor);
      if (confirmedBefore + amount > Number(invoice.amountMinor)) {
        throw httpError(422, "COLLECTION_EXCEEDS_INVOICE", "Tahsilat faturanın kalan tutarını aşamaz.");
      }
      const updatedAt = new Date();
      const version = Number(row.version || 1);
      const result = typeof tx.invoiceCollection.updateMany === "function"
        ? await tx.invoiceCollection.updateMany({
          where: { id: row.id, status: "DRAFT", version },
          data: {
            status: "CONFIRMED",
            confirmedByUserId: actor.id,
            confirmedAt: updatedAt,
            version: version + 1,
          },
        })
        : null;
      if (result && Number(result.count) !== 1) {
        throw httpError(409, "COLLECTION_VERSION_CONFLICT", "Tahsilat kaydı başka bir işlemle değişti; tekrar okuyun.");
      }
      const updated = result
        ? await tx.invoiceCollection.findUnique({ where: { id: row.id } })
        : await tx.invoiceCollection.update({
          where: { id: row.id },
          data: {
            status: "CONFIRMED",
            confirmedByUserId: actor.id,
            confirmedAt: updatedAt,
            version: version + 1,
          },
        });
      await writeAudit(tx, {
        action: "INVOICE_COLLECTION_CONFIRMED",
        entityId: row.id,
        actor,
        meta: { invoiceId: row.invoiceId, amountMinor: amount, currencyCode: row.currencyCode },
      });
      return updated;
    });
    return publicCollectionRow(confirmed);
  } catch (error) {
    throwIfFoundationMissing(error);
  }
}

export async function cancelCollectionDraft({ prisma, actor, collectionId, reason = null } = {}) {
  assertCollectionModel(prisma);
  const roomId = actorRoomId(actor);
  const id = numberValue(collectionId);
  try {
    const cancelled = await prisma.$transaction(async (tx) => {
      const row = await tx.invoiceCollection.findUnique({ where: { id } });
      if (!row || Number(row.roomId) !== roomId) throw httpError(404, "COLLECTION_NOT_FOUND", "Bu firma kapsamında tahsilat bulunamadı.");
      if (String(row.status || "") === "CANCELLED") return row;
      if (String(row.status || "") !== "DRAFT") throw httpError(409, "COLLECTION_STATE_INVALID", "Yalnızca taslak tahsilat iptal edilebilir.");
      const version = Number(row.version || 1);
      const data = {
        status: "CANCELLED",
        cancelledByUserId: actor.id,
        cancelledAt: new Date(),
        version: version + 1,
        note: normalizeText(reason, 500) || row.note || null,
      };
      const result = typeof tx.invoiceCollection.updateMany === "function"
        ? await tx.invoiceCollection.updateMany({ where: { id, status: "DRAFT", version }, data })
        : null;
      if (result && Number(result.count) !== 1) {
        throw httpError(409, "COLLECTION_VERSION_CONFLICT", "Tahsilat taslağı başka bir işlemle değişti; tekrar okuyun.");
      }
      const updated = result
        ? await tx.invoiceCollection.findUnique({ where: { id } })
        : await tx.invoiceCollection.update({ where: { id }, data });
      await writeAudit(tx, {
        action: "INVOICE_COLLECTION_DRAFT_CANCELLED",
        entityId: id,
        actor,
        meta: { invoiceId: row.invoiceId, reason: normalizeText(reason) },
      });
      return updated;
    });
    return publicCollectionRow(cancelled);
  } catch (error) {
    throwIfFoundationMissing(error);
  }
}

export async function reverseConfirmedCollection({ prisma, actor, collectionId, idempotencyKey, reason = null } = {}) {
  assertCollectionModel(prisma);
  const roomId = actorRoomId(actor);
  const id = numberValue(collectionId);
  const key = normalizeText(idempotencyKey, 160);
  if (!key) throw httpError(422, "COLLECTION_IDEMPOTENCY_REQUIRED", "Ters kayıt için işlem anahtarı gereklidir.");

  try {
    const reversed = await prisma.$transaction(async (tx) => {
      const existing = await tx.invoiceCollection.findFirst({ where: { roomId, idempotencyKey: key } });
      if (existing) return existing;
      const row = await tx.invoiceCollection.findUnique({ where: { id } });
      if (!row || Number(row.roomId) !== roomId) throw httpError(404, "COLLECTION_NOT_FOUND", "Bu firma kapsamında tahsilat bulunamadı.");
      if (String(row.status || "") !== "CONFIRMED" || String(row.direction || "COLLECTION") !== "COLLECTION") {
        throw httpError(409, "COLLECTION_STATE_INVALID", "Yalnızca doğrulanmış tahsilat ters kayda alınabilir.");
      }
      const priorReversal = await tx.invoiceCollection.findFirst({ where: { roomId, reversalOfId: row.id, status: "CONFIRMED" } });
      if (priorReversal) return priorReversal;
      const created = await tx.invoiceCollection.create({
        data: {
          invoiceId: row.invoiceId,
          companyId: row.companyId,
          roomId,
          amountMinor: row.amountMinor,
          currencyCode: row.currencyCode,
          collectedAt: new Date(),
          paymentMethod: row.paymentMethod,
          direction: "REVERSAL",
          status: "CONFIRMED",
          sourceRef: normalizeText(`REVERSAL:${row.sourceRef || row.id}`),
          note: normalizeText(reason, 500),
          idempotencyKey: key,
          reversalOfId: row.id,
          createdByUserId: actor.id,
          confirmedByUserId: actor.id,
          confirmedAt: new Date(),
        },
      });
      await writeAudit(tx, {
        action: "INVOICE_COLLECTION_REVERSED",
        entityId: created.id,
        actor,
        meta: { invoiceId: row.invoiceId, reversalOfId: row.id, amountMinor: row.amountMinor },
      });
      return created;
    });
    return publicCollectionRow(reversed);
  } catch (error) {
    throwIfFoundationMissing(error);
  }
}

export async function buildInvoiceCollectionSummary({ prisma, actor, invoiceId } = {}) {
  assertCollectionModel(prisma);
  const role = String(actor?.role || "").toUpperCase();
  const roomId = role === "ROOM" ? actorRoomId(actor) : null;
  const companyId = role === "COMPANY" ? actorCompanyId(actor) : null;
  if (!roomId && !companyId) {
    throw httpError(403, "COLLECTION_SCOPE_REQUIRED", "Fatura ödeme bilgisi için yetkili ticari taraf kapsamı gerekir.");
  }
  const invoice = await findInvoice({ prisma, roomId, companyId, invoiceId });
  const rows = await findCollectionRows({ prisma, roomId, companyId, invoiceId: invoice.id });
  // Drafts remain visible so the ROOM user can explicitly confirm or cancel them.
  // They never contribute to the confirmed collection total below.
  const visibleRows = rows.filter((row) => String(row?.status || "").toUpperCase() !== "CANCELLED");
  const confirmedRows = rows.filter((row) => String(row?.status || "").toUpperCase() === "CONFIRMED");
  const draftRows = rows.filter((row) => String(row?.status || "").toUpperCase() === "DRAFT" && String(row?.direction || "COLLECTION").toUpperCase() === "COLLECTION");
  const declaredAmountMinor = draftRows.reduce((sum, row) => sum + (numberValue(row?.amountMinor) || 0), 0) || null;
  const partyBinding = await resolveCommercialInvoiceParties({ prisma, invoice });
  const paymentDeclaration = {
    status: confirmedRows.length ? "ROOM_CONFIRMED_MANUAL" : draftRows.length ? "PENDING_ROOM_CONFIRMATION" : "NONE",
    amountMinor: confirmedRows.length ? null : declaredAmountMinor,
    // A confirmed collection and a new COMPANY declaration may coexist. Keep
    // the confirmed total semantics above, but expose the pending declaration
    // separately so consumers do not hide it behind the confirmed status.
    pendingAmountMinor: declaredAmountMinor,
    pendingCount: draftRows.length,
    verificationMode: MANUAL_VERIFICATION_MODE,
    verificationStatus: NOT_BANK_VERIFIED_STATUS,
    recordCount: confirmedRows.length + draftRows.length,
  };
  const invoiceSource = normalizeText(invoice.source, 80);
  const invoiceSourceLabel = invoiceSource === "TEST_SIMULATED"
    ? "Kontrollü DEMO simülasyonu · gerçek saha/banka kanıtı değil"
    : null;
  const sourcePresentation = {
    source: invoiceSource,
    sourceLabel: invoiceSourceLabel,
  };
  if (!confirmedRows.length) {
    return {
      status: "UNAVAILABLE",
      reason: "Bu fatura için doğrulanmış tahsilat kaydı bulunamadı.",
      invoiceId: invoice.id,
      invoiceAmountMinor: Number(invoice.amountMinor),
      currencyCode: String(invoice.currencyCode || "").toUpperCase(),
      ...sourcePresentation,
      collectedAmountMinor: null,
      receivableAmountMinor: null,
      partyBinding,
      paymentDeclaration,
      recordCount: visibleRows.length,
      records: visibleRows.map(publicCollectionRow),
    };
  }
  const collected = confirmedEffectiveAmount(confirmedRows, invoice.currencyCode);
  if (collected < 0 || collected > Number(invoice.amountMinor)) {
    return {
      status: "RECONCILIATION_MISMATCH",
      reason: "Tahsilat toplamı fatura tutarıyla mutabık değil.",
      invoiceId: invoice.id,
      invoiceAmountMinor: Number(invoice.amountMinor),
      currencyCode: String(invoice.currencyCode || "").toUpperCase(),
      ...sourcePresentation,
      collectedAmountMinor: null,
      receivableAmountMinor: null,
      partyBinding,
      paymentDeclaration,
      recordCount: visibleRows.length,
      records: visibleRows.map(publicCollectionRow),
    };
  }
  return {
    status: "AVAILABLE",
    reason: null,
    invoiceId: invoice.id,
    invoiceAmountMinor: Number(invoice.amountMinor),
    currencyCode: String(invoice.currencyCode || "").toUpperCase(),
    ...sourcePresentation,
    collectedAmountMinor: collected,
    receivableAmountMinor: Number(invoice.amountMinor) - collected,
    partyBinding,
    paymentDeclaration: {
      ...paymentDeclaration,
      amountMinor: collected,
    },
    recordCount: visibleRows.length,
    records: visibleRows.map(publicCollectionRow),
  };
}

export { actorRoomId, confirmedEffectiveAmount, missingFoundationError };
