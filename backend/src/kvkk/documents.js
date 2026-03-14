// backend/src/kvkk/documents.js
import { prisma } from "../prisma.js";

export const KVKK_DOCS = {
  LOCATION_NOTICE: {
    docKey: "LOCATION_NOTICE",
    docVersion: "1",
    docKind: "NOTICE",
    roles: ["DRIVER", "PARENT"],
    required: true,
    title: "Konum Verisi Aydınlatma Metni",
    summary: "Konum verisinin neden işlendiğini ve ne kadar süre tutulduğunu açıklar.",
    blocks: [
      "Konum verisi sadece servis operasyonu, canlı takip ve güvenlik amacıyla kullanılır.",
      "Canlı görünüm sadece izin verilen rolde ve gerekli zaman penceresinde açılır.",
      "Saklama ve işlem kaydı kuralları sistem politikalarına göre uygulanır.",
    ],
  },
  LOCATION_CONSENT: {
    docKey: "LOCATION_CONSENT",
    docVersion: "1",
    docKind: "CONSENT",
    roles: ["DRIVER", "PARENT"],
    required: true,
    title: "Konum Takibi Açık Rıza",
    summary: "Canlı konum takibi ve ilgili ekranlar için açık rıza kaydı gerekir.",
    blocks: [
      "Bu onay verilmezse canlı konum kullanan ekranlar kapalı kalır.",
      "İstersen daha sonra rızanı geri alabilirsin.",
      "Rıza geri alınırsa canlı takip ve ilgili canlı istekler durur.",
    ],
  },
};

export function getKvkkDocument(docKey) {
  return KVKK_DOCS[String(docKey || "").trim()] || null;
}

export function listKvkkDocumentsForRole(role) {
  const r = String(role || "").trim();
  return Object.values(KVKK_DOCS)
    .filter((x) => Array.isArray(x.roles) && x.roles.includes(r))
    .map((x) => ({ ...x }));
}

export function getKvkkRequiredDocs(role) {
  return listKvkkDocumentsForRole(role).filter((x) => x.required !== false);
}

export async function getKvkkSummaryForUser({ userId, role, prismaClient = prisma }) {
  const docs = getKvkkRequiredDocs(role);
  if (!userId || docs.length === 0) {
    return {
      requiredCount: docs.length,
      acceptedCount: 0,
      blocking: false,
      pendingDocKeys: [],
      items: docs.map((d) => ({ ...d, accepted: false, acceptedAt: null, revokedAt: null })),
    };
  }

  const rows = await prismaClient.consent.findMany({
    where: {
      userId: Number(userId),
      OR: docs.map((d) => ({ docKey: d.docKey, docVersion: d.docVersion })),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: Math.max(20, docs.length * 4),
  });

  const byKey = new Map();
  for (const row of rows) {
    const k = `${row.docKey}::${row.docVersion}`;
    if (!byKey.has(k)) byKey.set(k, row);
  }

  const items = docs.map((d) => {
    const row = byKey.get(`${d.docKey}::${d.docVersion}`);
    const accepted = !!row && !row.revokedAt;
    return {
      ...d,
      accepted,
      acceptedAt: accepted ? row.acceptedAt : null,
      revokedAt: row?.revokedAt || null,
    };
  });

  const acceptedCount = items.filter((x) => x.accepted).length;
  const pendingDocKeys = items.filter((x) => !x.accepted).map((x) => x.docKey);
  return {
    requiredCount: items.length,
    acceptedCount,
    blocking: pendingDocKeys.length > 0,
    pendingDocKeys,
    items,
  };
}
