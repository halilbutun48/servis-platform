import { useEffect, useMemo, useState } from "react";
import { api, createPersonelAccessInvite, listPersonelAccessInvites, revokePersonelAccessInvite } from "../../api";
import { useSession } from "../../state/session";
import PanelChrome from "../../components/PanelChrome";

function fmtTR(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  } catch {
    return String(iso);
  }
}

function statusLabel(status) {
  const s = String(status || "").toUpperCase();
  if (s === "ACCEPTED") return "Kullanıldı";
  if (s === "REVOKED") return "İptal edildi";
  if (s === "EXPIRED") return "Süresi doldu";
  return "Aktif";
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "ACCEPTED") return "good";
  if (s === "REVOKED" || s === "EXPIRED") return "warn";
  return "ROLE";
}

function maskFallback(text) {
  const value = String(text || "").trim();
  if (!value) return "-";
  if (value.length <= 4) return `${value.slice(0, 2)}**`;
  return `${value.slice(0, 4)}****`;
}

function copyText(value) {
  try {
    if (!value) return;
    void navigator.clipboard.writeText(String(value));
  } catch {
    // clipboard copy is best-effort
  }
}

function AccessCardField({ label, value }) {
  return (
    <div className="personelAccessCardField">
      <div className="personelAccessCardFieldLabel">{label}</div>
      <div className="personelAccessCardFieldValue">{value}</div>
    </div>
  );
}

function PersonelAccessMobileCard({ row, saving, onRevoke }) {
  const lastState = row.consumedAt
    ? `Kullanıldı: ${fmtTR(row.consumedAt)}`
    : row.revokedAt
      ? `İptal: ${fmtTR(row.revokedAt)}`
      : "Aktif erişim";

  return (
    <article className="card personelAccessMobileCard">
      <div className="personelAccessMobileCardHeader">
        <div style={{ minWidth: 0 }}>
          <div className="personelAccessMobileCardTitle">{row.personelName}</div>
          <div className="personelAccessMobileCardMeta">{row.personelMeta}</div>
        </div>
        <span className="pill" data-status={statusTone(row.status)}>{statusLabel(row.status)}</span>
      </div>

      <div className="personelAccessMobileCardGrid">
        <AccessCardField label="Kullanıcı kodu" value={<code>{row.codeMasked}</code>} />
        <AccessCardField label="Geçerlilik" value={fmtTR(row.expiresAt)} />
        <AccessCardField label="Oluşturuldu" value={fmtTR(row.createdAt)} />
        <AccessCardField label="Son durum" value={lastState} />
      </div>

      <div className="personelAccessMobileCardNote">
        Ham PIN listede gösterilmez. Raw değerler yalnızca üretim anında görünür.
      </div>

      <div className="toolbar personelAccessMobileCardActions">
        <button
          type="button"
          className="btn sm"
          disabled={saving || row.status !== "ACTIVE"}
          onClick={() => onRevoke(row.id)}
        >
          İptal et
        </button>
      </div>
    </article>
  );
}

function PersonelAccessMobileCards({ rows, saving, onRevoke }) {
  if (!rows.length) {
    return <div className="card personelAccessMobileEmpty">Henüz personel erişimi yok.</div>;
  }

  return (
    <div className="personelAccessMobileCards">
      {rows.map((row) => (
        <PersonelAccessMobileCard key={row.id} row={row} saving={saving} onRevoke={onRevoke} />
      ))}
    </div>
  );
}

