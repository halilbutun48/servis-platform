import { useId } from "react";

const AVATAR_STATES = new Set([
  "idle",
  "hover",
  "listening",
  "thinking",
  "responding",
  "attention",
  "success",
  "approval-required",
]);

function normalizeState(value) {
  const state = String(value || "idle").toLowerCase();
  return AVATAR_STATES.has(state) ? state : "idle";
}

export default function SeferAbiAvatar({ state = "idle", size = 52, decorative = true }) {
  const normalizedState = normalizeState(state);
  const dimension = Number.isFinite(Number(size)) ? Number(size) : 52;
  const id = useId().replace(/:/g, "");
  const backdropId = `seferAbiBackdrop-${id}`;
  const jacketId = `seferAbiJacket-${id}`;
  const skinId = `seferAbiSkin-${id}`;
  const shirtId = `seferAbiShirt-${id}`;

  return (
    <span
      className={`seferAbiAvatar seferAbiAvatar--${normalizedState}`}
      data-mascot-persona="mature-human"
      data-sefer-abi-state={normalizedState}
      style={{ width: dimension, height: dimension }}
      aria-hidden={decorative ? "true" : undefined}
    >
      <svg viewBox="0 0 64 64" focusable="false" aria-hidden="true">
        <defs>
          <linearGradient id={backdropId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#294b7c" />
            <stop offset="0.55" stopColor="#142d55" />
            <stop offset="1" stopColor="#091a35" />
          </linearGradient>
          <linearGradient id={jacketId} x1="0" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#294d7f" />
            <stop offset="1" stopColor="#122a50" />
          </linearGradient>
          <linearGradient id={skinId} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor="#f3c09a" />
            <stop offset="1" stopColor="#c7815f" />
          </linearGradient>
          <linearGradient id={shirtId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f8fafc" />
            <stop offset="1" stopColor="#cbd5e1" />
          </linearGradient>
        </defs>

        <circle className="seferAbiAvatar__backdrop" cx="32" cy="32" r="31" fill={`url(#${backdropId})`} />
        <path className="seferAbiAvatar__halo" d="M10 27c2-11 11-19 22-19s20 8 22 19" fill="none" stroke="#e3b75b" strokeOpacity=".45" strokeWidth="1.2" />

        <g className="seferAbiAvatar__body">
          <path d="M8 64c1-12 8-19 17-21h14c9 2 16 9 17 21H8Z" fill={`url(#${jacketId})`} />
          <path d="M24 43h16l4 21H20l4-21Z" fill={`url(#${shirtId})`} />
          <path d="m28 44 4 6 4-6v20h-8V44Z" fill="#173762" />
          <path d="m30 50 2 3 2-3 1.3 14h-6.6L30 50Z" fill="#e3b75b" fillOpacity=".92" />
          <path d="M15 55c4-4 9-6 13-7M49 55c-4-4-9-6-13-7" fill="none" stroke="#416795" strokeWidth="1.15" strokeLinecap="round" />
          <circle cx="45.5" cy="57" r="2.2" fill="#e3b75b" />
          <path d="M44.2 57h2.6M45.5 55.7v2.6" stroke="#102847" strokeWidth=".65" strokeLinecap="round" />
        </g>

        <g className="seferAbiAvatar__head">
          <path d="M19.4 26.8c0-9.5 5.1-15.4 12.6-15.4 8 0 12.6 6 12.6 15.4v8.4c0 8.4-5.2 13.4-12.6 13.4-7.4 0-12.6-5-12.6-13.4v-8.4Z" fill={`url(#${skinId})`} />
          <path d="M19.8 27.2c-.8-8.8 3.5-16 12.2-16.5 7-.4 12.6 4.4 13.2 12.1-2.5-1.5-4.6-3.5-6.1-6.2-3.8 3.7-9.9 5.5-19.3 5.1v5.5Z" fill="#374151" />
          <path d="M21.3 20.7c2.6-5.3 6.3-7.7 10.8-7.8 4-.1 8.1 2.1 10.7 6.3-4.5-2.1-8.9-2.5-13.1-.9-2.8 1.1-5.5 1.9-8.4 2.4Z" fill="#4b5563" />
          <path d="M21.3 21c-1.2 2.1-1.9 4.6-1.9 7.7v4.5" fill="none" stroke="#293443" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M42.8 20.6c1.1 2.2 1.8 4.7 1.8 8v4.4" fill="none" stroke="#293443" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M23.5 29.2c2.1-1.2 4.1-1.2 6.1 0M34.4 29.2c2-1.2 4-1.2 6.1 0" fill="none" stroke="#59433d" strokeWidth="1.25" strokeLinecap="round" />
          <path d="M24.2 27.2c1.7-1 3.5-1.1 5.2-.2M34.6 27c1.7-.9 3.5-.8 5.2.2" fill="none" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" />
          <ellipse cx="27.5" cy="31.4" rx="1.65" ry="1.9" fill="#18263b" />
          <ellipse cx="36.5" cy="31.4" rx="1.65" ry="1.9" fill="#18263b" />
          <circle cx="27.1" cy="30.8" r=".55" fill="#fff" fillOpacity=".88" />
          <circle cx="36.1" cy="30.8" r=".55" fill="#fff" fillOpacity=".88" />
          <path d="M32 31.8c-.3 2.6-.7 4.2-1.4 5.1.8.6 1.7.7 2.7.2" fill="none" stroke="#ad6d55" strokeWidth=".95" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M27.4 39c2.9 1.8 6.4 1.8 9.3 0" fill="none" stroke="#713f3b" strokeWidth="1.15" strokeLinecap="round" />
          <path d="M26.2 37.4c1.1 4.6 3.1 6.9 5.8 6.9 2.8 0 4.8-2.3 5.8-6.9-1.7 1.4-3.7 2.1-5.8 2.1-2.1 0-4.1-.7-5.8-2.1Z" fill="#596170" fillOpacity=".8" />
          <path d="M29.2 42.3c1.9.8 3.7.8 5.6 0" fill="none" stroke="#e0a883" strokeWidth=".7" strokeLinecap="round" />
          <path d="M19.4 30c-1.8-.8-3.1.4-2.8 2.5.3 2.2 1.5 3.5 3 3.2M44.6 30c1.8-.8 3.1.4 2.8 2.5-.3 2.2-1.5 3.5-3 3.2" fill={`url(#${skinId})`} stroke="#b9765a" strokeWidth=".7" />
        </g>

        <path d="M25 48c2.1 1.3 4.5 2 7 2s4.9-.7 7-2" fill="none" stroke="#d8a07b" strokeWidth="1" strokeLinecap="round" />
        <path d="M24 47.5 28.2 53 32 50l3.8 3 4.2-5.5" fill="none" stroke="#e8eef8" strokeWidth="1.25" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
