export default function SystemModeSummaryBand({
  className = "",
  style,
}) {
  return (
    <section className={`system-mode-summary-band ${className}`.trim()} style={style}>
      <div className="system-mode-summary-head">
        <div>
          <div className="panelSectionTitle">Sistem durumu</div>
          <div className="system-mode-summary-note" style={{ marginTop: 4 }}>
            Kanıt ve kalite hazırlıkları aktif; ödeme ve hakediş işlemleri kapalıdır.
          </div>
        </div>
      </div>

      <div className="system-mode-summary-grid">
        <span className="system-mode-summary-chip">Servis kanıtı aktif</span>
        <span className="system-mode-summary-chip">Kalite taslak modda</span>
        <span className="system-mode-summary-chip">Ödeme kapalı</span>
        <span className="system-mode-summary-chip">Hakediş kapalı</span>
        <span className="system-mode-summary-chip">Komisyon kapalı</span>
        <span className="system-mode-summary-chip">Saha testi bekliyor</span>
      </div>

      <div className="system-mode-summary-note">
        Servis Kanıtı ve Hizmet Kanıtı operasyon görünürlüğü sağlar.
      </div>
      <div className="system-mode-summary-note">
        Kalite bilgileri kesin puan veya sağlayıcı sıralaması değildir.
      </div>
      <div className="system-mode-summary-note">
        Hakediş ekranı sadece hazırlık, önizleme ve CSV taslağı gösterir.
      </div>
      <div className="system-mode-summary-note">
        Ödeme başlatılmaz.
      </div>
    </section>
  );
}
