import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(currentDir, "FinancialOperationsPanel.jsx"), "utf8");

test("ROOM aylık fiyat referansı geçmiş fiyatı, dönem maliyetini ve teklif tabanını ayırır", () => {
  assert.match(source, /data-testid="room-monthly-price-reference"/);
  assert.match(source, /data-testid="room-monthly-price-reference-primary-summary"/);
  assert.match(source, /data-testid="room-platform-price-reference-card"/);
  assert.match(source, /data-testid="room-platform-price-reference-average"/);
  assert.match(source, /data-testid="room-platform-price-reference-range"/);
  assert.match(source, /room-monthly-price-reference-primary-metric/);
  assert.match(source, /Kabul edilmiş geçmiş ticari fiyat/);
  assert.match(source, /Hizmet maliyeti ve fiyat referansı/);
  assert.match(source, /Tahmini hizmet dönemi maliyeti/);
  assert.match(source, /Önerilen en düşük teklif/);
  assert.match(source, /data-testid="room-selected-service-period"/);
  assert.match(source, /haftalık hesap aylık toplam değildir/);
  assert.match(source, /geçmiş ROOM anlaşması ve kayıtlı senaryo ayrı tutulur/);
  assert.match(source, /gerçekleşmiş gider veya kesin net kâr değildir/);
  assert.match(source, /Önceki kayıtlı planlama senaryosu/);
  assert.match(source, /güncel gerçekleşmiş gider değildir/);
  assert.match(source, /Geçmiş kayıt kapsamı tam doğrulanmadığı için fiyat farkı/);
  assert.match(source, /Karşılaştırılabilir geçmiş kayıtla dönem farkı hesaplandı/);
});

test("ROOM aylık referans kartı teknik enum yerine kullanıcı dili ve eksik kanıt sunar", () => {
  assert.match(source, /Hizmet maliyeti ve fiyat referansı/);
  assert.match(source, /Eksik veya doğrulanmamış bilgi/);
  assert.match(source, /Maliyet bileşenlerini göster/);
  assert.match(source, /FinanceRiskBadge/);
  assert.match(source, /sourceLabel/);
  assert.match(source, /referenceMissing/);
  assert.match(source, /Gerçekleşmiş gider değildir/);
  assert.match(source, /Pazarlık adımlarının tamamı kayıtlı değil/);
  assert.match(source, /Kabul edilmiş sözleşme fiyatı/);
  assert.match(source, /Platform geçmiş anlaşma referansı şu anda kapalı/);
});

test("ROOM aylık referans kartı kanıtlı aylık maliyet değişimini ayrı gösterir", () => {
  assert.match(source, /Aylık maliyet değişimi/);
  assert.match(source, /Önceki dönem maliyeti/);
  assert.match(source, /Güncel dönem maliyeti/);
  assert.match(source, /Aylık değişimi oluşturan giderler/);
  assert.match(source, /monthlyCostChange/);
});
