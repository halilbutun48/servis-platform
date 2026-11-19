import { notificationKindLabel } from "../../utils/notificationV1.js";

export function personelNotificationLabel(value) {
  return notificationKindLabel(value) || "Bildirim";
}
