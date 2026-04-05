import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

let loaded = false;

/** Load .env file from project root (searches upward from cwd) and ~/.dart-fss/ */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;

  const candidates = [
    process.cwd(),
    resolve(process.cwd(), '..'),
    resolve(import.meta.dirname, '..'),
    join(homedir(), '.dart-fss'),
  ];
  for (const base of candidates) {
    const envPath = join(base, '.env');
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
      break;
    }
  }
}
