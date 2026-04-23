const { spawnSync } = require('child_process');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: mobileRoot,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status || 1;
    throw new Error(`${command} ${args.join(' ')} failed.`);
  }
}

console.log('=== M10 MOBILE FIELD ACCEPTANCE PACK ===');
if (process.platform === 'win32') {
  run('cmd.exe', ['/d', '/s', '/c', 'npm run check:m1']);
  run('cmd.exe', ['/d', '/s', '/c', 'npm run check:m9']);
} else {
  run('npm', ['run', 'check:m1']);
  run('npm', ['run', 'check:m9']);
}
console.log('=== M10 MOBILE FIELD ACCEPTANCE PACK PASS ===');
