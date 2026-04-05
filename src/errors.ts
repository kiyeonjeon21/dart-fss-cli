const DART_STATUS_MESSAGES: Record<string, string> = {
  '000': '정상',
  '010': '등록되지 않은 키',
  '011': '사용할 수 없는 키',
  '012': '접근할 수 없는 IP',
  '013': '조회된 데이터 없음',
  '014': '파일이 존재하지 않음',
  '020': '요청 제한 초과',
  '021': '조회 가능 회사 수 초과 (최대 100)',
  '100': '필드에 부적합한 값',
  '101': '부적절한 접근',
  '800': '시스템 점검 중',
  '900': '정의되지 않은 오류',
  '901': '개인정보 보유기간 만료',
};

export class DartApiError extends Error {
  constructor(
    public readonly statusCode: string,
    public readonly dartMessage: string,
  ) {
    const description = DART_STATUS_MESSAGES[statusCode] || '알 수 없는 오류';
    super(`DART API 오류 [${statusCode}]: ${description} — ${dartMessage}`);
    this.name = 'DartApiError';
  }
}

export function checkDartStatus(data: { status?: string; message?: string }): void {
  if (data.status && data.status !== '000') {
    throw new DartApiError(data.status, data.message || '');
  }
}
