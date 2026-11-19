export function buildSchoolParentCopilotSelection({ selectedStudent, items = [], companyId } = {}) {
  if (!selectedStudent?.id) return null;

  const selectedId = Number(selectedStudent.id);
  const selectedName = selectedStudent.fullName || `#${selectedId}`;
  const selectedItems = items.filter((item) => Number(item?.childPersonelId || item?.child?.id) === selectedId);
  const revokedCount = selectedItems.filter((item) => String(item?.status || "").toUpperCase() === "REVOKED").length;
  const activeCount = selectedItems.filter((item) => String(item?.status || "").toUpperCase() === "ACTIVE").length;
  const latestStatus = String(selectedItems[0]?.status || "NO_ACCESS_HISTORY").toUpperCase();
  const historyText = selectedItems.length
    ? `${selectedItems.length} kayıt, ${revokedCount} iptal edilmiş, ${activeCount} aktif`
    : "Erişim geçmişi boş";
  const summary = `Öğrenci ${selectedName} • ${historyText}`;

  return {
    scopeKey: "/school/parents",
    entityType: "student",
    entityId: selectedId,
    selectedRecordType: "student",
    selectedRecordId: selectedId,
    label: selectedName,
    selectedRecordLabel: selectedName,
    selectedRecordStatus: latestStatus,
    selectedRecordSummary: summary,
    facts: {
      screenType: "SCHOOL_PARENTS",
      selectedRecordType: "student",
      selectedRecordId: selectedId,
      selectedRecordLabel: selectedName,
      selectedRecordStatus: latestStatus,
      selectedRecordSummary: summary,
      accessHistoryCount: selectedItems.length,
      revokedAccessCount: revokedCount,
      activeAccessCount: activeCount,
      accessHistory: selectedItems.slice(0, 10).map((item) => ({
        id: Number(item?.id || 0) || 0,
        status: String(item?.status || "").toUpperCase(),
        createdAt: item?.createdAt || null,
        expiresAt: item?.expiresAt || null,
      })),
      tenantScope: Number(companyId || 0) || undefined,
      privacyBoundary: "Yalnız yetkili okulun seçili öğrencisine ait erişim durumu; token, PIN, bağlantı ve iletişim bilgisi yok.",
    },
  };
}
