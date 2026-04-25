import PanelChrome from "../../components/PanelChrome";
import FeedbackLoopSection from "../../components/feedback/FeedbackLoopSection";
import { useSession } from "../../state/session";

export default function FeedbackLoopPanel() {
  const { me } = useSession();
  const reviewOnly = me?.role === "SUPER_ADMIN";

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <PanelChrome
        title={reviewOnly ? "Gelen Geri Bildirimler" : "Geri Bildirim"}
        subtitle={
          reviewOnly
            ? "Sahadan gelen notları, yıldızları ve durumları Super Admin buradan okur ve değerlendirir."
            : "Gelişmiş altında açılan ortak geri bildirim alanı. Notlar ve yıldızlar tek döngüde toplanır; Super Admin aynı kayıtları okur."
        }
      />

      <FeedbackLoopSection
        title={reviewOnly ? "Gelen Kayıtlar" : "Geri Bildirim"}
        subtitle={
          reviewOnly
            ? "Burada yazı alanı yok; kayıtları oku, durumlandır ve kapat."
            : "Kısa not bırak, yıldız ver; kayıt Super Admin tarafında tek kuyrukta okunur."
        }
        mode={reviewOnly ? "review" : "write"}
      />
    </div>
  );
}
