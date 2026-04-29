import { api, getToken } from "../../api";
import { promptMaybe, stripHtmlNoise } from "./commercialCorePanelShared";
import { buildPaymentSourceQuery, downloadWithToken } from "./commercialCorePanelUtils";

export function createCommercialCorePanelActions({
  load,
  setBusyKey,
  setErr,
  setOkMsg,
  setAccountForm,
  setRoomForm,
  globalForm,
  roomForm,
  accountForm,
  paymentSourceFilters,
}) {
  async function saveGlobal() {
    setBusyKey("global");
    setErr("");
    setOkMsg("");
    try {
      await api.post("/api/commercial-core/payment-backbone/settings/global", {
        paymentMode: globalForm.paymentMode,
        commissionBps: Number(globalForm.commissionBps || 0),
        note: globalForm.note || "",
      });
      setOkMsg("Global ticari ayar kaydedildi.");
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusyKey("");
    }
  }

  async function saveRoomOverride() {
    setBusyKey("room");
    setErr("");
    setOkMsg("");
    try {
      await api.post("/api/commercial-core/payment-backbone/settings/room", {
        roomId: Number(roomForm.roomId || 0),
        paymentMode: roomForm.paymentMode,
        commissionBps: Number(roomForm.commissionBps || 0),
        note: roomForm.note || "",
      });
      setOkMsg("Oda bazlı ticari ayar kaydedildi.");
      setRoomForm({ roomId: "", paymentMode: globalForm.paymentMode || "OFF", commissionBps: Number(globalForm.commissionBps || 0), note: "" });
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusyKey("");
    }
  }

  async function disableRoomOverride(roomId) {
    if (!roomId) return;
    setBusyKey(`disable:${roomId}`);
    setErr("");
    setOkMsg("");
    try {
      await api.del(`/api/commercial-core/payment-backbone/settings/room/${roomId}`);
      setOkMsg("Oda override kapatıldı.");
      await load();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusyKey("");
    }
  }

  async function activatePilot(sourceId) {
    if (!sourceId) return;
    setBusyKey(`pilot:on:${sourceId}`);
    setErr("");
    setOkMsg("");
    try {
      await api.post("/api/commercial-core/payment-backbone/pilot/activate", { sourceIds: [Number(sourceId)] });
      setOkMsg("Opsiyonel ödeme pilotu READY durumuna alındı.");
      await load();
    } catch (e) {
      setErr(stripHtmlNoise(e?.message || String(e)));
    } finally {
      setBusyKey("");
    }
  }

  async function deactivatePilot(sourceId) {
    if (!sourceId) return;
    setBusyKey(`pilot:off:${sourceId}`);
    setErr("");
    setOkMsg("");
    try {
      await api.post("/api/commercial-core/payment-backbone/pilot/deactivate", { sourceIds: [Number(sourceId)] });
      setOkMsg("Opsiyonel ödeme pilotu DORMANT durumuna alındı.");
      await load();
    } catch (e) {
      setErr(stripHtmlNoise(e?.message || String(e)));
    } finally {
      setBusyKey("");
    }
  }

  async function activateRequired(sourceId) {
    if (!sourceId) return;
    setBusyKey(`required:on:${sourceId}`);
    setErr("");
    setOkMsg("");
    try {
      await api.post("/api/commercial-core/payment-backbone/required/activate", { sourceIds: [Number(sourceId)] });
      setOkMsg("Zorunlu ödeme rollout'u ACTIVE durumuna alındı.");
      await load();
    } catch (e) {
      setErr(stripHtmlNoise(e?.message || String(e)));
    } finally {
      setBusyKey("");
    }
  }

  async function deactivateRequired(sourceId) {
    if (!sourceId) return;
    setBusyKey(`required:off:${sourceId}`);
    setErr("");
    setOkMsg("");
    try {
      await api.post("/api/commercial-core/payment-backbone/required/deactivate", { sourceIds: [Number(sourceId)] });
      setOkMsg("Zorunlu ödeme rollout'u DISABLED durumuna alındı.");
      await load();
    } catch (e) {
      setErr(stripHtmlNoise(e?.message || String(e)));
    } finally {
      setBusyKey("");
    }
  }

  function applyAccountCandidate(item) {
    if (!item) return;
    setAccountForm({
      ownerType: item.ownerType || "COMPANY",
      ownerId: String(item.ownerId || ""),
      providerKey: item?.account?.providerKey || "DORMANT",
      status: item?.account?.status || (item?.accountReady ? "ACTIVE" : "INACTIVE"),
      label: item?.account?.label || item?.ownerName || "",
      maskedIban: item?.account?.maskedIban || "",
      accountRef: item?.account?.accountRef || "",
      note: item?.account?.note || "",
    });
  }

  async function savePaymentAccount() {
    setBusyKey("account");
    setErr("");
    setOkMsg("");
    try {
      await api.post("/api/commercial-core/payment-backbone/accounts/upsert", {
        ownerType: accountForm.ownerType,
        companyId: accountForm.ownerType === "COMPANY" ? Number(accountForm.ownerId || 0) : null,
        roomId: accountForm.ownerType === "ROOM" ? Number(accountForm.ownerId || 0) : null,
        providerKey: accountForm.providerKey || "DORMANT",
        status: accountForm.status || "INACTIVE",
        label: accountForm.label || "",
        maskedIban: accountForm.maskedIban || "",
        accountRef: accountForm.accountRef || "",
        note: accountForm.note || "",
      });
      setOkMsg("Ödeme hesabı metadata kaydedildi.");
      await load();
    } catch (e) {
      setErr(stripHtmlNoise(e?.message || String(e)));
    } finally {
      setBusyKey("");
    }
  }

  async function settlementAction(path, entryId, successMessage, busyToken, extra = {}) {
    if (!entryId) return;
    setBusyKey(busyToken);
    setErr("");
    setOkMsg("");
    try {
      await api.post(path, { entryIds: [Number(entryId)], ...extra });
      setOkMsg(successMessage);
      await load();
    } catch (e) {
      setErr(stripHtmlNoise(e?.message || String(e)));
    } finally {
      setBusyKey("");
    }
  }

  async function markSettlementPlanned(item) {
    const dueAt = promptMaybe("İsteğe bağlı plan tarihi gir (örn: 2026-04-08T10:00:00). Boş bırakabilirsin.", item?.dueAt || "");
    const note = promptMaybe("İsteğe bağlı plan notu", item?.note || "");
    return settlementAction(
      "/api/commercial-core/payment-backbone/settlement/entries/plan",
      item?.entryId,
      "Settlement satırı PLANNED durumuna alındı.",
      `settlement:plan:${item?.entryId}`,
      { dueAt: dueAt || null, note: note || null },
    );
  }

  async function markSettlementReady(item) {
    const note = promptMaybe("İsteğe bağlı READY notu", item?.note || "");
    return settlementAction(
      "/api/commercial-core/payment-backbone/settlement/entries/ready",
      item?.entryId,
      "Settlement satırı READY durumuna alındı.",
      `settlement:ready:${item?.entryId}`,
      { note: note || null },
    );
  }

  async function markSettlementExecuted(item) {
    const providerRef = promptMaybe("Provider ref / manuel referans", item?.providerRef || `MANUAL:${item?.entryId}`);
    const note = promptMaybe("İsteğe bağlı execute notu", item?.note || "");
    return settlementAction(
      "/api/commercial-core/payment-backbone/settlement/entries/execute",
      item?.entryId,
      "Settlement satırı EXECUTED durumuna alındı.",
      `settlement:execute:${item?.entryId}`,
      { providerRef: providerRef || `MANUAL:${item?.entryId}`, note: note || null },
    );
  }

  async function markSettlementCancelled(item) {
    const note = promptMaybe("İsteğe bağlı iptal notu", item?.note || "");
    return settlementAction(
      "/api/commercial-core/payment-backbone/settlement/entries/cancel",
      item?.entryId,
      "Settlement satırı CANCELLED durumuna alındı.",
      `settlement:cancel:${item?.entryId}`,
      { note: note || null },
    );
  }

  async function saveReconciliation(item, status) {
    if (!item?.entryId) return;
    setBusyKey(`recon:${status}:${item.entryId}`);
    setErr("");
    setOkMsg("");
    try {
      const providerRef = promptMaybe("Provider ref / banka referansı", item?.providerRef || item?.reconciliationExternalRef || "");
      const externalRef = promptMaybe("Harici mutabakat referansı", item?.reconciliationExternalRef || providerRef || "");
      const note = promptMaybe("Mutabakat notu", item?.reconciliationNote || "");
      const expectedAmount = item?.reconciliationExpectedAmount ?? item?.amount ?? 0;
      const amountSeed = item?.reconciliationReceivedAmount ?? expectedAmount;
      const receivedAmountRaw = promptMaybe("Gerçekte görülen tutar", String(amountSeed));
      const receivedAmount = Number(receivedAmountRaw || amountSeed || 0);
      await api.post("/api/commercial-core/payment-backbone/reconciliation/records/upsert", {
        entryId: Number(item.entryId),
        status,
        providerRef: providerRef || null,
        externalRef: externalRef || null,
        note: note || null,
        expectedAmount: Number(expectedAmount || 0),
        receivedAmount: Number.isFinite(receivedAmount) ? receivedAmount : Number(expectedAmount || 0),
      });
      setOkMsg("Settlement mutabakat kaydı güncellendi.");
      await load();
    } catch (e) {
      setErr(stripHtmlNoise(e?.message || String(e)));
    } finally {
      setBusyKey("");
    }
  }

  async function refreshPaymentSources() {
    setBusyKey("payment-sources");
    setErr("");
    setOkMsg("");
    try {
      await load();
      setOkMsg("Ödeme kaynakları yenilendi.");
    } catch (e) {
      setErr(stripHtmlNoise(e?.message || String(e)));
    } finally {
      setBusyKey("");
    }
  }

  async function exportPaymentSourcesCsv() {
    setBusyKey("payment-sources-export");
    setErr("");
    setOkMsg("");
    try {
      const qs = buildPaymentSourceQuery(paymentSourceFilters, 1000);
      await downloadWithToken(`/api/commercial-core/payment-backbone/sources/export.csv?${qs.toString()}`, getToken(), "payment_sources.csv");
      setOkMsg("Ödeme kaynakları CSV olarak indirildi.");
    } catch (e) {
      setErr(stripHtmlNoise(e?.message || String(e)));
    } finally {
      setBusyKey("");
    }
  }

  async function exportSettlementLedgerCsv() {
    setBusyKey("payment-sources-ledger-export");
    setErr("");
    setOkMsg("");
    try {
      const qs = buildPaymentSourceQuery(paymentSourceFilters, 1000);
      await downloadWithToken(`/api/commercial-core/payment-backbone/settlement/ledger/export.csv?${qs.toString()}`, getToken(), "settlement_ledger.csv");
      setOkMsg("Detaylı muhasebe CSV indirildi.");
    } catch (e) {
      setErr(stripHtmlNoise(e?.message || String(e)));
    } finally {
      setBusyKey("");
    }
  }

  function applyRoom(room) {
    setRoomForm((prev) => ({
      ...prev,
      roomId: String(room?.id || ""),
      paymentMode: prev.paymentMode || globalForm.paymentMode || "OFF",
      commissionBps: Number(prev.commissionBps || globalForm.commissionBps || 0),
    }));
  }

  return {
    saveGlobal,
    saveRoomOverride,
    disableRoomOverride,
    activatePilot,
    deactivatePilot,
    activateRequired,
    deactivateRequired,
    applyAccountCandidate,
    savePaymentAccount,
    markSettlementPlanned,
    markSettlementReady,
    markSettlementExecuted,
    markSettlementCancelled,
    saveReconciliation,
    refreshPaymentSources,
    exportPaymentSourcesCsv,
    exportSettlementLedgerCsv,
    applyRoom,
  };
}
