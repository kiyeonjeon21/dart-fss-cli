# dart-fss-cli Demo

DART Open API의 83개 엔드포인트를 터미널에서 바로 쓸 수 있는 CLI.
사람이 직접 쓰기도 좋고, AI 에이전트한테 시키기에도 좋습니다.

> 에이전트 연동 가이드는 [AGENTS.md](AGENTS.md) 참고

---

## 0. 설치 & 준비

```bash
# 설치
curl -fsSL https://raw.githubusercontent.com/kiyeonjeon21/dart-fss-cli/main/install.sh | bash

# API 키 설정 (https://opendart.fss.or.kr 에서 발급)
export DART_API_KEY=your_key
```

---

## 1. 회사 검색

```bash
dart-fss lookup "삼성전자"
```

```json
[
  { "corp_code": "00126380", "corp_name": "삼성전자", "stock_code": "005930" }
]
```

```bash
# 부분 검색도 가능
dart-fss lookup "카카오"
```

```json
[
  { "corp_code": "00258801", "corp_name": "카카오", "stock_code": "035720" },
  { "corp_code": "00783965", "corp_name": "카카오뱅크", "stock_code": "323410" },
  { "corp_code": "01011508", "corp_name": "카카오페이", "stock_code": "377300" },
  ...
]
```

> 모든 `--corp` 옵션에는 회사명을 그대로 넣으면 됩니다. 고유번호 자동 변환.
> 영문으로 등록된 회사(NAVER, LG 등)도 한글("네이버", "엘지")로 검색 가능합니다.

---

## 2. 기업 개황

```bash
dart-fss disclosure company --corp "삼성전자" --pretty
```

```json
{
  "corp_name": "삼성전자(주)",
  "ceo_nm": "전영현, 노태문",
  "adres": "경기도 수원시 영통구 삼���로 129",
  "est_dt": "19690113",
  ...
}
```

---

## 3. 공시 검색

```bash
# 삼성전자 2025~2026년 최신 공시
dart-fss disclosure list --corp "삼성전자" --from 20250101 --to 20260401 --count 5 \
  --fields "report_nm,rcept_dt"
```

```json
{"list":[
  {"report_nm":"주식소각결정","rcept_dt":"20260331"},
  {"report_nm":"자기주식처분결과보고서","rcept_dt":"20260325"},
  ...
]}
```

---

## 4. 정기보고서 — 직원, 임원, 배당, 감사

```bash
# 삼성전자 2025년 직원 현황 (필요한 필드만)
dart-fss report employee --corp "삼성전자" --year 2025 --quarter annual \
  --fields "sexdstn,fo_bbm,sm,avrg_cnwk_sdytrn"

# 네이버 2025년 임원 보수
dart-fss report exec-pay-individual --corp "네이버" --year 2025 --quarter annual \
  --fields "nm,ofcps,mendng_totamt"

# SK하이닉스 2025년 감사 의견
dart-fss report auditor-opinion --corp "SK하이닉스" --year 2025 --quarter annual \
  --fields "bsns_year,adtor,adt_opinion,core_adt_matter" --pretty
```

---

## 5. 재무제표 — `--fields`로 핵심만

```bash
# 삼성전자 2025년 — 계정명과 당기 금액만
dart-fss financial single-account --corp "삼성전자" --year 2025 --quarter annual \
  --fields "account_nm,thstrm_amount,fs_div"
```

```json
{"list":[
  {"account_nm":"매출액","thstrm_amount":"333,605,938,000,000","fs_div":"CFS"},
  {"account_nm":"영업이익","thstrm_amount":"43,601,051,000,000","fs_div":"CFS"},
  {"account_nm":"당기순이익(손실)","thstrm_amount":"45,206,805,000,000","fs_div":"CFS"},
  ...
]}
```

```bash
# 전체 재무제표 (연결 기준)
dart-fss financial full-statement --corp "삼성전자" --year 2025 --quarter annual --fs-div CFS --pretty

# 여러 회사 비교 (corp_code 직접 지정, 최대 100개)
dart-fss financial multi-account --corp "00126380,00164779" --year 2025 --quarter annual \
  --fields "corp_name,account_nm,thstrm_amount"
```

---

## 6. 주요사항 보고서 — M&A, 증자, 소송

```bash
# 삼성전자의 2023~2025년 전환사채
dart-fss major convertible-bond --corp "삼성전자" --from 20230101 --to 20251231

# 카카오 소송 이력
dart-fss major lawsuit --corp "카카오" --from 20230101 --to 20251231 --pretty
```

---

