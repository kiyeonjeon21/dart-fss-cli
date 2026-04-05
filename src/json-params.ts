export function parseJsonParams(jsonStr: string): Record<string, string> {
  try {
    return JSON.parse(jsonStr);
  } catch {
    console.error('Error: Invalid JSON in --json parameter');
    process.exit(1);
  }
}
