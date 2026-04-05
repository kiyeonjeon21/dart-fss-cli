export function parseJsonParams(jsonStr: string): Record<string, string> {
  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new Error('Invalid JSON in --json parameter');
  }
}