export default function PersonelAccessPanel() {
  const { token, me } = useSession();
  const companyKind = String(me?.companyKind || "COMPANY").toUpperCase();
  const isOrganization = companyKind === "ORGANIZATION";

  const [personels, setPersonels] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedPersonelId, setSelectedPersonelId] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [lastCreated, setLastCreated] = useState(null);

  async function loadAll() {
    setBusy(true);
    setErr("");
    try {
      const [personelsResp, invitesResp] = await Promise.all([
        api("/api/company/personels?kind=PERSONEL&take=100", { token }),
        listPersonelAccessInvites(token, 100),
      ]);
      const pItems = Array.isArray(personelsResp?.items) ? personelsResp.items : [];
      const iItems = Array.isArray(invitesResp?.items) ? invitesResp.items : [];
      setPersonels(pItems);
      setItems(iItems);
      setSelectedPersonelId((prev) => prev || String(pItems?.[0]?.id || ""));
    } catch (e) {
      setErr(String(e?.message || e));
      setPersonels([]);
      setItems([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    loadAll();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedPersonel = useMemo(
    () => personels.find((x) => String(x.id) === String(selectedPersonelId)) || null,
    [personels, selectedPersonelId]
  );

  const rows = useMemo(() => {
    return (Array.isArray(items) ? items : []).map((item) => ({
      id: item.id,
      personelName: item?.personel?.fullName || `#${item?.personelId || "-"}`,
      personelMeta: item?.personel?.phoneMasked || item?.personel?.kind || "-",
      codeMasked: item?.accessCodeMasked || maskFallback(item?.personelId),
      status: item?.status || "ACTIVE",
      createdAt: item?.createdAt || null,
      expiresAt: item?.expiresAt || null,
      consumedAt: item?.consumedAt || null,
      revokedAt: item?.revokedAt || null,
    }));
  }, [items]);

  async function onCreateInvite(e) {
    e?.preventDefault?.();
    if (!selectedPersonelId) {
      setErr("Önce personel seç.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const r = await createPersonelAccessInvite({ token, personelId: Number(selectedPersonelId) });
      setLastCreated({
        personelName: selectedPersonel?.fullName || `#${selectedPersonelId}`,
        accessCode: String(r?.accessCode || ""),
        pin: String(r?.pin || ""),
        expiresAt: r?.item?.expiresAt || null,
        createdAt: r?.item?.createdAt || null,
      });
      await loadAll();
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setSaving(false);
    }
  }

  async function onRevoke(id) {
    if (!id) return;
    setSaving(true);
    setErr("");
    try {
      await revokePersonelAccessInvite({ token, id });
      await loadAll();
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setSaving(false);
    }
  }

  if (me?.role !== "COMPANY") {
    return <div className="card err">Bu panel yalnızca firma / kurum kapsamı için görünür.</div>;
  }

  return (
    <div className="wrap wrap--fluid personelAccessScope" style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <PanelChrome
        title="Personel erişimi"
        subtitle={
          isOrganization
            ? "Organizasyon personeline 7 gün geçerli kullanıcı kodu ve geçici PIN verin."
            : "Personele 7 gün geçerli kullanıcı kodu ve geçici PIN verin."
        }
        actions={(
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn sm" onClick={loadAll} disabled={busy || saving}>
              {busy ? "..." : "Yenile"}
            </button>
          </div>
        )}
      />

      {err ? <div className="card err">{err}</div> : null}

      {lastCreated ? (
        <div className="card personelAccessProofCard">
          <div className="panelSectionTitle">Tek seferlik bilgi kartı</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Bu kod ve PIN yalnızca şimdi gösterilir. Sonradan tekrar görüntülemek yerine yeni erişim üret.
          </div>
          <div className="personelAccessProofGrid">
            <div className="card" style={{ margin: 0 }}>
              <div className="panelMeta">Kullanıcı kodu</div>
              <div style={{ fontWeight: 900, marginTop: 6, wordBreak: "break-all" }}>{lastCreated.accessCode || "-"}</div>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <div className="panelMeta">Geçici PIN</div>
              <div style={{ fontWeight: 900, marginTop: 6, letterSpacing: 1.5 }}>{lastCreated.pin || "-"}</div>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <div className="panelMeta">Geçerlilik</div>
              <div style={{ fontWeight: 900, marginTop: 6 }}>7 gün geçerli</div>
              <div className="panelMeta" style={{ marginTop: 4 }}>{fmtTR(lastCreated.createdAt || lastCreated.expiresAt)}</div>
            </div>
          </div>
          <div className="toolbar personelAccessProofActions">
            <button type="button" className="btn sm" onClick={() => copyText(lastCreated.accessCode)}>Kodu kopyala</button>
            <button type="button" className="btn sm" onClick={() => copyText(lastCreated.pin)}>PIN'i kopyala</button>
            <button type="button" className="btn sm" onClick={() => copyText(`${lastCreated.accessCode || ""}${lastCreated.pin || ""}`)}>Birlikte kopyala</button>
          </div>
        </div>
      ) : null}

      <div className="personelAccessLayout">
        <div className="card personelAccessCreateCard">
          <div className="panelSectionTitle">Personel erişimi oluştur</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Personele 7 gün geçerli kullanıcı kodu ve geçici PIN ver. Raw değerler yalnızca üretim anında gösterilir.
          </div>

          <form onSubmit={onCreateInvite} style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <label className="panelMeta" style={{ display: "grid", gap: 6 }}>
              Personel
              <select value={selectedPersonelId} onChange={(e) => setSelectedPersonelId(e.target.value)}>
                <option value="">Seç…</option>
                {personels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName || `#${p.id}`}
                  </option>
                ))}
              </select>
            </label>

            {selectedPersonel ? (
              <div className="panelMeta">
                Seçili personel: <b>{selectedPersonel.fullName || `#${selectedPersonel.id}`}</b>
                {selectedPersonel.phoneMasked ? <> • {selectedPersonel.phoneMasked}</> : null}
              </div>
            ) : (
              <div className="panelMeta">Önce bir personel seç.</div>
            )}

            <div className="toolbar" style={{ gap: 8, flexWrap: "wrap" }}>
              <button type="submit" className="btn primary" disabled={saving || busy}>
                {saving ? "..." : "Personel erişimi oluştur"}
              </button>
            </div>
          </form>
        </div>

        <div className="card personelAccessDesktopList">
          <div className="panelSectionTitle">Erişim listesi</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Maskelenmiş kod, durum, son tarih ve iptal aksiyonu gösterilir. Ham PIN listede gösterilmez.
          </div>

          <table className="tbl personelAccessDesktopTable" style={{ marginTop: 12, whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th>Personel</th>
                <th>Kod</th>
                <th>Durum</th>
                <th>Son tarih</th>
                <th>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div style={{ fontWeight: 800 }}>{row.personelName}</div>
                    <div className="panelMeta">{row.personelMeta}</div>
                  </td>
                  <td><code>{row.codeMasked}</code></td>
                  <td>
                    <span className="pill" data-status={statusTone(row.status)}>{statusLabel(row.status)}</span>
                    <div className="panelMeta" style={{ marginTop: 4 }}>
                      {row.consumedAt ? `Kullanıldı: ${fmtTR(row.consumedAt)}` : null}
                      {row.revokedAt ? `İptal: ${fmtTR(row.revokedAt)}` : null}
                      {!row.consumedAt && !row.revokedAt ? "Aktif erişim" : null}
                    </div>
                  </td>
                  <td>{fmtTR(row.expiresAt)}</td>
                  <td>
                    <div className="toolbar" style={{ gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn sm"
                        disabled={saving || row.status !== "ACTIVE"}
                        onClick={() => onRevoke(row.id)}
                      >
                        İptal et
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="panelMeta">Henüz personel erişimi yok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PersonelAccessMobileCards rows={rows} saving={saving} onRevoke={onRevoke} />
      </div>
    </div>
  );
}
