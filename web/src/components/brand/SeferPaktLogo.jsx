import { BRAND_NAME } from "../../config/brand.js";

const VARIANT_CONFIG = {
  mark: {
    src: "/seferpakt-app-icon.png",
    width: 44,
    maxWidth: 56,
  },
  compact: {
    src: "/seferpakt-lockup.png",
    width: 188,
    maxWidth: 240,
  },
  full: {
    src: "/seferpakt-lockup.png",
    width: 288,
    maxWidth: 360,
  },
  login: {
    src: "/seferpakt-lockup.png",
    width: 364,
    maxWidth: 432,
  },
};

export default function SeferPaktLogo({
  variant = "full",
  subtitle = null,
  centered = false,
  tone = "dark",
  className = "",
  size = null,
  alt = BRAND_NAME,
}) {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.full;
  const isMarkOnly = variant === "mark";
  const isCompact = variant === "compact";
  const isFull = variant === "full";
  const isLogin = variant === "login";
  const width = Number.isFinite(size) && size > 0 ? size : config.width;
  const subtitleColor = tone === "light" ? "#4d6287" : "#c9d6ee";
  const subtitleSize = isLogin ? 15 : isCompact ? 12 : isFull ? 13 : 13;
  const subtitleMaxWidth = isLogin ? 420 : isCompact ? 260 : isFull ? 300 : 300;

  return (
    <div
      className={`seferpaktLogo seferpaktLogo--${variant}${className ? ` ${className}` : ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: centered ? "center" : "flex-start",
        justifyContent: centered ? "center" : "flex-start",
        gap: isMarkOnly ? 0 : 10,
        minWidth: 0,
        textAlign: centered ? "center" : "left",
      }}
    >
      <img
        className="seferpaktLogoAsset"
        src={config.src}
        alt={alt}
        draggable={false}
        style={{
          display: "block",
          width: `${width}px`,
          maxWidth: `min(100%, ${config.maxWidth}px)`,
          height: "auto",
          flexShrink: 0,
          filter: isMarkOnly
            ? "drop-shadow(0 10px 20px rgba(2, 6, 23, 0.32))"
            : "drop-shadow(0 10px 22px rgba(2, 6, 23, 0.18))",
        }}
      />

      {!isMarkOnly && subtitle ? (
        <div
          className="seferpaktLogoSubtitle muted"
          style={{
            margin: 0,
            maxWidth: `${subtitleMaxWidth}px`,
            color: subtitleColor,
            fontSize: `${subtitleSize}px`,
            lineHeight: 1.45,
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}
