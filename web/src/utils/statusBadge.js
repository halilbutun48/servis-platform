import { statusToneStyle } from "./statusPalette";

export function statusBadgeInlineStyle(value) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
    ...statusToneStyle(value),
  };
}

