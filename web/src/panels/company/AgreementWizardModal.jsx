export function AgreementWizardModal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 50,
        padding: 16,
        overflow: "auto",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="card" style={{ maxWidth: 980, margin: "24px auto" }}>
        {children}
      </div>
    </div>
  );
}
