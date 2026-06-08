import { BRAND_NAME } from "../config/brand.js";
import SeferPaktLogo from "./brand/SeferPaktLogo.jsx";

export default function BrandMark({ size = null, compact = false, subtitle = null, centered = false, variant = null, tone = "dark", className = "" }) {
  const resolvedVariant = variant || (compact ? "compact" : size && Number(size) <= 56 ? "mark" : subtitle ? "full" : "mark");
  return (
    <SeferPaktLogo
      variant={resolvedVariant}
      subtitle={subtitle}
      centered={centered}
      size={size}
      tone={tone}
      className={className}
      alt={BRAND_NAME}
    />
  );
}
