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

export default function GpsFollowLayer({ vehicleId = 1, pollMs = 5000 }) {
  const map = useMap();
  const [follow, setFollow] = useState(true);
  const followRef = useRef(true);
  const [last, setLast] = useState(null);
  const lastPosRef = useRef(null);
  const firstFixRef = useRef(true);

  useEffect(() => { followRef.current = follow; }, [follow]);

  // Drag/Zoom => follow OFF
  useEffect(() => {
    const off = () => {
      if (followRef.current) {
        setFollow(false);
        toast("Drag/Zoom yaptin: follow kapandi", { id: "follow-off" });
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
        const r = await fetch(`/api/gps/last?vehicleId=${vehicleId}`);
        const j = await r.json();
        if (!alive) return;
        if (j && j.ok) setLast(j.last || null);
      } catch (_) {}
      if (alive) t = setTimeout(run, pollMs);
    };

    run();
    return () => { alive = false; if (t) clearTimeout(t); };
  }, [vehicleId, pollMs]);

  const pos = useMemo(() => {
    const lat = toNum(last?.lat);
    const lon = toNum(last?.lon);
    if (lat === null || lon === null) return null;
    return [lat, lon];
  }, [last]);

  const heading = useMemo(() => {
    const h = toNum(last?.heading);
    return h === null ? 0 : h;
  }, [last]);

  useEffect(() => {
    if (!pos) return;
    lastPosRef.current = pos;
    if (!followRef.current) return;

    const z = firstFixRef.current ? 16 : map.getZoom();
    map.setView(pos, z, { animate: true });
    firstFixRef.current = false;
  }, [pos, map]);

  const icon = useMemo(() => new L.DivIcon({
    className: "veh-icon",
    html: `
      <div style="position:relative;width:22px;height:22px;">
        <div style="
          position:absolute;inset:0;border-radius:999px;
          background:#111;border:2px solid #fff;
          box-shadow:0 0 0 3px rgba(0,0,0,.12);
        "></div>
        <div style="
          position:absolute;left:50%;top:50%;
          width:0;height:0;
          border-left:5px solid transparent;
          border-right:5px solid transparent;
          border-bottom:10px solid #fff;
          transform: translate(-50%,-70%) rotate(${heading}deg);
          transform-origin: 50% 80%;
          opacity:.95;
        "></div>
      </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  }), [heading]);

  const enableFollow = () => {
    setFollow(true);
    toast("Follow acildi", { id: "follow-on" });
    if (lastPosRef.current) map.setView(lastPosRef.current, map.getZoom(), { animate: true });
  };

  return (
    <>
      <Toaster position="top-center" />
      {pos && (
        <Marker position={pos} icon={icon}>
          <Popup>
            <div style={{ fontSize: 12 }}>
              <div><b>Arac</b> #{vehicleId}</div>
              <div>lat: {pos[0]}</div>
              <div>lon: {pos[1]}</div>
              <div>heading: {heading}</div>
              {last?.recordedAt && <div>ts: {String(last.recordedAt)}</div>}
            </div>
          </Popup>
        </Marker>
      )}

      {!follow && (
        <div style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 2000,
          background: "white",
          padding: "8px 10px",
          borderRadius: 10,
          boxShadow: "0 6px 24px rgba(0,0,0,.12)"
        }}>
          <button onClick={enableFollow} style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
            fontWeight: 600
          }}>
            Takip Ac
          </button>
        </div>
      )}
    </>
  );
}
