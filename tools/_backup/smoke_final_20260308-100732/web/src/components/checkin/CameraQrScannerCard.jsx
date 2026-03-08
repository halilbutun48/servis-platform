import { useEffect, useMemo, useRef, useState } from "react";

function stopStream(ref) {
  const stream = ref.current;
  if (!stream) return;
  try {
    for (const tr of stream.getTracks?.() || []) tr.stop();
  } catch {}
  ref.current = null;
}

export default function CameraQrScannerCard({ open, onClose, onDetected }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("Hazır");

  const supported = useMemo(() => {
    return typeof window !== "undefined" && !!window.BarcodeDetector && !!navigator?.mediaDevices?.getUserMedia;
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    let closed = false;

    async function start() {
      setErr("");
      if (!supported) {
        setErr("Bu tarayıcı/cihaz kamera QR taramasını desteklemiyor. Manuel token girişi ile devam edebilirsin.");
        return;
      }

      try {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (closed) {
          stopStream({ current: stream });
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setStatus("QR kadraja girdiğinde otomatik okutulur.");

        const tick = async () => {
          if (closed) return;
          try {
            if (video.readyState >= 2) {
              const found = await detector.detect(video);
              const raw = found?.[0]?.rawValue ? String(found[0].rawValue) : "";
              if (raw) {
                setStatus("QR okundu, gönderiliyor…");
                onDetected?.(raw);
                return;
              }
            }
          } catch (e) {
            setErr(String(e?.message || e));
          }
          rafRef.current = window.requestAnimationFrame(tick);
        };

        rafRef.current = window.requestAnimationFrame(tick);
      } catch (e) {
        setErr(String(e?.message || e));
      }
    }

    start();

    return () => {
      closed = true;
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      stopStream(streamRef);
    };
  }, [open, onDetected, supported]);

  if (!open) return null;

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="row" style={{ justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0 }}>Kamera ile QR okut</h3>
          <div className="muted" style={{ marginTop: 6 }}>{status}</div>
        </div>
        <button type="button" className="secondary" onClick={onClose}>Kapat</button>
      </div>

      {err ? <div className="card err" style={{ marginTop: 12 }}>{err}</div> : null}

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <video ref={videoRef} muted playsInline style={{ width: "100%", minHeight: 280, background: "#050913", borderRadius: 14, border: "1px solid #2b3d64", objectFit: "cover" }} />
        <div className="muted">
          İpucu: Mobil Chrome + HTTPS/localhost ortamında arka kamerayla en stabil çalışır.
        </div>
      </div>
    </div>
  );
}
