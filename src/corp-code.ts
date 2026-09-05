import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { XMLParser } from 'fast-xml-parser';
import { CACHE_DIR, CORP_CODE_CACHE_PATH, CORP_CODE_CACHE_MAX_AGE_MS } from './config.js';
import { dartFetch, dartFetchBinary } from './client.js';
import { readZipEntries, decodeXml } from './zip.js';
import type { CorpCodeEntry } from './types.js';

/** Bumped when the cached entry shape changes, to force a refresh of stale caches. */
const CACHE_VERSION = 2;

interface CorpCodeCache {
  version: number;
  entries: CorpCodeEntry[];
}

function isNonKoreanName(name: string): boolean {
  return !/[\uAC00-\uD7AF]/.test(name);
}

function ensureCacheDir(): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function isCacheValid(): boolean {
  if (!existsSync(CORP_CODE_CACHE_PATH)) return false;
  const stat = statSync(CORP_CODE_CACHE_PATH);
  return Date.now() - stat.mtimeMs < CORP_CODE_CACHE_MAX_AGE_MS;
}

function extractXmlFromZip(zipBuffer: ArrayBuffer): string {
  const entries = readZipEntries(zipBuffer);
  if (entries.length === 0) throw new Error('Invalid ZIP: archive contains no files');
  return decodeXml(entries[0].data);
}

function parseCorpCodeXml(xml: string): CorpCodeEntry[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    // Without this, fast-xml-parser coerces "005930" to the number 5930 and the
    // leading zeros of every stock_code are lost.
    parseTagValue: false,
    isArray: (name) => name === 'list',
  });
  const parsed = parser.parse(xml);
  const items = parsed?.result?.list || [];
  return items.map((item: Record<string, unknown>) => ({
    corp_code: String(item.corp_code || '').padStart(8, '0'),
    corp_name: String(item.corp_name || ''),
    stock_code: String(item.stock_code || ''),
    modify_date: String(item.modify_date || ''),
  }));
}

export async function refreshCorpCodeCache(apiKey: string): Promise<CorpCodeEntry[]> {
  console.error('Refreshing corp_code cache... (downloading ZIP)');
  const zipData = await dartFetchBinary({ apiKey, path: '/corpCode.xml' });
  console.error(`ZIP downloaded (${(zipData.byteLength / 1024 / 1024).toFixed(1)} MB)`);

  const xml = extractXmlFromZip(zipData);
  const entries = parseCorpCodeXml(xml);

  // Enrich listed companies that have non-Korean names with Korean name from /company.json
  const needsEnrichment = entries.filter(
    (e) => e.stock_code && e.stock_code.trim() !== '' && isNonKoreanName(e.corp_name),
  );
  if (needsEnrichment.length > 0) {
    console.error(`Enriching ${needsEnrichment.length} listed companies with Korean names...`);
    for (const entry of needsEnrichment) {
      try {
        const data = await dartFetch({ apiKey, path: '/company.json', params: { corp_code: entry.corp_code } });
        entry.korean_name = String(data.corp_name || '');
        entry.stock_name = String(data.stock_name || '');
      } catch {
        // Skip if company endpoint fails
      }
    }
    console.error('Enrichment complete.');
  }

  ensureCacheDir();
  const cache: CorpCodeCache = { version: CACHE_VERSION, entries };
  writeFileSync(CORP_CODE_CACHE_PATH, JSON.stringify(cache), 'utf-8');
  console.error(`Cache saved: ${entries.length} corporations`);
  return entries;
}

function readCache(): CorpCodeEntry[] | null {
  try {
    const parsed = JSON.parse(readFileSync(CORP_CODE_CACHE_PATH, 'utf-8')) as unknown;
    // Pre-v2 caches were a bare array with stock_code leading zeros stripped.
    if (!parsed || Array.isArray(parsed)) return null;
    const cache = parsed as CorpCodeCache;
    if (cache.version !== CACHE_VERSION || !Array.isArray(cache.entries)) return null;
    return cache.entries;
  } catch {
    return null;
  }
}

export async function getCorpCodes(apiKey: string): Promise<CorpCodeEntry[]> {
  if (isCacheValid()) {
    const entries = readCache();
    if (entries) return entries;
  }
  return refreshCorpCodeCache(apiKey);
}

const isListed = (e: CorpCodeEntry) => Boolean(e.stock_code && e.stock_code.trim() !== '');
const displayName = (e: CorpCodeEntry) => e.korean_name || e.corp_name;

/**
 * Narrow a candidate set to a single corp_code.
 *
 * DART reuses company names across defunct and active entities (e.g. "카카오" is
 * both unlisted 00918444 and listed 00258801), so a listed match always wins.
 * Anything still ambiguous raises rather than silently picking one, because a
 * wrong corp_code returns an empty result set that reads as "no data".
 */
function disambiguate(candidates: CorpCodeEntry[], term: string): string {
  if (candidates.length === 1) return candidates[0].corp_code;

  const listed = candidates.filter(isListed);
  if (listed.length === 1) return listed[0].corp_code;

  const pool = listed.length > 1 ? listed : candidates;
  const matches = pool
    .slice(0, 10)
    .map((e) => `${e.corp_code} — ${displayName(e)} (${e.stock_code || 'unlisted'})`);
  throw new Error(
    `Multiple matches for "${term}": ${matches.join(', ')}` +
      (pool.length > 10 ? ` ... and ${pool.length - 10} more` : '') +
      '. Pass an 8-digit corp_code to disambiguate.',
  );
}

export async function resolveCorpCode(nameOrCode: string, apiKey: string): Promise<string> {
  if (/^\d{8}$/.test(nameOrCode)) return nameOrCode;

  const entries = await getCorpCodes(apiKey);
  const term = nameOrCode.trim();

  const exact = entries.filter(
    (e) => e.corp_name === term || e.stock_code === term || e.korean_name === term || e.stock_name === term,
  );
  if (exact.length > 0) return disambiguate(exact, term);

  const partial = entries.filter(
    (e) => e.corp_name.includes(term) || (e.korean_name && e.korean_name.includes(term)),
  );
  if (partial.length > 0) return disambiguate(partial, term);

  throw new Error(`No corporation found for "${term}".`);
}

export async function lookupCorpCode(term: string, apiKey: string): Promise<CorpCodeEntry[]> {
  const entries = await getCorpCodes(apiKey);
  return entries.filter(
    (e) =>
      e.corp_name.includes(term) ||
      e.corp_code === term ||
      e.stock_code === term ||
      (e.korean_name && e.korean_name.includes(term)) ||
      (e.stock_name && e.stock_name.includes(term)),
  );
}
