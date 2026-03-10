import { useEffect, useMemo, useRef, useState } from "react";
import { googleLogin } from "../api";

const SCRIPT_ID = "google-gsi-client";
const DEVICE_KEY = "psv1_google_device_id";

function getOrCreateBrowserDeviceId() {
  try {
    const existing = String(localStorage.getItem(DEVICE_KEY) || "").trim();
    if (existing) return existing;
    const next = `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_KEY, next);
    return next;
  } catch {
    return `web-${Date.now()}-fallback`;
  }
}

function loadScript() {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      if (window.google?.accounts?.id) return resolve(window.google);
      existing.addEventListener("load", () => resolve(window.google), { once: true });
      existing.addEventListener("error", () => reject(new Error("GIS script yüklenemedi")), { once: true });
      return;
    }

    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(window.google);
    s.onerror = () => reject(new Error("GIS script yüklenemedi"));
    document.head.appendChild(s);
  });
}

export default function GoogleLoginButton({ inviteToken = "", onSuccess, onError, disabled = false, text = "signin_with", width = 320 }) {
  const clientId = useMemo(() => String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim(), []);
  const boxRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState("");

  useEffect(() => {
    let off = false;
    setReady(false);
    setLocalErr("");

    if (!clientId) {
      setLocalErr("Google client id tanımlı değil.");
      return () => {};
    }

    loadScript()
      .then((google) => {
        if (off) return;
        const api = google?.accounts?.id;
        if (!api || !boxRef.current) throw new Error("Google Identity API hazır değil");
        api.initialize({
          client_id: clientId,
          callback: async (resp) => {
            const credential = String(resp?.credential || "").trim();
            if (!credential) {
              const err = new Error("Google credential alınamadı");
              setLocalErr(err.message);
              onError?.(err);
              return;
            }
            setBusy(true);
            setLocalErr("");
            try {
              const result = await googleLogin(credential, { inviteToken: inviteToken || undefined, deviceId: getOrCreateBrowserDeviceId() });
              onSuccess?.(result);
            } catch (e) {
              setLocalErr(String(e?.message || e));
              onError?.(e);
            } finally {
              setBusy(false);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          ux_mode: "popup",
        });
        boxRef.current.innerHTML = "";
        api.renderButton(boxRef.current, {
          theme: "outline",
          size: "large",
          text,
          shape: "rectangular",
          width,
        });
        setReady(true);
      })
      .catch((e) => {
        if (off) return;
        const msg = String(e?.message || e);
        setLocalErr(msg);
        onError?.(e);
      });

    return () => {
      off = true;
    };
  }, [clientId, inviteToken, onError, onSuccess, text, width]);

  return (
    <div>
      <div ref={boxRef} style={{ opacity: disabled || busy ? 0.55 : 1, pointerEvents: disabled || busy ? "none" : "auto" }} />
      {!ready && !localErr ? <div className="muted" style={{ marginTop: 8 }}>Google giriş yükleniyor...</div> : null}
      {busy ? <div className="muted" style={{ marginTop: 8 }}>Google hesabı doğrulanıyor...</div> : null}
      {localErr ? <div className="muted" style={{ color: "crimson", marginTop: 8 }}>{localErr}</div> : null}
    </div>
  );
}
