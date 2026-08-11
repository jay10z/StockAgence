/**
 * Starts local API (3001) + Vite (5173) together.
 * Use this instead of `npx vercel dev` on your machine.
 */
import { spawn } from 'child_process';
import { resolve } from 'path';

const children = [];

function run(command, args, name) {
  const child = spawn(command, args, {
    cwd: resolve(process.cwd()),
    stdio: 'inherit',
    shell: true,
    env: { ...process.env },
  });
  child.on('exit', (code) => {
    console.log(`[${name}] stopped (${code})`);
    for (const c of children) {
      try {
        c.kill('SIGTERM');
      } catch {
        /* ignore */
      }
    }
    process.exit(code || 0);
  });
  children.push(child);
}

run('node', ['scripts/local-api.mjs'], 'api');
run('npx', ['vite', '--port', '5173', '--host'], 'vite');

process.on('SIGINT', () => {
  for (const c of children) c.kill('SIGTERM');
  process.exit(0);
});
