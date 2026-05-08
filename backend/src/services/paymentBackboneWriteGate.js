import { ENV } from "../env.js";

export function isPaymentBackboneWriteEnabled() {
  return !!ENV.PAYMENT_BACKBONE_ENABLED;
}

export function assertPaymentBackboneWriteEnabled() {
  if (isPaymentBackboneWriteEnabled()) return true;
  const error = new Error("Aktif ödeme kapalı. Bu ekran ödeme başlatmaz.");
  error.code = "PAYMENT_BACKBONE_WRITE_DISABLED";
  error.status = 403;
  throw error;
}
