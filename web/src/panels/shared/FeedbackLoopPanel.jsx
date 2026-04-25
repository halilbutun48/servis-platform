import PanelChrome from "../../components/PanelChrome";
import FeedbackLoopSection from "../../components/feedback/FeedbackLoopSection";

export default function FeedbackLoopPanel() {
  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <PanelChrome
        title="Geri Bildirim"
        subtitle="Gelişmiş altında açılan ortak geri bildirim alanı. Notlar ve yıldızlar tek döngüde toplanır; Super Admin aynı kayıtları okur."
      />

      <FeedbackLoopSection
        title="Geri Bildirim"
        subtitle="Kısa not bırak, yıldız ver; kayıt Super Admin tarafında tek kuyrukta okunur."
      />
    </div>
  );
}
