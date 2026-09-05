import { inflateRawSync } from 'node:zlib';

export interface ZipEntry {
  name: string;
  data: Buffer;
}

const EOCD_SIG = 0x06054b50;
const CENTRAL_SIG = 0x02014b50;

/**
 * Read a ZIP archive via its central directory.
 *
 * DART returns two shapes of ZIP: corpCode.xml (single entry) and document.xml
 * (one entry per attached filing document), so entries must be walked properly
 * rather than assuming the first local header covers the whole archive.
 */
export function readZipEntries(zipBuffer: ArrayBuffer): ZipEntry[] {
  const buf = Buffer.from(zipBuffer);

  // EOCD lives at the end, after a comment of up to 64KB.
  const searchStart = Math.max(0, buf.length - 65558);
  let eocd = -1;
  for (let i = buf.length - 22; i >= searchStart; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error('Invalid ZIP: end of central directory not found');

  const entryCount = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16);

  const entries: ZipEntry[] = [];
  for (let i = 0; i < entryCount; i++) {
    if (buf.readUInt32LE(ptr) !== CENTRAL_SIG) {
      throw new Error(`Invalid ZIP: bad central directory entry at offset ${ptr}`);
    }
    const compressionMethod = buf.readUInt16LE(ptr + 10);
    const compressedSize = buf.readUInt32LE(ptr + 20);
    const fileNameLength = buf.readUInt16LE(ptr + 28);
    const extraFieldLength = buf.readUInt16LE(ptr + 30);
    const commentLength = buf.readUInt16LE(ptr + 32);
    const localOffset = buf.readUInt32LE(ptr + 42);
    const name = buf.subarray(ptr + 46, ptr + 46 + fileNameLength).toString('utf-8');

    // Local header name/extra lengths can differ from the central directory's.
    const localNameLength = buf.readUInt16LE(localOffset + 26);
    const localExtraLength = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buf.subarray(dataStart, dataStart + compressedSize);

    let data: Buffer;
    if (compressionMethod === 0) {
      data = compressed;
    } else if (compressionMethod === 8) {
      data = inflateRawSync(compressed);
    } else {
      throw new Error(`Unsupported ZIP compression method: ${compressionMethod}`);
    }

    // Directory entries have no content.
    if (!name.endsWith('/')) entries.push({ name, data });

    ptr += 46 + fileNameLength + extraFieldLength + commentLength;
  }

  return entries;
}

/** Decode XML honouring the encoding declared in its prolog (DART filings are often EUC-KR). */
export function decodeXml(data: Buffer): string {
  const prolog = data.subarray(0, 200).toString('latin1');
  const declared = /encoding\s*=\s*["']([\w-]+)["']/i.exec(prolog)?.[1]?.toLowerCase();
  if (declared && declared !== 'utf-8' && declared !== 'utf8') {
    try {
      return new TextDecoder(declared).decode(data);
    } catch {
      // Unknown label — fall through to UTF-8.
    }
  }
  return data.toString('utf-8');
}
