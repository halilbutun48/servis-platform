import { parseOfferAmountInput } from "../shared/offerAmountPresentation.js";

export function buildRoomCounterPayload({ amountRoom, noteRoom }) {
  const rawAmount = String(amountRoom ?? "").trim();
  const parsedAmount = rawAmount ? parseOfferAmountInput(rawAmount) : null;
  const normalizedNote = String(noteRoom ?? "").trim();

  if (rawAmount && parsedAmount == null) {
    return { error: "Karşı teklif tutarı 0'dan büyük olmalı." };
  }

  if (parsedAmount == null && !normalizedNote) {
    return { error: "Karşı teklif için tutar veya not gir." };
  }

  return {
    amountRoom: parsedAmount ?? undefined,
    noteRoom: normalizedNote || undefined,
  };
}
