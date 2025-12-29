import { TR } from "./tr";

export function t(key) {
  return TR[key] ?? key;
}
