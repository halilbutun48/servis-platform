export async function downloadReportWithToken({
  url,
  token,
  filenameHint = "report.csv",
  fetchImpl = globalThis.fetch,
  documentImpl = globalThis.document,
  urlImpl = globalThis.URL,
  append = (node) => documentImpl.body.appendChild(node),
  remove = (node) => node.remove(),
  click = (node) => node.click(),
} = {}) {
  const response = await fetchImpl(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text?.().catch(() => "") || "";
    throw new Error(body || `Rapor dışa aktarma başarısız (${response.status})`);
  }

  const blob = await response.blob();
  const disposition = response.headers?.get?.("content-disposition") || "";
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || filenameHint;
  const href = urlImpl.createObjectURL(blob);
  const anchor = documentImpl.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.rel = "noopener";
  append(anchor);
  click(anchor);
  remove(anchor);
  urlImpl.revokeObjectURL?.(href);
  return { filename, status: response.status };
}
