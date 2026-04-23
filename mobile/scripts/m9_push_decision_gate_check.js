const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(mobileRoot, relPath), 'utf8');
}

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

console.log('=== M9 PUSH / NOTIFICATION DECISION GATE CHECK ===');

const packageJson = JSON.parse(read('package.json'));
const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };

assert(!deps['expo-notifications'], 'expo-notifications dependency should remain absent');
assert(!deps['react-native-push-notification'], 'react-native-push-notification dependency should remain absent');
assert(!deps['@react-native-firebase/messaging'], '@react-native-firebase/messaging dependency should remain absent');

const realtimeResync = read(path.join('src', 'app', 'useDriverRealtimeResync.js'));
['shift:update', 'route:plan', 'route:progress', 'notif:new', 'ws:ready'].forEach((eventName) => {
  assert(realtimeResync.includes(eventName), `useDriverRealtimeResync should keep listening to ${eventName}`);
});
assert(realtimeResync.includes('connectDriverRealtime'), 'useDriverRealtimeResync should keep websocket realtime wiring');
assert(realtimeResync.includes('scheduleSync'), 'useDriverRealtimeResync should keep debounced sync scheduling');

const appJs = read('App.js');
assert(appJs.includes('useDriverRealtimeResync'), 'App.js should keep driver realtime resync orchestration');
assert(!appJs.includes('expo-notifications'), 'App.js should not add push transport wiring');

const mobileContent = read(path.join('src', 'app', 'MobileAppContent.js'));
assert(mobileContent.includes('selectedShiftId'), 'MobileAppContent should keep current in-app state wiring');

console.log('OK mobile remains websocket-driven for in-app notifications');
console.log('OK no push transport dependency is introduced in the mobile package');
console.log('OK notif:new still drives resync without push infra');
console.log('=== M9 PUSH / NOTIFICATION DECISION GATE CHECK PASS ===');
