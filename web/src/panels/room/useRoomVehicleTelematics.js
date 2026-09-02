import { useEffect, useMemo, useRef, useState } from "react";
import { humanizeUserFacingText } from "../../utils/terminology";

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
  const [deviceForm, setDeviceForm] = useState({
    vendor: "ARVENTO",
    connectionType: "Düzenli veri sorgulama",
    plate: "",
    imei: "",
    deviceId: "",
    externalDeviceId: "",
    serial: "",
    label: "",
  });

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
      setErr(humanizeUserFacingText(msg, "Konum cihazı listesi alınamadı"));
      showToast("Konum cihazı listesi alınamadı", "err");
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
      setErr("Konum cihazı için önce araç seçmelisin.");
      return;
    }
    setDeviceSaving(true);
    setErr("");
    try {
      await apiFn("/api/telematics/devices", {
        method: "POST",
        token,
        body: {
          vehicleId: Number(focusVehicleId),
          vendor: String(deviceForm.vendor || "ARVENTO").trim().toUpperCase(),
          serial: String(deviceForm.serial || deviceForm.deviceId || deviceForm.imei || deviceForm.externalDeviceId || "").trim(),
          label: String(deviceForm.label || "").trim() || undefined,
        },
      });
      setDeviceForm((p) => ({
        ...p,
        plate: "",
        imei: "",
        deviceId: "",
        externalDeviceId: "",
        serial: "",
        label: "",
      }));
      showToast("Eşleştirme hazırlığı kaydedildi");
      await loadDevices({ silent: true });
    } catch (e) {
      const { msg } = pickErr(e);
      setErr(humanizeUserFacingText(msg, "Eşleştirme hazırlığı kaydedilemedi"));
      showToast("Eşleştirme hazırlığı kaydedilemedi", "err");
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
      showToast("Eşleştirme bilgisi güncellendi");
      await loadDevices({ silent: true });
    } catch (e) {
      const { msg } = pickErr(e);
      setErr(humanizeUserFacingText(msg, "Eşleştirme bilgisi güncellenemedi"));
      showToast("Eşleştirme bilgisi güncellenemedi", "err");
    } finally {
      setDeviceSaving(false);
    }
  }

  async function rotateDeviceToken(id) {
    setDeviceSaving(true);
    setErr("");
    try {
      await apiFn(`/api/telematics/devices/${id}/rotate`, {
        method: "POST",
        token,
        body: {},
      });
      showToast("İnceleme için hazırlandı", "warn");
      await loadDevices({ silent: true });
    } catch (e) {
      const { msg } = pickErr(e);
      setErr(humanizeUserFacingText(msg, "İnceleme için hazırlama başarısız"));
      showToast("İnceleme için hazırlama başarısız", "err");
    } finally {
      setDeviceSaving(false);
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
    telematicsRows,
    telematicsCounts,
    createDevice,
    saveDevice,
    rotateDeviceToken,
    loadDevices,
  };
}
