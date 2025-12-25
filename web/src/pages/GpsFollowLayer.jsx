import { useEffect, useMemo, useRef, useState } from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import toast, { Toaster } from "react-hot-toast";
import L from "leaflet";

const toNum = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  const n = Number(String(v).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export default function GpsFollowLayer({ vehicleId = 1, pollMs = 15000 }) {
  const map = useMap();
  const [follow, setFollow] = useState(true);
  const followRef = useRef(true);

  const [last, setLast] = useState(null);
  const lastPosRef = useRef(null);
  const firstFixRef = useRef(true);
  const warnedRef = useRef(false);

  useEffect(() => {
    followRef.current = follow;
  }, [follow]);

  // User drag/zoom => follow OFF
  useEffect(() => {
    const off = () => {
      if (followRef.current) {
        setFollow(false);
        if (!warnedRef.current) {
          warnedRef.current = true;
          toast("Drag/Zoom: Follow OFF", { id: "follow-off" });
          setTimeout(() => (warnedRef.current = false), 1200);
        }
      }
    };
    map.on("dragstart", off);
    map.on("zoomstart", off);
    return () => {
      map.off("dragstart", off);
      map.off("zoomstart", off);
    };
  }, [map]);

  // Poll GPS last
  useEffect(() => {
    let alive = true;
    let t = null;

    const run = async () => {
      try {
        const r = await fetch(`/api/gps/last?vehicleId=${vehicleId}`, { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        if (j && j.ok) setLast(j.last || null);
      } catch (_) {}
      if (alive) t = setTimeout(run, pollMs);
    };

    run();
    return () => {
      alive = false;
      if (t) clearTimeout(t);
    };
  }, [vehicleId, pollMs]);

  const pos = useMemo(() => {
    const lat = toNum(last && last.lat);
    const lon = toNum(last && last.lon);
    if (lat === null || lon === null) return null;
    return [lat, lon];
  }, [last]);

  // Follow ON => setView. OFF => never jump.
  useEffect(() => {
    if (!pos) return;
    lastPosRef.current = pos;
    if (!followRef.current) return;

    const z = firstFixRef.current ? 16 : map.getZoom();
    map.setView(pos, z, { animate: true });
    firstFixRef.current = false;
  }, [pos, map]);

  const icon = useMemo(
    () =>
      new L.DivIcon({
        className: "veh-icon",
        html: `
          <div style="
            width:18px;height:18px;border-radius:999px;
            background:#111; box-shadow:0 0 0 3px rgba(0,0,0,.15);
            border:2px solid #fff;
          "></div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
    []
  );

  const enableFollow = () => {
    setFollow(true);
    toast("Follow ON", { id: "follow-on" });
    if (lastPosRef.current) map.setView(lastPosRef.current, map.getZoom(), { animate: true });
  };

  return (
    <>
      <Toaster position="top-center" />

      {pos && (
        <Marker position={pos} icon={icon}>
          <Popup>
            <div style={{ fontSize: 12 }}>
              <div>
                <b>Arac</b> #{vehicleId}
              </div>
              <div>lat: {pos[0]}</div>
              <div>lon: {pos[1]}</div>
              {last && last.recordedAt && <div>ts: {String(last.recordedAt)}</div>}
            </div>
          </Popup>
        </Marker>
      )}

      {!follow && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 2000,
            background: "white",
            padding: "8px 10px",
            borderRadius: 10,
            boxShadow: "0 6px 24px rgba(0,0,0,.12)",
          }}
        >
          <button
            onClick={enableFollow}
            style={{
              border: "1px solid #ddd",
              background: "white",
              borderRadius: 8,
              padding: "6px 10px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Takip Ac
          </button>
        </div>
      )}
    </>
  );
}