## 7. 지분 공시

```bash
dart-fss equity major-stock --corp "삼성전자" --fields "repror,stkqy,stkrt"
dart-fss equity executive-stock --corp "카카오" --pretty
```

---

## 8. `--dry-run` — API 호출 없이 검증

```bash
dart-fss report employee --corp "삼성전자" --year 2025 --quarter annual --dry-run
```

```json
{
  "endpoint": "empSttus.json",
  "method": "GET",
  "url": "https://opendart.fss.or.kr/api/empSttus.json?corp_code=00126380&bsns_year=2025&reprt_code=11011",
  "params": {
    "corp_code": "00126380",
    "bsns_year": "2025",
    "reprt_code": "11011"
  }
}
```

회사명 → 고유번호 변환을 확인하고, 실제 API URL을 미리 볼 수 있습니다.
API 호출 횟수를 아끼면서 파라미터가 맞는지 검증할 때 유용합니다.

---

## 9. 스키마 조회 — AI 에이전트의 셀프 디스커버리

```bash
# 전체 엔드포인트 목록 (JSON)
dart-fss endpoints --json-output

# 특정 그룹만
dart-fss endpoints --group financial --json-output

# 특정 엔드포인트의 파라미터 스키마
dart-fss schema dividend
```

```json
{
  "endpoint": "dividend",
  "path": "/api/alotMatter.json",
  "group": "report",
  "pattern": "periodic",
  "description": "배당에 관한 사항",
  "parameters": [
    { "name": "corp_code", "type": "STRING(8)", "required": true },
    { "name": "bsns_year", "type": "STRING(4)", "required": true },
    { "name": "reprt_code", "type": "STRING(5)", "required": true, "enum": {"11011":"Annual",...} }
  ]
}
```

---

## 10. 구조화된 에러

에러도 JSON으로 나옵니다. 에이전트가 파싱하기 쉽습니다.

```bash
dart-fss report employee --corp "삼성전자" --year 2015 --quarter q1
# 데이터 없음:
# {"error":true,"code":"013","description":"No data found","message":"조회된 데이타가 없습니다."}

dart-fss lookup "존재안함"
# {"error":true,"code":"CLI_ERROR","message":"No corporation found for \"존재안함\"."}
```

---

## 11. 파이프라인 & jq

```bash
# 매출액만 뽑기
dart-fss financial single-account --corp "삼성전자" --year 2025 --quarter annual \
  --fields "account_nm,thstrm_amount,fs_div" \
  | jq '[.list[] | select(.account_nm == "매출액" and .fs_div == "CFS")] | .[0].thstrm_amount'

# 여러 회사 루프
for corp in "삼성전자" "SK하이닉스" "LG전자"; do
  echo -n "$corp: "
  dart-fss financial single-account --corp "$corp" --year 2025 --quarter annual \
    --fields "account_nm,thstrm_amount,fs_div" \
    | jq -r '[.list[] | select(.account_nm == "매출액" and .fs_div == "CFS")] | .[0].thstrm_amount'
done
```

---

## 12. Claude Code에게 시키기

dart-fss-cli는 AI 에이전트가 스스로 엔드포인트를 탐색하고 호출할 수 있도록 설계되었습니다.

### 예시 1: 기업 리서치

```
> 삼성전자의 2025년 기업 개황, 직원 현황, 임원 보수를 조회해서 요약해줘
```

Claude Code가 하는 일:
```bash
dart-fss disclosure company --corp "삼성전자" --fields "corp_name,ceo_nm,adres,est_dt"
dart-fss report employee --corp "삼성전자" --year 2025 --quarter annual \
  --fields "sexdstn,fo_bbm,sm,avrg_cnwk_sdytrn,jan_salary_am"
dart-fss report exec-pay-individual --corp "삼성전자" --year 2025 --quarter annual \
  --fields "nm,ofcps,mendng_totamt"
```
→ `--fields`로 필요한 데이터만 가져와서 context window 절약, 3개 API 결과를 종합 요약

### 예시 2: 재무 비교 분석

```
> 삼성전자, SK하이닉스, LG전자의 2025년 매출과 영업이익을 비교해줘
```

Claude Code가 하는 일:
```bash
dart-fss financial single-account --corp "삼성전자" --year 2025 --quarter annual \
  --fields "account_nm,thstrm_amount,fs_div"
dart-fss financial single-account --corp "SK하이닉스" --year 2025 --quarter annual \
  --fields "account_nm,thstrm_amount,fs_div"
dart-fss financial single-account --corp "LG전자" --year 2025 --quarter annual \
  --fields "account_nm,thstrm_amount,fs_div"
```
→ 매출/영업이익만 추출하여 비교표 생성

