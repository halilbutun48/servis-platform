import { useMemo, useState } from "react";
import BrandMark from "../../components/BrandMark";
import PublicLeadCaptureModal from "../../components/public/PublicLeadCaptureModal";
import { navigate } from "../../router";

const CTA_PRESETS = [
  {
    key: "demo",
    label: "Demo talep et",
    title: "Demo talebi",
    leadType: "DEMO_REQUEST",
    summary: "SeferPakt'ın servis operasyonu ve tedarik akışını kısa bir demoda görün.",
    note: "Üyelik otomatik açılmaz; başvurunuz ekip tarafından incelenir.",
  },
  {
    key: "support",
    label: "Canlı destekle görüş",
    title: "Canlı destek talebi",
    leadType: "LIVE_SUPPORT_REQUEST",
    summary: "Kurulum, kapsam ve kullanım soruları için kontrollü iletişim talebi bırakın.",
    note: "Teknik destek kaydı ekip incelemesine düşer; otomatik hesap açılmaz.",
  },
  {
    key: "need",
    label: "Servis ihtiyacımı anlat",
    title: "Servis ihtiyacı başvurusu",
    leadType: "SERVICE_NEED",
    summary: "Personel, öğrenci veya kurum servisi ihtiyacınızı güvenli şekilde paylaşın.",
    note: "Personel / öğrenci listesi sonra paylaşılabilir; form lead olarak kaydolur.",
  },
  {
    key: "supplier",
    label: "Tedarikçi olarak başvur",
    title: "Tedarikçi başvurusu",
    leadType: "SUPPLIER_APPLICATION",
    summary: "Araç kapasitesi, bölge ve yetkili bilgisiyle tedarikçi başvurusu bırakın.",
    note: "Doğrulama sonrası davetli üyelik süreci başlar; otomatik üyelik açılmaz.",
  },
];

const AUDIENCE_CARDS = [
  {
    title: "Firma / okul / kurum",
    bullets: [
      "İhtiyacınızı kısa formda bırakın.",
      "SeferPakt talebi, sözleşmeyi, vardiyayı ve canlı takibi tek yerde toplar.",
      "Uygun tedarikçi tekliflerini kalite ve risk sinyalleriyle karşılaştırın.",
      "Hakediş ve ödeme önizlemelerini izleyin.",
    ],
  },
  {
    title: "Taşımacılık Firması / servis tedarikçisi",
    bullets: [
      "Uygun işlere teklif verin.",
      "Kapasite, fiyat ve rota uygunluğunu yönetin.",
      "Kalite ve SeferPuanı ile güven kazanın.",
      "İyi hizmet veren daha avantajlı görünür.",
    ],
  },
  {
    title: "Sefer Abi / Operasyon Copilot'u",
    bullets: [
      "Ekrandaki sinyalleri özetler.",
      "Riskleri görünür yapar.",
      "Sonraki adımı önerir.",
      "Karar ve onay sizdedir.",
    ],
  },
];

const TRUST_ITEMS = [
  "Kurumsal servis operasyon platformu",
  "Kontrollü lead kaydı",
  "Üyelik otomatik açılmaz",
  "Ödeme / fatura / tahsilat yok",
  "Doğrulama sonrası davetli üyelik",
  "KVKK ve rol bazlı görünürlük",
  "Başvurular ekip incelemesinden geçer",
];

