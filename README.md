# dart-fss-cli

[![npm version](https://img.shields.io/npm/v/dart-fss-cli)](https://www.npmjs.com/package/dart-fss-cli)
[![license](https://img.shields.io/npm/l/dart-fss-cli)](LICENSE)

금융감독원 [DART Open API](https://opendart.fss.or.kr)의 **83개 전체 엔드포인트**를 커맨드라인에서 사용할 수 있는 CLI.

사람이 직접 쓰기에도, AI 에이전트(Claude Code 등)에게 시키기에도 좋게 설계했습니다.

**[Demo & 사용 예시](DEMO.md)** | **[AI 에이전트 연동 가이드](AGENTS.md)** | **[한국어 가이드](docs/ko.md)**

## 설치

```bash
npx dart-fss-cli --help
```

설치 없이 바로 실행됩니다. 글로벌 설치를 원하면:

```bash
npm install -g dart-fss-cli
```

## 사전 준비

[DART Open API](https://opendart.fss.or.kr)에서 API 키를 발급받으세요.

```bash
export DART_API_KEY=your_api_key_here
```

## 사용 예시

```bash
# 회사 검색
dart-fss lookup "삼성전자"

# 기업 개황
dart-fss disclosure company --corp "삼성전자" --pretty

# 공시 검색
dart-fss disclosure list --corp "카카오" --from 20250101 --to 20260101

# 직원 현황 (필요한 필드만)
dart-fss report employee --corp "삼성전자" --year 2025 --quarter annual \
  --fields "sexdstn,fo_bbm,sm,avrg_cnwk_sdytrn"

# 재무제표
dart-fss financial single-account --corp "SK하이닉스" --year 2025 --quarter annual --pretty

# 대량보유 상황
dart-fss equity major-stock --corp "네이버"

# 전환사채 발행 이력
dart-fss major convertible-bond --corp "카카오" --from 20230101 --to 20251231

# 결과를 파일로 저장
dart-fss disclosure company --corp "삼성전자" --output result.json
```

> 한글 회사명을 그대로 입력하면 됩니다. 영문 등록 회사(NAVER, LG 등)도 한글로 검색 가능합니다.

## 커맨드 그룹

| 커맨드 | 설명 | API 수 |
|--------|------|--------|
| `disclosure` | 공시정보 (공시 검색, 기업 개황 등) | 4 |
| `report` | 정기보고서 (직원현황, 임원현황, 배당 등) | 28 |
| `financial` | 재무정보 (재무제표, 재무지표, XBRL) | 7 |
| `equity` | 지분공시 (대량보유, 임원 주요주주) | 2 |
| `major` | 주요사항보고서 (증자/감자, M&A 등) | 36 |
| `securities` | 증권신고서 (지분증권, 채무증권 등) | 6 |

## 주요 옵션

| 옵션 | 설명 |
|------|------|
| `--pretty` | JSON 보기 좋게 출력 |
| `--fields <f1,f2>` | 응답 필드 필터링 (context window 절약) |
| `--dry-run` | API 호출 없이 파라미터 검증 |
| `--output <file>` | 결과를 파일로 저장 |
| `--json <params>` | raw API 파라미터를 JSON으로 직접 전달 |
| `--api-key <key>` | API 키 (기본: `DART_API_KEY` 환경변수) |

## 분기 코드

`--quarter` 옵션에 사용하는 값:

| 값 | 의미 |
|------|------|
| `q1` | 1분기 |
| `half` | 반기 |
| `q3` | 3분기 |
| `annual` | 사업보고서 |

## AI 에이전트 연동

dart-fss-cli는 AI 에이전트가 스스로 API를 탐색하고 호출할 수 있도록 설계되었습니다.

```bash
# 엔드포인트 탐색 (파이프 시 자동 JSON)
dart-fss endpoints --json-output

# 파라미터 스키마 조회
dart-fss schema dividend

# API 호출 없이 검증
dart-fss report dividend --corp "삼성전자" --year 2025 --quarter annual --dry-run

# 에러도 JSON
# {"error":true,"code":"013","description":"No data found","message":"..."}
```

Claude Code의 `CLAUDE.md`에 추가하면 자연어로 DART 데이터를 조회할 수 있습니다:

```markdown
## Available Tools

dart-fss-cli가 설치되어 있습니다. 한국 기업의 공시 정보가 필요하면 사용하세요.

- `dart-fss endpoints --json-output` — 사용 가능한 API 목록
- `dart-fss schema <endpoint>` — API 파라미터 확인
- `dart-fss lookup <회사명>` — 회사 코드 검색
- 항상 `--fields`로 필요한 필드만 요청하세요
- 예시: `dart-fss report employee --corp "삼성전자" --year 2025 --quarter annual --fields "corp_name,sm"`
```

자세한 내용은 [AGENTS.md](AGENTS.md)와 [DEMO.md](DEMO.md)를 참고하세요.

## 프로그래밍 방식 사용

```typescript
import { createDartProgram } from 'dart-fss-cli';

const program = createDartProgram();
await program.parseAsync([
  'node', 'dart-fss',
  'disclosure', 'company',
  '--corp', '삼성전자',
  '--pretty'
]);
```

## License

MIT
