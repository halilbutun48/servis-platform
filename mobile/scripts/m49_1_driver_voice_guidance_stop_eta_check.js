import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const app = fs.readFileSync(path.join(root, 'App.js'), 'utf8');
const storage = fs.readFileSync(path.join(root, 'src/lib/storage.js'), 'utf8');
const voice = fs.readFileSync(path.join(root, 'src/lib/voice.js'), 'utf8');
const today = fs.readFileSync(path.join(root, 'src/screens/TodayScreen.js'), 'utf8');

function ok(msg){ console.log(`OK ${msg}`); }
function must(cond,msg){ if(!cond) throw new Error(`FAIL ${msg}`); ok(msg); }

console.log('=== M49.1 DRIVER VOICE GUIDANCE + STOP ETA CHECK ===');
must(Boolean(pkg.dependencies['expo-speech']), 'expo-speech dependency present');
must(Boolean(pkg.scripts['check:m49.1']), 'm49.1 script present in package json');
must(String(pkg.scripts['check:m49.1']).includes('m49_1_driver_voice_guidance_stop_eta_check.js'), 'm49.1 script target');
must(app.includes('getVoiceGuidanceEnabled'), 'app loads voice guidance preference');
must(app.includes('saveVoiceGuidanceEnabled'), 'app saves voice guidance preference');
must(app.includes('speakNextStop'), 'app can speak next stop');
must(app.includes('speakStopEta'), 'app can speak eta');
must(app.includes('speakShiftWelcome'), 'app can speak shift welcome summary');
must(app.includes('speakRouteCompleted'), 'app can speak route completion');
must(app.includes('buildVoiceCueKey'), 'app uses voice cue dedupe');
must(storage.includes('VOICE_ENABLED_KEY'), 'storage has voice guidance key');
must(voice.includes('expo-speech'), 'voice helper imports expo-speech');
must(voice.includes("language: 'tr-TR'"), 'voice helper uses Turkish language');
must(voice.includes('Sesli yardıma hoş geldiniz'), 'voice helper has welcome summary');
must(voice.includes('Güzergâh tamamlandı'), 'voice helper has completion line');
must(today.includes('Sesli rehber'), 'today screen has voice guidance card');
must(today.includes('Siradaki duragi oku'), 'today screen has read next stop action');
must(today.includes('ETA oku'), 'today screen has eta action');
must(today.includes('Durak ETA'), 'today screen shows stop eta');
must(today.includes('Tam rotayi navigasyonda ac'), 'today screen has full route navigation action');
console.log('=== M49.1 DRIVER VOICE GUIDANCE + STOP ETA CHECK PASS ===');
