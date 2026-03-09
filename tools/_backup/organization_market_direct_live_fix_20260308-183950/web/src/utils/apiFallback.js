// web/src/utils/apiFallback.js
/**
 * Call a function that uses web/src/api.js and fallback ONLY when HTTP status is 404.
 * This is required for "soft switch": endpoint missing in dev => localStorage fallback.
 */
export async function apiOr404Fallback(apiCall, fallbackCall) {
  try {
    return await apiCall();
  } catch (e) {
    const status = e?.status;
    if (status === 404) return await fallbackCall();
    throw e;
  }
}
