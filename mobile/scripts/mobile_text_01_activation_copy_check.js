const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(mobileRoot, '..');

function read(rel, root = mobileRoot) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function normalize(text) {
  return String(text || '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function has(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

function must(cond, msg) {
  if (!cond) throw new Error(`FAIL ${msg}`);
  ok(msg);
}

function mustNot(text, needle, msg) {
  if (has(text, needle)) throw new Error(`FAIL ${msg}`);
  ok(msg);
}

function stripComments(text) {
  return String(text || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

console.log('=== MOBILE-TEXT-01 ACTIVATION COPY CHECK ===');

const rootPkg = JSON.parse(read('package.json', repoRoot));
const mobilePkg = JSON.parse(read('package.json'));
const personelState = read('src/app/personelActivationState.js');
const parentState = read('src/app/parentActivationState.js');
const personelCard = read('src/screens/PersonelActivationCard.js');
const parentCard = read('src/screens/ParentActivationCard.js');
const boardingCard = read('src/screens/BoardingChangeCard.js');
const liveScreen = read('src/screens/LiveScreen.js');
const primer = read('docs/PRIMER_SSOT.md', repoRoot);
const registry = read('docs/MILESTONE_REGISTRY_V1.md', repoRoot);
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md', repoRoot);
const backlog = read('docs/NEXT_BACKLOG_V1.md', repoRoot);
const boardingVisible = stripComments(boardingCard);

const targetText = [
  personelState,
  parentState,
  personelCard,
  parentCard,
  boardingVisible,
].join('\n');

must(has(JSON.stringify(rootPkg.scripts || {}), 'check:mobiletext01'), 'root package exposes check:mobiletext01');
must(has(JSON.stringify(rootPkg.scripts || {}), 'verify:final'), 'root package keeps verify:final');
must(has(JSON.stringify(mobilePkg.scripts || {}), 'check:mobiletext01'), 'mobile package exposes check:mobiletext01');
must(has(JSON.stringify(mobilePkg.scripts || {}), 'check:m1'), 'mobile package keeps check:m1');
must(has(JSON.stringify(mobilePkg.scripts || {}), 'acceptance:mobile'), 'mobile package keeps acceptance:mobile');
must(has(mobilePkg.scripts?.['acceptance:mobile'] || '', 'check:mobiletext01'), 'acceptance chain includes check:mobiletext01');

must(has(personelState, 'Kullanıcı kodu ve PIN ile giriş yapılır.'), 'personel state keeps code+PIN copy');
must(has(personelState, 'İlk girişte PIN/şifre değişimi gerekli'), 'personel state keeps first login guidance');
must(has(personelState, 'Hesap pasife alınırsa canlı takip kapanır'), 'personel state keeps live tracking wording');
must(has(personelCard, 'Kullanıcı kodu ve PIN ile giriş yapılır; ilk girişte şifre değiştirme ekranı açılır ve cihaz eşleşmesi korunur.'), 'personel card keeps updated subtitle');
must(has(personelCard, 'Bu aşama mobil model seviyesindedir.'), 'personel card keeps model-only scope');
must(has(personelCard, 'Canlı takip yetkisi rolüne göre açılır.'), 'personel card keeps live tracking role copy');
must(has(personelCard, 'İlk girişte şifre değiştirme ekranı açılır.'), 'personel card keeps first password screen line');

must(has(parentState, 'Kullanıcı kodu ve PIN ile giriş yapılır.'), 'parent state keeps code+PIN copy');
must(has(parentState, 'İlk girişte PIN/şifre değişimi gerekli'), 'parent state keeps first login guidance');
must(has(parentState, 'Canlı takip yetkisi rolüne göre açılır.'), 'parent state keeps live tracking role copy');
must(has(parentCard, 'Davet, ilk giriş ve ilişki kapanışı burada özetlenir. Kullanıcı kodu ve PIN ile giriş yapılır.'), 'parent card keeps updated subtitle');
must(has(parentCard, 'Kullanıcı kodu ve PIN ile giriş yapılır.'), 'parent card keeps code+PIN line');
must(has(parentCard, 'İlk girişte şifre değiştirme ekranı açılır.'), 'parent card keeps first password screen line');
must(has(parentCard, 'Canlı takip yetkisi rolüne göre açılır.'), 'parent card keeps live tracking role line');

must(has(boardingVisible, 'Değişiklik isteği operasyon ekranında görünür.'), 'boarding card keeps operation-screen wording');
must(has(boardingVisible, 'Uygun düşük riskli istekler otomatik kabul edilebilir; geç kalan veya riskli isteklerde operasyon kontrolü gerekir.'), 'boarding card keeps risk guidance wording');
must(has(boardingVisible, 'Sürücüye bildirim gönderilir. Durum bu ekranda güncellenir.'), 'boarding card keeps update wording');
mustNot(boardingVisible, 'mobil yerel istek modeli', 'boarding card removes mobile local request wording');
mustNot(boardingVisible, 'sonraki halkada backend', 'boarding card removes backend next-layer wording');
mustNot(boardingVisible, 'sonraki halkada panellere', 'boarding card removes panel next-layer wording');

mustNot(targetText, 'sonraki halkada', 'activation copy removes next-layer wording');
mustNot(targetText, 'bağlanır', 'activation copy removes binding-next wording');
mustNot(targetText, 'backend akışı', 'activation copy removes backend flow wording');
mustNot(targetText, 'kesin yetkilendirme', 'activation copy removes firm authorization wording');
mustNot(targetText, 'mobil yerel istek modeli', 'activation copy removes mobile local request wording');
mustNot(targetText, 'raw', 'activation copy avoids raw wording');
mustNot(targetText, 'payload', 'activation copy avoids payload wording');
mustNot(targetText, 'token', 'activation copy avoids token wording');
mustNot(targetText, 'hash', 'activation copy avoids hash wording');
mustNot(targetText, 'debug', 'activation copy avoids debug wording');
mustNot(targetText, 'driver GPS', 'activation copy avoids driver GPS wording');
mustNot(targetText, 'agreement', 'activation copy avoids agreement wording');

must(
  has(liveScreen, 'Sürücünün telefon GPS’i') || has(liveScreen, "Sürücünün telefon GPS'i"),
  'live screen keeps driver phone GPS wording'
);

must(has(primer, 'MOBILE-TEXT-01'), 'primer mentions MOBILE-TEXT-01');
must(has(primer, 'green/closed'), 'primer marks mobile text closed');
must(has(registry, 'MOBILE-TEXT-01 - green/closed'), 'registry marks mobile text closed');
must(has(guide, 'check:mobiletext01'), 'script guide exposes mobile text check');
must(
  has(backlog, 'MOBILE-TEXT-01 green/closed') || has(backlog, '`MOBILE-TEXT-01` green/closed'),
  'backlog marks mobile text closed'
);
mustNot(backlog, 'upcoming: `MOBILE-TEXT-01`', 'backlog removes mobile text from upcoming list');

console.log('MOBILE-TEXT-01 activation copy check passed');
