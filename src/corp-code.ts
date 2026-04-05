import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { XMLParser } from 'fast-xml-parser';
import { CACHE_DIR, CORP_CODE_CACHE_PATH, CORP_CODE_CACHE_MAX_AGE_MS } from './config.js';
import { dartFetchBinary } from './client.js';
import type { CorpCodeEntry } from './types.js';

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
  console.error('corp_code 캐시를 갱신합니다... (ZIP 다운로드 중)');
  const zipData = await dartFetchBinary({ apiKey, path: '/corpCode.xml' });
  console.error(`ZIP 다운로드 완료 (${(zipData.byteLength / 1024 / 1024).toFixed(1)} MB)`);

  const xml = extractXmlFromZip(zipData);
  const entries = parseCorpCodeXml(xml);

  ensureCacheDir();
  writeFileSync(CORP_CODE_CACHE_PATH, JSON.stringify(entries), 'utf-8');
  console.error(`캐시 저장 완료: ${entries.length}개 기업`);
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

  const exact = entries.find((e) => e.corp_name === term || e.stock_code === term);
  if (exact) return exact.corp_code;

  const partial = entries.filter((e) => e.corp_name.includes(term));
  if (partial.length === 1) return partial[0].corp_code;
  if (partial.length > 1) {
    console.error(`"${term}" 검색 결과가 여러 개입니다:`);
    partial.slice(0, 10).forEach((e) => {
      console.error(`  ${e.corp_code} — ${e.corp_name} (${e.stock_code || '비상장'})`);
    });
    if (partial.length > 10) console.error(`  ... 외 ${partial.length - 10}건`);
    process.exit(1);
  }

  console.error(`"${term}"에 해당하는 기업을 찾을 수 없습니다.`);
  process.exit(1);
}

export async function lookupCorpCode(term: string, apiKey: string): Promise<CorpCodeEntry[]> {
  const entries = await getCorpCodes(apiKey);
  return entries.filter(
    (e) => e.corp_name.includes(term) || e.corp_code === term || e.stock_code === term,
  );
}
