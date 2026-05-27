import { useMemo, useRef, useState } from "react";
import BrandMark from "../../components/BrandMark";
import { navigate } from "../../router";

const CTA_PRESETS = [
  {
    key: "demo",
    label: "Demo talep et",
    title: "Demo talebi",
    recipient: "demo@seferpakt.com",
    subject: "SeferPakt demo talebi",
    summary: "Ürün demosu, pazaryeri modeli ve Sefer Abi akışını görmek için kısa bir tanışma notu.",
    note: "Bu CTA yalnızca yerel iletişim taslağını değiştirir; otomatik lead backend açmaz.",
    body: [
      "Merhaba,",
      "",
      "SeferPakt için demo görmek istiyoruz.",
      "Lütfen ürünün public vitrinini, pazaryeri modelini ve Sefer Abi'nin karar/onay akışını anlatın.",
      "",
      "İlgili kurum / ekip:",
      "-",
      "",
      "Not:",
      "Bu talep public landing üzerinde otomatik kayıt açmadan iletilir.",
    ].join("\n"),
  },
  {
    key: "support",
    label: "Canlı destekle görüş",
    title: "Canlı destek talebi",
    recipient: "destek@seferpakt.com",
    subject: "SeferPakt canlı destek talebi",
    summary: "Soru-cevap, kurulum ve ürün kapsamı için hızlı destek notu.",
    note: "Bu CTA teknik destek taslağı üretir; backend tarafında kayıt oluşturmaz.",
    body: [
      "Merhaba,",
      "",
      "SeferPakt hakkında canlı destek almak istiyoruz.",
      "Özellikle public landing, pazaryeri modeli ve AI operasyon yardımcısı akışını netleştirmek istiyoruz.",
      "",
      "İhtiyaç konusu:",
      "-",
    ].join("\n"),
  },
  {
    key: "need",
    label: "Servis ihtiyacımı anlat",
    title: "Servis ihtiyacı notu",
    recipient: "merhaba@seferpakt.com",
    subject: "SeferPakt servis ihtiyacı",
    summary: "Personel / öğrenci servis ihtiyacını özetleyen kısa bir taslak.",
    note: "Bu CTA ihtiyacı anlatan yerel bir taslak açar; otomatik başvuru açmaz.",
    body: [
      "Merhaba,",
      "",
      "Servis ihtiyacımızı anlatmak istiyoruz.",
      "Personel / öğrenci listesi, durak-rotalar ve teklif süreci için Sefer Abi ile ilerlemek istiyoruz.",
      "",
      "Kısa özet:",
      "-",
    ].join("\n"),
  },
  {
    key: "supplier",
    label: "Tedarikçi olarak başvur",
    title: "Tedarikçi başvuru notu",
    recipient: "tedarikci@seferpakt.com",
    subject: "SeferPakt tedarikçi başvurusu",
    summary: "Room / servis sağlayıcı tarafı için kapasite ve teklif hazırlık notu.",
    note: "Bu CTA yalnızca e-posta taslağı üretir; üyelik / doğrulama backend'i bu milestone’da kapalıdır.",
    body: [
      "Merhaba,",
      "",
      "Tedarikçi olarak SeferPakt ekosistemine dahil olmak istiyoruz.",
      "Kapasite, bölge ve kalite bilgimizi paylaşarak uygun işlere teklif vermek istiyoruz.",
      "",
      "Firma / oda bilgisi:",
      "-",
    ].join("\n"),
  },
];

const AUDIENCE_CARDS = [
  {
    title: "Firma / okul / kurum",
    bullets: [
      "Liste yükleyin ve ihtiyaçları tek ekranda görün.",
      "Sefer Abi durak ve rota taslağını hazırlasın.",
      "Uygun tedarikçi tekliflerini kalite ve riskle karşılaştırın.",
      "Sözleşmeden vardiyaya güvenli geçişi takip edin.",
    ],
  },
  {
    title: "Room / servis tedarikçisi",
    bullets: [
      "Uygun işlere teklif verin.",
      "Kapasite ve fiyat bilgilerinizi yönetin.",
      "Kalite ve SeferPuanı ile güven kazanın.",
      "İyi hizmet veren daha avantajlı görünür.",
    ],
  },
  {
    title: "Sefer Abi AI",
    bullets: [
      "Eksik adresleri bulur ve durakları hazırlar.",
      "OSRM ile km / süre etkisini analiz eder.",
      "Teklifleri fiyat, kalite, kapasite ve riskle karşılaştırır.",
      "Kritik işlemlerde sadece onaylı aksiyon önerir.",
    ],
  },
];

const TRUST_ITEMS = [
  "Canlı GPS / ETA güvenilirliği",
  "Biniş değişikliği talepleri",
  "Proof / kalite / hakediş önizleme",
  "Source lineage / sözleşme kaynağı",
  "KVKK ve rol bazlı görünürlük",
  "Proaktif uyarılar ve next best action",
];

