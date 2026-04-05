export const DART_STATUS_MESSAGES: Record<string, string> = {
  '000': 'OK',
  '010': 'Unregistered API key',
  '011': 'Disabled API key',
  '012': 'IP not allowed',
  '013': 'No data found',
  '014': 'File not found',
  '020': 'Request limit exceeded',
  '021': 'Max company count exceeded (limit: 100)',
  '100': 'Invalid field value',
  '101': 'Unauthorized access',
  '800': 'System maintenance',
  '900': 'Undefined error',
  '901': 'Personal data retention period expired',
};

export class DartApiError extends Error {
  constructor(
    public readonly statusCode: string,
    public readonly dartMessage: string,
  ) {
    const description = DART_STATUS_MESSAGES[statusCode] || 'Unknown error';
    super(`DART API error [${statusCode}]: ${description} — ${dartMessage}`);
    this.name = 'DartApiError';
  }

  toJSON() {
    return {
      error: true,
      code: this.statusCode,
      description: DART_STATUS_MESSAGES[this.statusCode] || 'Unknown error',
      message: this.dartMessage,
    };
  }
}

export function formatErrorJson(err: unknown): string {
  if (err instanceof DartApiError) {
    return JSON.stringify(err.toJSON());
  }
  const message = err instanceof Error ? err.message : String(err);
  return JSON.stringify({ error: true, code: 'CLI_ERROR', message });
}

export function checkDartStatus(data: Record<string, unknown>): Record<string, unknown> {
  const status = data.status as string | undefined;
  if (status && status !== '000') {
    // "No data found" is not an error — return empty list with status 000
    if (status === '013') {
      return { status: '000', message: 'No data found', list: [] };
    }
    throw new DartApiError(status, (data.message as string) || '');
  }
  return data;
}
