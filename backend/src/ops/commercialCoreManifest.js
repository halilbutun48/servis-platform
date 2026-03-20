import { prisma } from "../prisma.js";

export const COMMERCIAL_CORE_STEPS = [
  { id: "demand_card", label: "Talep karti", status: "ACTIVE" },
  { id: "offer_lifecycle", label: "Teklif yasam dongusu", status: "ACTIVE" },
  { id: "counter_offer", label: "Karsi teklif", status: "PLANNED" },
  { id: "negotiation_history", label: "Pazarlik gecmisi", status: "PLANNED" },
  { id: "settlement_summary", label: "Uzlasma ozeti", status: "PLANNED" },
  { id: "contract_gate", label: "Sozlesmeye gecis kapisi", status: "PLANNED" },
];

export const COMMERCIAL_CORE_RULES = [
  "Talep karti acilmadan teklif sureci baslamaz.",
  "Teklif ve karsi teklif akisinda durum gorunurlugu korunur.",
  "Uzlasma ozeti olusmadan sozlesme baglanmaz.",
  "M62 green olmadan M63 acilmaz.",
];

export function getCommercialCoreManifest() {
  return {
    activeMilestone: "M62",
    title: "Ticari Omurga Guclendirme",
    steps: COMMERCIAL_CORE_STEPS,
    rules: COMMERCIAL_CORE_RULES,
  };
}

export function buildCommercialLifecycleTemplate() {
  return {
    activeMilestone: "M62",
    route: ["talep", "teklif", "karsi-teklif", "pazarlik-gecmisi", "uzlasma", "sozlesme"],
    summary: "Talep -> teklif -> karsi teklif -> pazarlik gecmisi -> uzlasma -> sozlesme omurgasi.",
  };
}

function fmtAmountLabel({ amountCompany, amountRoom }) {
  const company = Number(amountCompany || 0);
  const room = Number(amountRoom || 0);
  if (company > 0 && room > 0) return `Firma: ${company} / Oda: ${room}`;
  if (room > 0) return `Oda: ${room}`;
  if (company > 0) return `Firma: ${company}`;
  return "-";
}

export async function buildRoomCommercialSummary(user) {
  const roomId = Number(user?.roomId || 0);
  if (!Number.isFinite(roomId) || roomId <= 0) {
    return {
      activeMilestone: "M62-R1A",
      cards: {
        openOffers: 0,
        counteredOffers: 0,
        acceptedOffers: 0,
        requestedAgreements: 0,
        activeAgreements: 0,
        approvedOrActiveShifts: 0,
      },
    };
  }

  const [offers, agreements, approvedOrActiveShifts] = await Promise.all([
    prisma.shiftOffer.findMany({ where: { roomId }, select: { status: true, amountRoom: true } }),
    prisma.agreement.findMany({ where: { roomId }, select: { status: true } }),
    prisma.shift.count({ where: { roomId, status: { in: ["APPROVED", "ACTIVE"] } } }),
  ]);

  const openOffers = offers.filter((x) => String(x.status || "") === "OPEN").length;
  const counteredOffers = offers.filter((x) => String(x.status || "") === "COUNTERED").length;
  const acceptedOffers = offers.filter((x) => String(x.status || "") === "ACCEPTED").length;
  const requestedAgreements = agreements.filter((x) => String(x.status || "") === "REQUESTED").length;
  const activeAgreements = agreements.filter((x) => ["APPROVED", "ACTIVE"].includes(String(x.status || ""))).length;

  return {
    activeMilestone: "M62-R1A",
    cards: {
      openOffers,
      counteredOffers,
      acceptedOffers,
      requestedAgreements,
      activeAgreements,
      approvedOrActiveShifts,
    },
  };
}

export async function buildRoomCommercialItems(user) {
  const roomId = Number(user?.roomId || 0);
  if (!Number.isFinite(roomId) || roomId <= 0) return [];

  const [offers, agreements] = await Promise.all([
    prisma.shiftOffer.findMany({
      where: { roomId },
      orderBy: { updatedAt: "desc" },
      take: 40,
      include: { shift: { select: { id: true, company: { select: { name: true } } } } },
    }),
    prisma.agreement.findMany({
      where: { roomId },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: { company: { select: { name: true } } },
    }),
  ]);

  const offerItems = offers.map((o) => {
    const status = String(o.status || "");
    const flowLabel = status === "OPEN" ? "Teklif" : status === "COUNTERED" ? "Pazarlik" : status === "ACCEPTED" ? "Kabul" : "Kapanan teklif";
    const nextStep = status === "OPEN"
      ? "Teklifi incele ve cevap ver"
      : status === "COUNTERED"
        ? "Firma cevabini bekle"
        : status === "ACCEPTED"
          ? "Bekleyen taleplerde arac ve surucu sec"
          : "Kayit kapandi";
    return {
      id: `offer-${o.id}`,
      updatedAt: o.updatedAt,
      shiftId: o.shift?.id || null,
      counterparty: o.shift?.company?.name || `Company #${o.shift?.id || o.id}`,
      flowLabel,
      amountLabel: fmtAmountLabel(o),
      statusLabel: status,
      nextStep,
      actionPath: status === "ACCEPTED" ? "/room/shifts" : "/room/offers",
      actionLabel: status === "ACCEPTED" ? "Vardiyalari ac" : "Teklifleri ac",
    };
  });

  const agreementItems = agreements.map((a) => {
    const status = String(a.status || "");
    const nextStep = status === "REQUESTED"
      ? "Sartlari kontrol et ve onay kararini netlestir"
      : ["APPROVED", "ACTIVE"].includes(status)
        ? "Operasyon ve vardiya tarafini takip et"
        : "Sozlesme kaydini incele";
    return {
      id: `agreement-${a.id}`,
      updatedAt: a.updatedAt,
      counterparty: a.company?.name || `Company #${a.companyId}`,
      flowLabel: "Sozlesme (ayri akis)",
      amountLabel: fmtAmountLabel({ amountCompany: a.companyOfferAmount, amountRoom: a.roomOfferAmount }),
      statusLabel: status,
      nextStep,
      actionPath: "/room/agreements",
      actionLabel: "Sozlesmeleri ac (ayri)",
    };
  });

  return [...offerItems, ...agreementItems]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 50);
}
