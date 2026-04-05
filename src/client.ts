import { DART_BASE_URL } from './config.js';
import { checkDartStatus } from './errors.js';

export interface FetchOptions {
  apiKey: string;
  path: string;
  params?: Record<string, string>;
}

function buildUrl(path: string): URL {
  const cleanPath = path.replace(/^\//, '');
  return new URL(cleanPath, DART_BASE_URL);
}

export async function dartFetch(opts: FetchOptions): Promise<Record<string, unknown>> {
  const url = buildUrl(opts.path);
  url.searchParams.set('crtfc_key', opts.apiKey);
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== '') {
        url.searchParams.set(k, v);
      }
    }
  }

  const res = await fetch(url.toString());

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText} — ${url.pathname}`);
  }

  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = await res.json() as Record<string, unknown>;
    return checkDartStatus(data);
  }

  throw new Error(`Unexpected content-type: ${contentType}. Binary endpoints should use dartFetchBinary().`);
}

export async function dartFetchBinary(opts: FetchOptions): Promise<ArrayBuffer> {
  const url = buildUrl(opts.path);
  url.searchParams.set('crtfc_key', opts.apiKey);
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== '') {
        url.searchParams.set(k, v);
      }
    }
  }

  const res = await fetch(url.toString());

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText} — ${url.pathname}`);
  }

  const buf = await res.arrayBuffer();

  const header = new Uint8Array(buf.slice(0, 4));
  const isZip = header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04;

  if (!isZip) {
    const text = new TextDecoder().decode(buf);
    try {
      const data = JSON.parse(text) as Record<string, unknown>;
      checkDartStatus(data as { status?: string; message?: string });
    } catch {
      // Not JSON
    }
    throw new Error(`DART API error: expected ZIP file but got: ${text.slice(0, 200)}`);
  }

  return buf;
}