const FAQ = [
  {
    q: "Lisans ücreti var mı?",
    a: "Hayır. Public modelde lisans ücreti yok; mevcut sözleşmelerden pay alınmaz. Yeni/yenilenen SeferPakt kaynaklı işlerde yalnızca kaliteye bağlı readonly başarı payı önizlenebilir.",
  },
  {
    q: "Mevcut sözleşmelerden pay alınıyor mu?",
    a: "Hayır. Mevcut, manuel, pilot, legacy veya kaynak zinciri belirsiz sözleşmeler başarı payı doğurmaz.",
  },
  {
    q: "SeferPakt başarı payı ne zaman doğar?",
    a: "Yalnızca kaynak vardiya / market shift zinciri kanıtlı yeni veya yenilenen SeferPakt işlerinde, politika bazlı readonly önizleme olarak görünür.",
  },
  {
    q: "Sefer Abi otomatik işlem yapar mı?",
    a: "Hayır. Sefer Abi önerir, hazırlar ve riskleri açıklar; teklif, sözleşme, araç atama, rota uygulama, SMS/push, ödeme ve ceza gibi kritik işlemler kullanıcı onayı olmadan yapılmaz.",
  },
  {
    q: "Tedarikçiler nasıl teklif verir?",
    a: "Doğrulanmış tedarikçi olarak uygun işlere teklif verir, kapasite / fiyat / kalite sinyalleriyle görünür olur ve en iyi seçenekler gerekçesiyle öne çıkar.",
  },
  {
    q: "TOTP veya SMS güvenlik modeli nedir?",
    a: "Güvenlik adımları ortam ve politika bazlı yönetilir. Kritik işlemler her durumda onay kapılıdır; bu public sayfa otomatik güvenlik işlemi yapmaz.",
  },
];

