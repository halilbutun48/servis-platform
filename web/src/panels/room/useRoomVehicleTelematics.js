import { useEffect, useMemo, useRef, useState } from "react";

export function useRoomVehicleTelematics({
  tab,
  focusVehicleId,
  token,
  apiFn,
  normalizeList,
  pickErr,
  setErr,
  showToast,
}) {
  const [deviceItems, setDeviceItems] = useState([]);
  const [deviceLoaded, setDeviceLoaded] = useState(false);
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [deviceSaving, setDeviceSaving] = useState(false);
  const [deviceDrafts, setDeviceDrafts] = useState({});
  const [deviceForm, setDeviceForm] = useState({ vendor: "GENERIC", serial: "", label: "" });
  const [tokenReveal, setTokenReveal] = useState(null);

  function makeDeviceDrafts(rows) {
    const next = {};
    (Array.isArray(rows) ? rows : []).forEach((x) => {
      next[x.id] = {
        label: x?.label || "",
        status: x?.status || "ACTIVE",
      };
    });
    return next;
  }

  async function loadDevices({ silent = false } = {}) {
    if (!silent) setDeviceBusy(true);
    try {
      const resp = await apiFn("/api/telematics/devices", { token });
      const rows = normalizeList(resp);
      setDeviceItems(rows);
      setDeviceDrafts(makeDeviceDrafts(rows));
      setDeviceLoaded(true);
    } catch (e) {
      const { msg } = pickErr(e);
      setErr(String(msg || "Telematics cihaz listesi alınamadı"));
      showToast("Telematics cihaz listesi alınamadı", "err");
    } finally {
      if (!silent) setDeviceBusy(false);
    }
  }

  const loadDevicesRef = useRef(loadDevices);
  loadDevicesRef.current = loadDevices;

  useEffect(() => {
    if (tab !== "telematics") return;
    if (deviceLoaded) return;
    loadDevicesRef.current();
  }, [tab, deviceLoaded]);

  async function createDevice(e) {
    e.preventDefault();
    if (!focusVehicleId) {
      setErr("Telematics için önce araç seçmelisin.");
      return;
    }
    setDeviceSaving(true);
    setErr("");
    try {
      const resp = await apiFn("/api/telematics/devices", {
        method: "POST",
        token,
        body: {
          vehicleId: Number(focusVehicleId),
          vendor: String(deviceForm.vendor || "GENERIC").trim().toUpperCase(),
          serial: String(deviceForm.serial || "").trim(),
          label: String(deviceForm.label || "").trim() || undefined,
        },
      });
      setTokenReveal({
        kind: "create",
        id: resp?.id,
        serial: resp?.serial,
        token: resp?.token || "",
      });
      setDeviceForm((p) => ({ ...p, serial: "", label: "" }));
      showToast("Telematics cihazı eklendi");
      await loadDevices({ silent: true });
    } catch (e) {
      const { msg } = pickErr(e);
      setErr(String(msg || "Telematics cihazı eklenemedi"));
      showToast("Telematics cihazı eklenemedi", "err");
    } finally {
      setDeviceSaving(false);
    }
  }

  async function saveDevice(id) {
    const draft = deviceDrafts?.[id] || {};
    setDeviceSaving(true);
    setErr("");
    try {
      await apiFn(`/api/telematics/devices/${id}`, {
        method: "PATCH",
        token,
        body: {
          label: draft.label,
          status: draft.status,
        },
      });
      showToast("Telematics cihazı güncellendi");
      await loadDevices({ silent: true });
    } catch (e) {
      const { msg } = pickErr(e);
      setErr(String(msg || "Telematics cihazı güncellenemedi"));
      showToast("Telematics cihazı güncellenemedi", "err");
    } finally {
      setDeviceSaving(false);
    }
  }

  async function rotateDeviceToken(id) {
    setDeviceSaving(true);
    setErr("");
    try {
      const resp = await apiFn(`/api/telematics/devices/${id}/rotate`, {
        method: "POST",
        token,
        body: {},
      });
      const found = (Array.isArray(deviceItems) ? deviceItems : []).find((x) => Number(x.id) === Number(id));
      setTokenReveal({
        kind: "rotate",
        id,
        serial: found?.serial || "",
        token: resp?.token || "",
      });
      showToast("Device token yenilendi", "warn");
      await loadDevices({ silent: true });
    } catch (e) {
      const { msg } = pickErr(e);
      setErr(String(msg || "Token rotate başarısız"));
      showToast("Token rotate başarısız", "err");
    } finally {
      setDeviceSaving(false);
    }
  }

  async function copyToken(value) {
    try {
      await navigator.clipboard.writeText(String(value || ""));
      showToast("Token panoya kopyalandı");
    } catch {
      showToast("Token kopyalanamadı", "warn");
    }
  }

  const telematicsRows = useMemo(
    () => (Array.isArray(deviceItems) ? deviceItems.filter((x) => Number(x?.vehicleId) === Number(focusVehicleId)) : []),
    [deviceItems, focusVehicleId]
  );

  const telematicsCounts = useMemo(() => {
    const out = {};
    (Array.isArray(deviceItems) ? deviceItems : []).forEach((x) => {
      const key = Number(x?.vehicleId || 0);
      if (!key) return;
      out[key] = (out[key] || 0) + 1;
    });
    return out;
  }, [deviceItems]);

  return {
    deviceItems,
    deviceBusy,
    deviceSaving,
    deviceDrafts,
    setDeviceDrafts,
    deviceForm,
    setDeviceForm,
    tokenReveal,
    setTokenReveal,
    telematicsRows,
    telematicsCounts,
    createDevice,
    saveDevice,
    rotateDeviceToken,
    copyToken,
    loadDevices,
  };
}
