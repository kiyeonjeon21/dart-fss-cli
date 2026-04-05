import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { XMLParser } from 'fast-xml-parser';
import { CACHE_DIR, CORP_CODE_CACHE_PATH, CORP_CODE_CACHE_MAX_AGE_MS } from './config.js';
import { dartFetch, dartFetchBinary } from './client.js';
import type { CorpCodeEntry } from './types.js';

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
  const buf = Buffer.from(zipBuffer);
  const sig = buf.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  if (sig === -1) throw new Error('Invalid ZIP: no local file header found');

  let compressedSize = buf.readUInt32LE(sig + 18);
  const fileNameLength = buf.readUInt16LE(sig + 26);
  const extraFieldLength = buf.readUInt16LE(sig + 28);
  const compressionMethod = buf.readUInt16LE(sig + 8);
  const dataStart = sig + 30 + fileNameLength + extraFieldLength;

  if (compressedSize === 0) {
    const centralDirSig = buf.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), dataStart);
    if (centralDirSig !== -1) {
      compressedSize = centralDirSig - dataStart;
    } else {
      compressedSize = buf.length - dataStart;
    }
  }

  const compressedData = buf.subarray(dataStart, dataStart + compressedSize);

  if (compressionMethod === 0) {
    return compressedData.toString('utf-8');
  } else if (compressionMethod === 8) {
    const decompressed = inflateRawSync(compressedData);
    return decompressed.toString('utf-8');
  } else {
    throw new Error(`Unsupported ZIP compression method: ${compressionMethod}`);
  }
}

function parseCorpCodeXml(xml: string): CorpCodeEntry[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
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
  writeFileSync(CORP_CODE_CACHE_PATH, JSON.stringify(entries), 'utf-8');
  console.error(`Cache saved: ${entries.length} corporations`);
  return entries;
}

export async function getCorpCodes(apiKey: string): Promise<CorpCodeEntry[]> {
  if (isCacheValid()) {
    const data = readFileSync(CORP_CODE_CACHE_PATH, 'utf-8');
    return JSON.parse(data) as CorpCodeEntry[];
  }
  return refreshCorpCodeCache(apiKey);
}

export async function resolveCorpCode(nameOrCode: string, apiKey: string): Promise<string> {
  if (/^\d{8}$/.test(nameOrCode)) return nameOrCode;

  const entries = await getCorpCodes(apiKey);
  const term = nameOrCode.trim();

  const exact = entries.find(
    (e) => e.corp_name === term || e.stock_code === term || e.korean_name === term || e.stock_name === term,
  );
  if (exact) return exact.corp_code;

  const partial = entries.filter(
    (e) => e.corp_name.includes(term) || (e.korean_name && e.korean_name.includes(term)),
  );
  if (partial.length === 1) return partial[0].corp_code;
  if (partial.length > 1) {
    // If exactly one listed company (has stock_code), prefer it
    const listed = partial.filter((e) => e.stock_code && e.stock_code.length > 0);
    if (listed.length === 1) return listed[0].corp_code;
    const displayName = (e: CorpCodeEntry) => e.korean_name || e.corp_name;
    const matches = partial.slice(0, 10).map((e) => `${e.corp_code} — ${displayName(e)} (${e.stock_code || 'unlisted'})`);
    throw new Error(`Multiple matches for "${term}": ${matches.join(', ')}${partial.length > 10 ? ` ... and ${partial.length - 10} more` : ''}`);
  }

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