function buildMailto({ recipient, subject, body }) {
  return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

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
  const contactRef = useRef(null);

  const activePreset = useMemo(() => {
    return CTA_PRESETS.find((item) => item.key === selectedKey) || CTA_PRESETS[0];
  }, [selectedKey]);

  const activeMailto = useMemo(() => buildMailto(activePreset), [activePreset]);

  function selectPreset(key) {
    setSelectedKey(key);
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => {
        contactRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    contactRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
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
          <BrandMark subtitle="Public vitrin • pazaryeri + AI operasyon platformu" />

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
                  Lisans ücreti 0 TL
                </span>
                <span className="pill" data-status="INFO">
                  Mevcut sözleşmeden pay yok
                </span>
                <span className="pill" data-status="INFO">
                  Readonly başarı payı
                </span>
                <span className="pill" data-status="INFO">
                  Kritik işlemde kullanıcı onayı
                </span>
              </div>

              <h1 className="title" style={{ fontSize: "clamp(28px, 4vw, 48px)", maxWidth: 980 }}>
                SeferPakt: Servis operasyonunu pazaryeri, kanıt ve Sefer Abi ile yöneten akıllı platform
              </h1>

              <p className="panelSubtitle" style={{ marginTop: 12, maxWidth: 860 }}>
                Personel ve öğrenci servislerini planlayın, teklifleri kaliteyle karşılaştırın, sözleşmeden vardiyaya operasyonu
                güvenli şekilde yönetin.
              </p>

              <p className="panelBody" style={{ marginTop: 14, maxWidth: 900, color: "#d8e4ff" }}>
                SeferPakt klasik abonelikli SaaS değildir. Yeni / yenilenen ve kaynak vardiya zinciri kanıtlı işlerde kaliteye
                göre readonly başarı payı modeli vardır; mevcut sözleşmeden pay alınmaz.
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
                {CTA_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    className={`btn ${preset.key === activePreset.key ? "primary" : ""}`}
                    onClick={() => selectPreset(preset.key)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="panelMeta" style={{ marginTop: 12 }}>
                Bu sayfa otomatik lead backend açmaz. CTA seçimi yalnızca yerel iletişim taslağını değiştirir.
              </div>
            </div>

            <aside className="card" style={{ marginBottom: 0, background: "rgba(10,16,28,.9)" }}>
              <div className="panelSectionTitle">Public güven sınırları</div>
              <div className="panelBody" style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <div>
                  <div className="panelStatTitle">Yok</div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>Lisanssız modelde backend lead / üyelik / ödeme yok</div>
                </div>
                <div>
                  <div className="panelStatTitle">Var</div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>Sefer Abi ile demand-to-agreement vizyonu</div>
                </div>
                <div>
                  <div className="panelStatTitle">Var</div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>Kalite, kanıt ve source lineage odaklı görünürlük</div>
                </div>
                <div>
                  <div className="panelStatTitle">Yok</div>
                  <div style={{ fontWeight: 800, marginTop: 4 }}>Otomatik sözleşme / ödeme / fatura / tahsilat</div>
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
            <div className="panelSectionTitle">Sefer Abi AI ne yapar?</div>
            <ul style={{ margin: "10px 0 0", paddingLeft: 18, display: "grid", gap: 8 }}>
              <li className="panelBody">Personel / öğrenci listesini analiz eder.</li>
              <li className="panelBody">Eksik adresleri ve belirsiz kayıtları yakalar.</li>
              <li className="panelBody">Durak ve rota taslağı hazırlar.</li>
              <li className="panelBody">OSRM ile km / süre etkisini çıkarır.</li>
              <li className="panelBody">Uygun tedarikçileri fiyat, kalite, SeferPuanı, kapasite ve risk ile karşılaştırır.</li>
              <li className="panelBody">Kritik işlemler için yalnızca onaylı aksiyon önerir; doğrudan uygulama yapmaz.</li>
            </ul>
          </div>

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
              milestone’da açılmaz.
            </div>
          </div>
        </section>

        <section className="grid" style={{ marginBottom: 12 }}>
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="panelSectionTitle">Nasıl çalışır?</div>
            <ol style={{ margin: "10px 0 0", paddingLeft: 20, display: "grid", gap: 8 }}>
              <li className="panelBody">Servis ihtiyacınızı anlatın veya listeyi yükleyin.</li>
              <li className="panelBody">Sefer Abi adresleri ve durakları hazırlasın.</li>
              <li className="panelBody">Rota, süre ve km etkisi çıkarılsın.</li>
              <li className="panelBody">Uygun tedarikçilerden teklif süreci hazırlansın.</li>
              <li className="panelBody">Gelen teklifler analiz edilip gerekçelendirilsin.</li>
              <li className="panelBody">Kullanıcı en uygun teklifi onaylasın.</li>
              <li className="panelBody">Teklif sözleşmeye dönüşsün ve source lineage korunsun.</li>
              <li className="panelBody">Sözleşmeden 7 günlük rolling vardiyalar üretilebilsin.</li>
            </ol>
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <div className="panelSectionTitle">Güvenli pazaryeri</div>
            <ul style={{ margin: "10px 0 0", paddingLeft: 18, display: "grid", gap: 8 }}>
              <li className="panelBody">Kontrollü üyelik ve doğrulanmış tedarikçi yaklaşımı</li>
              <li className="panelBody">Kaliteye göre görünürlük ve kıyaslama</li>
              <li className="panelBody">Mevcut sözleşmelerin korunması</li>
              <li className="panelBody">Yeni / yenilenen SeferPakt kaynaklı işlerde readonly başarı payı</li>
              <li className="panelBody">İyi hizmet veren daha az öder ve daha çok görünür olur</li>
            </ul>
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

        <section ref={contactRef} id="contact" className="card" style={{ marginBottom: 12 }}>
          <div className="panelSectionTitle">{activePreset.title}</div>
          <div className="panelSectionSubtitle" style={{ marginTop: 6 }}>
            {activePreset.summary}
          </div>

          <div className="grid landingContactGrid" style={{ marginTop: 12 }}>
            <textarea
              readOnly
              value={activePreset.body}
              rows={10}
              aria-label={`${activePreset.label} iletişim taslağı`}
              style={{
                width: "100%",
                minHeight: 320,
                resize: "vertical",
                background: "#0c1423",
                color: "#e7eefc",
                border: "1px solid #243654",
                borderRadius: 12,
                padding: 14,
                font: "inherit",
                lineHeight: 1.6,
              }}
            />

            <div className="card" style={{ marginBottom: 0, background: "rgba(10,16,28,.94)" }}>
              <div className="panelSectionTitle">İletişim kanalı</div>
              <div className="panelBody" style={{ marginTop: 10 }}>
                Seçtiğiniz CTA, public landing üzerinde yalnızca yerel taslağı değiştirir. Sunucuya lead kaydı açmaz.
              </div>

              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                <a
                  className="btn primary"
                  href={activeMailto}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
                >
                  E-posta istemcisini aç
                </a>
                <button type="button" className="btn" onClick={() => navigate("/")}>
                  Giriş yap
                </button>
              </div>

              <div className="panelMeta" style={{ marginTop: 12 }}>
                Otomatik üyelik, ödeme, fatura, tahsilat ve signup akışı bu milestone’da kapalıdır.
              </div>
            </div>
          </div>
        </section>

        <footer className="card" style={{ marginBottom: 0 }}>
          <div className="panelSectionTitle">SeferPakt public vitrin</div>
          <div className="panelBody" style={{ marginTop: 8 }}>
            Klasik abonelikli SaaS değil. Pazaryeri + kanıt + Sefer Abi ile servis operasyonunu daha güvenli, daha görünür ve
            daha kontrollü yönetme vitrini.
          </div>
          <div className="panelMeta" style={{ marginTop: 10 }}>
            Mevcut SeferPakt web projesinin public route'u: <code>/landing</code> • Authenticated app akışı ve operasyon panelleri korunur.
          </div>
        </footer>
      </div>
    </div>
  );
}
