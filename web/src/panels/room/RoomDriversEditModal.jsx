export default function RoomDriversEditModal({
  editOpen,
  busy,
  setEditOpen,
  editForm,
  setEditForm,
  drivers,
  saveEdit,
}) {
  if (!editOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 50,
        background: "rgba(0,0,0,0.5)",
      }}
    >
      <div className="card" style={{ width: "min(820px, 96vw)", maxHeight: "92vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h3>Sürücü Düzenle</h3>
          <button type="button" disabled={busy} onClick={() => setEditOpen(false)}>
            Kapat
          </button>
        </div>

        <div className="grid" style={{ marginTop: 8 }}>
          <div className="col">
            <label className="muted">Ad Soyad</label>
            <input value={editForm.fullName} onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))} />
          </div>
          <div className="col">
            <label className="muted">Telefon</label>
            <input value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="col">
            <label className="muted">Cihaz</label>
            <input value={editForm.deviceInfo} onChange={(e) => setEditForm((p) => ({ ...p, deviceInfo: e.target.value }))} />
          </div>

          <div className="col">
            <label className="muted">Backup sürücü (ops.)</label>
            <select
              value={String(editForm.backupDriverId ?? "")}
              onChange={(e) => setEditForm((p) => ({ ...p, backupDriverId: e.target.value }))}
            >
              <option value="">— seçme —</option>
              {drivers
                .filter((x) => Number(x.id) !== Number(editForm.id))
                .map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.fullName || "Sürücü kaydı"}
                  </option>
                ))}
            </select>
          </div>

          <div className="col" style={{ display: "flex", gap: 8, justifyContent: "end" }}>
            <button type="button" disabled={busy} onClick={() => setEditOpen(false)}>
              İptal
            </button>
            <button type="button" disabled={busy} onClick={saveEdit}>
              {busy ? "..." : "Kaydet"}
            </button>
          </div>
        </div>

        <div className="muted" style={{ marginTop: 10 }}>
          Sürücü için giriş modeli artık Sürücü Kodu + PIN. Buradan temel bilgileri düzenlersin; yeni geçici PIN üretme ve cihaz sıfırlama listeden yapılır.
        </div>
      </div>
    </div>
  );
}
