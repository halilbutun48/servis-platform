import { getApiErrorMessage } from "../../utils/apiContract.js";

export function firstPinChangeErrorMessage(error) {
  return getApiErrorMessage(error, "İşlem başarısız");
}
