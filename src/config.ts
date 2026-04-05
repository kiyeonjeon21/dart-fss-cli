import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadEnv } from './env.js';

loadEnv();

export const DART_BASE_URL = 'https://opendart.fss.or.kr/api/';

export const CACHE_DIR = join(homedir(), '.dart-fss');
export const CORP_CODE_CACHE_PATH = join(CACHE_DIR, 'corp-codes.json');
export const CORP_CODE_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function getApiKey(optionKey?: string): string {
  const key = optionKey || process.env.DART_API_KEY;
  if (!key) {
    throw new Error('Set the DART_API_KEY environment variable or use the --api-key option. Get a key at https://opendart.fss.or.kr');
  }
  return key;
}
