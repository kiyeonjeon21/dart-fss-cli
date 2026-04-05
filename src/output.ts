import { writeFileSync } from 'node:fs';

export interface GlobalOutputOptions {
  pretty?: boolean;
  output?: string;
}

export function formatOutput(data: unknown, opts: GlobalOutputOptions): string {
  if (opts.pretty) {
    return JSON.stringify(data, null, 2);
  }
  return JSON.stringify(data);
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
