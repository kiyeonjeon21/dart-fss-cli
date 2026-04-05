import { writeFileSync } from 'node:fs';
import { DART_BASE_URL } from './config.js';

export interface GlobalOutputOptions {
  pretty?: boolean;
  output?: string;
  fields?: string;
}

function pickFields(data: unknown, fields: string[]): unknown {
  if (Array.isArray(data)) {
    return data.map((item) => pickFields(item, fields));
  }
  if (data !== null && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    // If object has a 'list' array, apply field filtering to list items
    if (Array.isArray(record.list)) {
      return { ...record, list: (record.list as unknown[]).map((item) => pickFields(item, fields)) };
    }
    const result: Record<string, unknown> = {};
    for (const f of fields) {
      if (f in record) {
        result[f] = record[f];
      }
    }
    return result;
  }
  return data;
}

export function formatOutput(data: unknown, opts: GlobalOutputOptions): string {
  let out = data;
  if (opts.fields) {
    const fields = opts.fields.split(',').map((f) => f.trim());
    out = pickFields(data, fields);
  }
  if (opts.pretty) {
    return JSON.stringify(out, null, 2);
  }
  return JSON.stringify(out);
}

export interface DryRunInfo {
  endpoint: string;
  method: 'GET';
  url: string;
  params: Record<string, string>;
}

export function writeDryRun(path: string, params: Record<string, string>, opts: GlobalOutputOptions): void {
  const cleanPath = path.replace(/^\//, '');
  const url = new URL(cleanPath, DART_BASE_URL);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const info: DryRunInfo = {
    endpoint: cleanPath,
    method: 'GET',
    url: url.toString(),
    params,
  };
  const text = JSON.stringify(info, null, 2);
  console.log(text);
}

export function writeOutput(data: unknown, opts: GlobalOutputOptions): void {
  const text = formatOutput(data, opts);
  if (opts.output) {
    writeFileSync(opts.output, text, 'utf-8');
    console.error(`Saved to ${opts.output}`);
  } else {
    console.log(text);
  }
}
