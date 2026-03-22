export default function BrandMark({ compact = false, subtitle = null, centered = false }) {
  const gap = compact ? 10 : 14;
  const size = compact ? 36 : 44;
  const titleSize = compact ? 18 : 24;
  const subSize = compact ? 11 : 12;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: centered ? "center" : "flex-start",
        gap,
      }}
    >
      <img
        src="/vardis-logo.svg"
        alt="Vardis"
        width={size}
        height={size}
        style={{ borderRadius: compact ? 10 : 12, boxShadow: "0 6px 18px rgba(15,23,42,0.16)" }}
      />
      <div>
        <div style={{ fontWeight: 900, fontSize: titleSize, lineHeight: 1.05, letterSpacing: "0.01em" }}>Vardis</div>
        {subtitle ? (
          <div className="muted" style={{ marginTop: 4, fontSize: subSize }}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}
