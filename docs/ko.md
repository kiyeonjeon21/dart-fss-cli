# dart-fss-cli 한국어 가이드

금융감독원 [DART Open API](https://opendart.fss.or.kr)의 전체 엔드포인트를 커맨드라인에서 사용할 수 있는 CLI 도구입니다.

## 설치

```bash
curl -fsSL https://raw.githubusercontent.com/kiyeonjeon21/dart-fss-cli/main/install.sh | bash
```

또는 npm으로 직접 설치:

```bash
npm install -g dart-fss-cli
```

## 사전 준비

[DART Open API](https://opendart.fss.or.kr)에서 API 키를 발급받으세요.

```bash
# 환경변수 설정
export DART_API_KEY=your_api_key_here

# 또는 .env 파일 생성
echo "DART_API_KEY=your_api_key_here" > .env
```

## 사용 예시

```bash
# 기업 개황 조회
dart-fss disclosure company --corp "삼성전자" --pretty

# 공시 검색
dart-fss disclosure list --corp "카카오" --from 20240101 --to 20241231

# 직원 현황
dart-fss report employee --corp "삼성전자" --year 2024 --quarter annual

# 단일회사 주요계정 (재무정보)
dart-fss financial single-account --corp "카카오" --year 2024 --quarter annual --pretty

# 대량보유 상황보고
dart-fss equity major-stock --corp "삼성전자" --pretty

# 유상증자 결정
dart-fss major paid-increase --corp "삼성전자" --from 20230101 --to 20241231

# 회사명으로 고유번호 검색
dart-fss lookup "네이버"

# 등록된 전체 엔드포인트 목록
dart-fss endpoints

# 결과를 파일로 저장
dart-fss disclosure company --corp "삼성전자" --output result.json
```

## 커맨드 그룹

| 커맨드 | 설명 | API 수 |
|--------|------|--------|
| `disclosure` | 공시정보 (공시 검색, 기업 개황 등) | 4 |
| `report` | 정기보고서 (직원현황, 임원현황, 배당 등) | 28 |
| `financial` | 재무정보 (재무제표, 재무지표, XBRL) | 7 |
| `equity` | 지분공시 (대량보유, 임원 주요주주) | 2 |
| `major` | 주요사항보고서 (증자/감자, M&A 등) | 36 |
| `securities` | 증권신고서 (지분증권, 채무증권 등) | 6 |

## 글로벌 옵션

| 옵션 | 설명 |
|------|------|
| `--api-key <key>` | DART API 인증키 (기본: `DART_API_KEY` 환경변수) |
| `--pretty` | JSON 출력을 보기 좋게 포맷팅 |
| `--output <file>` | 결과를 파일로 저장 |

## 분기 코드

`--quarter` 옵션에 사용하는 값:

| 값 | 의미 |
|------|------|
| `q1` | 1분기 |
| `half` | 반기 |
| `q3` | 3분기 |
| `annual` | 사업보고서 |

## 프로그래밍 방식 사용

```typescript
import { createDartProgram } from 'dart-fss-cli';

const program = createDartProgram();
await program.parseAsync(['node', 'dart-fss', 'disclosure', 'company', '--corp', '삼성전자', '--pretty']);
```
