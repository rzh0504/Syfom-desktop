const { spawn } = require('child_process');

const LEGACY_OPENSSL_FLAG = '--openssl-legacy-provider';
const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error('Usage: node scripts/with-legacy-openssl.js <command> [...args]');
  process.exit(1);
}

const existingNodeOptions = process.env.NODE_OPTIONS || '';
const nodeOptions = existingNodeOptions.includes(LEGACY_OPENSSL_FLAG)
  ? existingNodeOptions
  : `${existingNodeOptions} ${LEGACY_OPENSSL_FLAG}`.trim();

const child = spawn(command, args, {
  env: {
    ...process.env,
    NODE_OPTIONS: nodeOptions,
  },
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code || 0);
});

child.on('error', error => {
  console.error(error);
  process.exit(1);
});
