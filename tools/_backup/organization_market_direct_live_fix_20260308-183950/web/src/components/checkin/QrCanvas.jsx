import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

export default function QrCanvas({ value, size = 220 }) {
  const canvasRef = useRef(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let off = false;
    async function run() {
      if (!canvasRef.current || !value) return;
      try {
        await QRCode.toCanvas(canvasRef.current, String(value), {
          width: size,
          margin: 1,
          errorCorrectionLevel: "M",
        });
        if (!off) setErr("");
      } catch (e) {
        if (!off) setErr(String(e?.message || e));
      }
    }
    run();
    return () => {
      off = true;
    };
  }, [value, size]);

  if (!value) return <div className="muted">Henüz QR içeriği yok.</div>;
  if (err) return <div className="muted">QR üretilemedi: {err}</div>;

  return (
    <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
      <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 10, background: "#fff", padding: 8 }} />
      <div className="muted" style={{ textAlign: "center", fontSize: 12 }}>
        Sürücü kamera ile bu QR’ı okutabilir. İçerik: {String(value).slice(0, 18)}…
      </div>
    </div>
  );
}