### 예시 3: 스키마 탐색 → dry-run → 호출

```
> dart-fss에서 배당 관련 API가 있는지 찾아보고, 삼성전자 데이터를 조회해줘
```

Claude Code가 하는 일:
```bash
dart-fss endpoints --group report --json-output    # 1. 엔드포인트 탐색 (JSON)
dart-fss schema dividend                           # 2. 파라미터 확인
dart-fss report dividend --corp "삼성전자" --year 2025 --quarter annual --dry-run  # 3. 검증
dart-fss report dividend --corp "삼성전자" --year 2025 --quarter annual \
  --fields "se,thstrm,frmtrm"                      # 4. 실행 (필요한 필드만)
```
→ API를 몰라도 자연어 질문 하나로 탐색 → 검증 → 호출까지

### 예시 4: 공시 모니터링

```
> 카카오가 2025년에 전환사채나 유상증자를 한 적 있는지 확인해줘
```

Claude Code가 하는 일:
```bash
dart-fss major convertible-bond --corp "카카오" --from 20250101 --to 20251231
dart-fss major paid-increase --corp "카카오" --from 20250101 --to 20251231
```
→ 에러 JSON의 `"code":"013"` (No data found)으로 "이력 없음" 판단

### 예시 5: 복합 분석 리포트

```
> 네이버의 최근 5년간 재무 건전성을 분석해줘. 매출 추이, 감사 의견, 소송 이력을 포함해서.
```

Claude Code가 하는 일:
```bash
# 5년치 핵심 재무데이터만
for year in 2021 2022 2023 2024 2025; do
  dart-fss financial single-account --corp "네이버" --year $year --quarter annual \
    --fields "account_nm,thstrm_amount,fs_div"
done

# 감사 의견
dart-fss report auditor-opinion --corp "네이버" --year 2025 --quarter annual \
  --fields "bsns_year,adtor,adt_opinion,core_adt_matter" --pretty

# 소송 이력
dart-fss major lawsuit --corp "네이버" --from 20210101 --to 20251231
```
→ `--fields`로 5년치 호출해도 컨텍스트 부담 최소화, 종합 트렌드 리포트 생성

### 예시 6: CLAUDE.md에 도구로 등록

프로젝트의 `CLAUDE.md`에 아래를 추가하면 Claude Code가 dart-fss-cli를 도구로 인식합니다:

```markdown
## Available Tools

dart-fss-cli가 설치되어 있습니다. 한국 기업의 공시 정보가 필요하면 사용하세요.

- `dart-fss endpoints --json-output` — 사용 가능한 API 목록 (JSON)
- `dart-fss schema <endpoint>` — API 파라미터 확인
- `dart-fss lookup <회사명>` — 회사 코드 검색
- 항상 `--fields`로 필요한 필드만 요청하세요 (context window 절약)
- `--dry-run`으로 파라미터를 미리 검증하세요
- 예시: `dart-fss report employee --corp "삼성전자" --year 2025 --quarter annual --fields "corp_name,sm"`
```

---

## Quick Reference

| 하고 싶은 것 | 명령어 |
|---|---|
| 회사 검색 | `dart-fss lookup "삼성전자"` |
| 기업 개황 | `dart-fss disclosure company --corp "삼성전자" --pretty` |
| 공시 검색 | `dart-fss disclosure list --corp "카카오" --from 20250101 --to 20260101` |
| 직원 현황 | `dart-fss report employee --corp "삼성전자" --year 2025 --quarter annual` |
| 임원 보수 | `dart-fss report exec-pay-individual --corp "네이버" --year 2025 --quarter annual` |
| 배당 정보 | `dart-fss report dividend --corp "카카오" --year 2025 --quarter annual` |
| 재무제표 | `dart-fss financial single-account --corp "삼성전자" --year 2025 --quarter annual` |
| 대량보유 | `dart-fss equity major-stock --corp "삼성전자"` |
| 유상증자 | `dart-fss major paid-increase --corp "삼성전자" --from 20230101 --to 20251231` |
| 전체 엔드포인트 | `dart-fss endpoints` |
| 스키마 확인 | `dart-fss schema employee` |
| 필드 필터 | `--fields "account_nm,thstrm_amount"` |
| API 검증 | `--dry-run` |
| JSON 출력 | `--json-output` (endpoints) |
| 파일 저장 | `--output result.json` |
| 보기 좋게 | `--pretty` |