const FAQ = [
  {
    q: "Lisans ücreti var mı?",
    a: "Hayır. Public modelde lisans ücreti yok; mevcut sözleşmelerden pay alınmaz. Yeni/yenilenen SeferPakt kaynaklı işlerde yalnızca kaliteye bağlı salt okunur başarı payı önizlenebilir.",
  },
  {
    q: "Mevcut sözleşmelerden pay alınıyor mu?",
    a: "Hayır. Mevcut, manuel, pilot, legacy veya kaynak zinciri belirsiz sözleşmeler başarı payı doğurmaz.",
  },
  {
    q: "SeferPakt başarı payı ne zaman doğar?",
    a: "Yalnızca kaynak vardiya / market zinciri kanıtlı yeni veya yenilenen SeferPakt işlerinde, politika bazlı salt okunur önizleme olarak görünür.",
  },
  {
    q: "Sefer Abi otomatik işlem yapar mı?",
    a: "Hayır. Sefer Abi opsiyonel operasyon copilot'udur; sinyalleri özetler, riskleri açıklar ve sonraki adımı önerir. Teklif, sözleşme, araç atama, rota uygulama, SMS/push, ödeme ve ceza gibi kritik işlemler kullanıcı onayı olmadan yapılmaz.",
  },
  {
    q: "Tedarikçiler nasıl ilerler?",
    a: "Tedarikçi başvurusu bırakır, ekip kapasite ve bölge bilgisini inceler, doğrulama sonrası davetli üyelik süreci başlatılır.",
  },
  {
    q: "TOTP veya SMS güvenlik modeli nedir?",
    a: "Güvenlik adımları ortam ve politika bazlı yönetilir. Kritik işlemler her durumda onay kapılıdır; bu public sayfa otomatik güvenlik işlemi yapmaz.",
  },
];

