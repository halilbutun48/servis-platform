import { useEffect, useMemo, useRef, useState } from "react";

function stopStream(ref) {
  const stream = ref.current;
  if (!stream) return;
  try {
    for (const tr of stream.getTracks?.() || []) tr.stop();
  } catch {}
  ref.current = null;
}

function supportReason() {
  if (typeof window === "undefined") return "Bu ortam tarayıcı değil.";
  if (!window.isSecureContext && window.location?.hostname !== "127.0.0.1" && window.location?.hostname !== "localhost") {
    return "Kamera taraması için HTTPS veya localhost gerekir.";
  }
  if (!navigator?.mediaDevices?.getUserMedia) return "Tarayıcı kamera erişimi sunmuyor.";
  if (!window.BarcodeDetector) return "Bu tarayıcı BarcodeDetector / kamera QR taramasını desteklemiyor.";
  return "";
}

export default function CameraQrScannerCard({ open, onClose, onDetected }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("Hazır");

  const unsupportedReason = useMemo(() => supportReason(), []);
  const supported = !unsupportedReason;

  useEffect(() => {
    if (!open) return undefined;
    let closed = false;

    async function start() {
      setErr("");
      if (!supported) {
        setStatus("Fallback mod");
        setErr(`${unsupportedReason} Manuel token girişi ile devam edebilirsin.`);
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
  }, [open, onDetected, supported, unsupportedReason]);

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
        {supported ? (
          <video ref={videoRef} muted playsInline style={{ width: "100%", minHeight: 280, background: "#050913", borderRadius: 14, border: "1px solid #2b3d64", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", minHeight: 220, background: "#050913", borderRadius: 14, border: "1px dashed #7f8ca8", padding: 18, display: "grid", alignContent: "center", gap: 8 }}>
            <div className="title" style={{ fontSize: 18 }}>Bu cihazda kamera scan fallback modda</div>
            <div className="muted">En stabil kombinasyon: Mobil Chrome + HTTPS veya localhost + arka kamera izni.</div>
            <div className="muted">Masaüstü tarayıcıda destek yoksa token alanına yapıştırıp manuel okutma ile devam et.</div>
          </div>
        )}
        <div className="muted">
          İpucu: Mobil Chrome + HTTPS/localhost ortamında arka kamerayla en stabil çalışır.
        </div>
      </div>
    </div>
  );
}