function LandingCard({ title, bullets }) {
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="panelSectionTitle">{title}</div>
      <ul style={{ margin: "10px 0 0", paddingLeft: 18, display: "grid", gap: 8 }}>
        {bullets.map((bullet) => (
          <li key={bullet} className="panelBody" style={{ lineHeight: 1.55 }}>
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PublicLandingPage() {
  const [selectedKey, setSelectedKey] = useState("demo");
  const [leadModal, setLeadModal] = useState(null);

  const activePreset = useMemo(() => {
    return CTA_PRESETS.find((item) => item.key === selectedKey) || CTA_PRESETS[0];
  }, [selectedKey]);

  function openLeadForm(preset) {
    setSelectedKey(preset.key);
    setLeadModal({
      open: true,
      leadType: preset.leadType,
      leadTitle: preset.title,
    });
  }

  function closeLeadForm() {
    setLeadModal(null);
  }

  function openFaq() {
    document.getElementById("faq")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(59,130,246,.18), transparent 34%), radial-gradient(circle at top right, rgba(34,197,94,.12), transparent 32%), linear-gradient(180deg, #0b0f17 0%, #0c1321 48%, #0b0f17 100%)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(120deg, rgba(148,163,184,.08) 0, rgba(148,163,184,0) 40%, rgba(15,23,42,0) 60%, rgba(148,163,184,.05) 100%)",
          mixBlendMode: "screen",
          opacity: 0.55,
        }}
      />

      <div className="wrap" style={{ position: "relative", paddingTop: 18, paddingBottom: 42 }}>
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <BrandMark subtitle="Public vitrin • kontrollü lead toplama" />

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="button" className="btn" onClick={openFaq}>
              SSS
            </button>
            <button type="button" className="btn primary" onClick={() => navigate("/")}>
              Giriş Yap
            </button>
          </div>
        </header>

        <section className="card" style={{ position: "relative", overflow: "hidden", marginBottom: 12 }}>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              right: -90,
              top: -84,
              width: 240,
              height: 240,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(59,130,246,.28) 0%, rgba(59,130,246,0) 70%)",
              filter: "blur(18px)",
            }}
          />
          <div className="grid landingSplitGrid" style={{ gap: 14, alignItems: "start" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                <span className="pill" data-status="SUCCESS">
                  Başvurular ekip tarafından incelenir
                </span>
                <span className="pill" data-status="INFO">
                  Kurumsal servis operasyonu tek platformda
                </span>
                <span className="pill" data-status="INFO">
                  Üyelik otomatik açılmaz
                </span>
                <span className="pill" data-status="INFO">
                  Ödeme / fatura / tahsilat yok
                </span>
                <span className="pill" data-status="INFO">
                  Davetli üyelik doğrulama sonrası
                </span>
              </div>

              <h1 className="title" style={{ fontSize: "clamp(28px, 4vw, 48px)", maxWidth: 980 }}>
                Servis tedarikinden saha denetimine, sözleşmeden hakedişe tek kurumsal platform
              </h1>

              <p className="panelSubtitle" style={{ marginTop: 12, maxWidth: 860 }}>
                SeferPakt; servis taleplerini, tedarikçileri, sözleşmeleri, vardiyaları, canlı GPS takibini, kanıtları ve
                hakediş önizlemelerini tek yerde yönetir.
              </p>

              <p className="panelBody" style={{ marginTop: 14, maxWidth: 900, color: "#d8e4ff" }}>
                Sefer Abi ise operasyonu anlamanıza ve riskleri erken görmenize yardımcı olan opsiyonel operasyon copilot'udur.
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
                {CTA_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    className={`btn ${preset.key === activePreset.key ? "primary" : ""}`}
                    onClick={() => openLeadForm(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="panelMeta" style={{ marginTop: 12 }}>
                Public CTA'lar demo, canlı destek, servis ihtiyacı ve tedarikçi başvurusu toplar. Başvurular kontrollü lead
                formuna düşer; otomatik hesap, otomatik davet ve ödeme akışı açılmaz.
              </div>
            </div>

            <aside className="card" style={{ marginBottom: 0, background: "rgba(10,16,28,.9)" }}>
              <div className="panelSectionTitle">Public güven sınırları</div>
              <div className="panelBody" style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <div>
                  <div className="panelStatTitle">Yok</div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>Self-service üyelik</div>
                </div>
                <div>
                  <div className="panelStatTitle">Var</div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>Kontrollü lead kaydı ve inceleme kuyruğu</div>
                </div>
                <div>
                  <div className="panelStatTitle">Yok</div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>Ödeme / fatura / tahsilat</div>
                </div>
                <div>
                  <div className="panelStatTitle">Var</div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>Doğrulama sonrası davetli üyelik</div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section id="value" className="grid" style={{ marginBottom: 12 }}>
          {AUDIENCE_CARDS.map((card) => (
            <LandingCard key={card.title} title={card.title} bullets={card.bullets} />
          ))}
        </section>

        <section className="grid" style={{ marginBottom: 12 }}>
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="panelSectionTitle">Operasyon güveni</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {TRUST_ITEMS.map((item) => (
                <span key={item} className="pill" data-status="INFO">
                  {item}
                </span>
              ))}
            </div>
            <div className="panelBody" style={{ marginTop: 12 }}>
              Görünürlük, proof ve kalite sinyalleri public vitrinde anlatılır; gerçek write / payment / invoice süreçleri bu
              milestone'da açılmaz.
            </div>
          </div>
        </section>

        <section className="grid" style={{ marginBottom: 12 }}>
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="panelSectionTitle">Nasıl çalışır?</div>
            <ol style={{ margin: "10px 0 0", paddingLeft: 20, display: "grid", gap: 8 }}>
              <li className="panelBody">CTA'yı seçin ve başvuru formunu açın.</li>
              <li className="panelBody">Ad, iletişim bilgisi, rol ve ihtiyacı doldurun.</li>
              <li className="panelBody">KVKK onayını verin.</li>
              <li className="panelBody">Başvuru ekip incelemesine düşsün.</li>
              <li className="panelBody">Uygun görülürse sizinle iletişime geçilsin.</li>
            </ol>
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <div className="panelSectionTitle">Güvenli başvuru</div>
            <ul style={{ margin: "10px 0 0", paddingLeft: 18, display: "grid", gap: 8 }}>
              <li className="panelBody">Kontrollü lead kaydı ve review kuyruğu</li>
              <li className="panelBody">KVKK onayı olmadan submit yok</li>
              <li className="panelBody">Self-service üyelik ve otomatik hesap açma yok</li>
              <li className="panelBody">Ödeme, fatura, tahsilat ve settlement yok</li>
              <li className="panelBody">Davetli üyelik yalnızca doğrulama sonrası</li>
            </ul>
            <button type="button" className="btn primary" style={{ marginTop: 14 }} onClick={() => openLeadForm(activePreset)}>
              Başvuru formunu aç
            </button>
          </div>
        </section>

        <section className="card" id="faq" style={{ marginBottom: 12 }}>
          <div className="panelSectionTitle">Sık sorulanlar</div>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {FAQ.map((item) => (
              <details key={item.q} className="card" style={{ marginBottom: 0, background: "rgba(255,255,255,0.02)" }}>
                <summary style={{ cursor: "pointer", fontWeight: 900, color: "#f4f7ff" }}>{item.q}</summary>
                <div className="panelBody" style={{ marginTop: 10 }}>
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        <section id="contact" className="card" style={{ marginBottom: 12 }}>
          <div className="panelSectionTitle">{activePreset.title}</div>
          <div className="panelSectionSubtitle" style={{ marginTop: 6 }}>
            {activePreset.summary}
          </div>

          <div className="grid landingContactGrid" style={{ marginTop: 12 }}>
            <div className="card" style={{ marginBottom: 0, background: "rgba(10,16,28,.94)" }}>
              <div className="panelSectionTitle">Bu başvuru nasıl ilerler?</div>
              <ol style={{ margin: "10px 0 0", paddingLeft: 20, display: "grid", gap: 8 }}>
                <li className="panelBody">Formu güvenli şekilde doldurun.</li>
                <li className="panelBody">KVKK onayı verin.</li>
                <li className="panelBody">Başvuru ekip inceleme kuyruğuna düşsün.</li>
                <li className="panelBody">Uygun görülürse sizinle iletişime geçilsin.</li>
              </ol>
              <div className="panelMeta" style={{ marginTop: 12 }}>
                {activePreset.note}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 0, background: "rgba(10,16,28,.94)" }}>
              <div className="panelSectionTitle">Güvenli sınır</div>
              <div className="panelBody" style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <div>
                  <div className="panelStatTitle">Yok</div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>Otomatik üyelik / hesap açma</div>
                </div>
                <div>
                  <div className="panelStatTitle">Yok</div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>Ödeme / fatura / tahsilat akışı</div>
                </div>
                <div>
                  <div className="panelStatTitle">Yok</div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>Otomatik davet maili / SMS</div>
                </div>
                <div>
                  <div className="panelStatTitle">Var</div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>Ekip incelemesi ve kontrollü dönüş</div>
                </div>
              </div>
              <button type="button" className="btn primary" style={{ marginTop: 14 }} onClick={() => openLeadForm(activePreset)}>
                Bu başvuru türünü aç
              </button>
            </div>
          </div>
        </section>

        <footer className="card" style={{ marginBottom: 0 }}>
          <div className="panelSectionTitle">SeferPakt public vitrin</div>
          <div className="panelBody" style={{ marginTop: 8 }}>
            Klasik abonelikli SaaS değil. Servis tedarikinden saha denetimine, sözleşmeden hakedişe uzanan kurumsal servis
            operasyon platformu.
          </div>
          <div className="panelBody" style={{ marginTop: 8 }}>
            Sefer Abi ise ekran sinyallerini özetleyen, riskleri görünür yapan ve sonraki adımı öneren opsiyonel operasyon
            copilot'udur.
          </div>
          <div className="panelMeta" style={{ marginTop: 10 }}>
            Mevcut SeferPakt web projesinin public route'u: <code>/landing</code> • Authenticated app akışı ve operasyon
            panelleri korunur.
          </div>
        </footer>
      </div>

      <PublicLeadCaptureModal
        open={Boolean(leadModal?.open)}
        leadType={leadModal?.leadType || activePreset.leadType}
        leadTitle={leadModal?.leadTitle || activePreset.title}
        onClose={closeLeadForm}
      />
    </div>
  );
}
