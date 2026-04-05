# dart-fss-cli Demo

Access all 83 DART API endpoints from the terminal.
Works great for humans and even better when you let AI agents (Claude Code, etc.) drive it.

> Agent integration guide: [AGENTS.md](AGENTS.md)

---

## 0. Install & Setup

```bash
# Run directly (no install needed)
npx dart-fss-cli --help

# Or install globally
curl -fsSL https://raw.githubusercontent.com/kiyeonjeon21/dart-fss-cli/main/install.sh | bash

# Get an API key at https://opendart.fss.or.kr
export DART_API_KEY=your_key
```

---

## 1. Company Lookup

```bash
dart-fss lookup "삼성전자"
```

```json
[
  { "corp_code": "00126380", "corp_name": "삼성전자", "stock_code": "005930" }
]
```

```bash
# Partial search
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

> All `--corp` options accept Korean company names directly — corp_code is resolved automatically.
> Companies registered with English names (NAVER, LG, etc.) can also be searched in Korean.

---

## 2. Company Overview

```bash
dart-fss disclosure company --corp "삼성전자" --pretty
```

```json
{
  "corp_name": "삼성전자(주)",
  "ceo_nm": "전영현, 노태문",
  "adres": "경기도 수원시 영통구 삼성로 129",
  "est_dt": "19690113",
  ...
}
```

---

## 3. Filing Search

```bash
# Samsung's recent filings
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

## 4. Periodic Reports — Employees, Executives, Dividends, Audit

```bash
# Samsung 2025 employee status (filtered fields only)
dart-fss report employee --corp "삼성전자" --year 2025 --quarter annual \
  --fields "sexdstn,fo_bbm,sm,avrg_cnwk_sdytrn"

# NAVER 2025 executive compensation
dart-fss report exec-pay-individual --corp "네이버" --year 2025 --quarter annual \
  --fields "nm,ofcps,mendng_totamt"

# SK Hynix 2025 audit opinion
dart-fss report auditor-opinion --corp "SK하이닉스" --year 2025 --quarter annual \
  --fields "bsns_year,adtor,adt_opinion,core_adt_matter" --pretty
```

---

## 5. Financial Statements — `--fields` for the Essentials

```bash
# Samsung 2025 — account name and current year amount only
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
# Full financial statements (consolidated)
dart-fss financial full-statement --corp "삼성전자" --year 2025 --quarter annual --fs-div CFS --pretty

# Compare multiple companies (corp_codes, max 100)
dart-fss financial multi-account --corp "00126380,00164779" --year 2025 --quarter annual \
  --fields "corp_name,account_nm,thstrm_amount"
```

---

## 6. Major Events — M&A, Capital Raises, Lawsuits

```bash
# Samsung convertible bonds 2023–2025
dart-fss major convertible-bond --corp "삼성전자" --from 20230101 --to 20251231

# Kakao lawsuits
dart-fss major lawsuit --corp "카카오" --from 20230101 --to 20251231 --pretty
```

---

## 7. Equity Disclosure

```bash
dart-fss equity major-stock --corp "삼성전자" --fields "repror,stkqy,stkrt"
dart-fss equity executive-stock --corp "카카오" --pretty
```

---

## 8. `--dry-run` — Validate Without Calling the API

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

Confirms company name → corp_code resolution and previews the actual API URL.
Useful for validating parameters without consuming your rate limit.

---

## 9. Schema Introspection — Self-Discovery for AI Agents

```bash
# List all endpoints (JSON)
dart-fss endpoints --json-output

# Filter by group
dart-fss endpoints --group financial --json-output

# Parameter schema for a specific endpoint
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

## 10. Structured Errors

All errors are JSON — easy for agents to parse.

```bash
dart-fss report employee --corp "삼성전자" --year 2015 --quarter q1
# {"error":true,"code":"013","description":"No data found","message":"조회된 데이타가 없습니다."}

dart-fss lookup "nonexistent"
# {"error":true,"code":"CLI_ERROR","message":"No corporation found for \"nonexistent\"."}
```

---

## 11. Pipelines & jq

```bash
# Extract revenue
dart-fss financial single-account --corp "삼성전자" --year 2025 --quarter annual \
  --fields "account_nm,thstrm_amount,fs_div" \
  | jq '[.list[] | select(.account_nm == "매출액" and .fs_div == "CFS")] | .[0].thstrm_amount'

# Compare multiple companies
for corp in "삼성전자" "SK하이닉스" "LG전자"; do
  echo -n "$corp: "
  dart-fss financial single-account --corp "$corp" --year 2025 --quarter annual \
    --fields "account_nm,thstrm_amount,fs_div" \
    | jq -r '[.list[] | select(.account_nm == "매출액" and .fs_div == "CFS")] | .[0].thstrm_amount'
done
```

---

## 12. Let Claude Code Do It

dart-fss-cli is designed so AI agents can discover endpoints and compose calls on their own.
Just ask in natural language — Claude Code handles the rest.

### Example 1: Company Research

```
> (KR) 삼성전자의 2025년 기업 개황, 직원 현황, 임원 보수를 조회해서 요약해줘
> (EN) Fetch Samsung Electronics' 2025 company overview, employee status, and executive compensation, then summarize.
```

What Claude Code does:
```bash
dart-fss disclosure company --corp "삼성전자" --fields "corp_name,ceo_nm,adres,est_dt"
dart-fss report employee --corp "삼성전자" --year 2025 --quarter annual \
  --fields "sexdstn,fo_bbm,sm,avrg_cnwk_sdytrn,jan_salary_am"
dart-fss report exec-pay-individual --corp "삼성전자" --year 2025 --quarter annual \
  --fields "nm,ofcps,mendng_totamt"
```
→ Uses `--fields` to fetch only what's needed, then synthesizes a summary from 3 API calls.

### Example 2: Financial Comparison

```
> (KR) 삼성전자, SK하이닉스, LG전자의 2025년 매출과 영업이익을 비교해줘
> (EN) Compare revenue and operating profit for Samsung, SK Hynix, and LG Electronics in 2025.
```

What Claude Code does:
```bash
dart-fss financial single-account --corp "삼성전자" --year 2025 --quarter annual \
  --fields "account_nm,thstrm_amount,fs_div"
dart-fss financial single-account --corp "SK하이닉스" --year 2025 --quarter annual \
  --fields "account_nm,thstrm_amount,fs_div"
dart-fss financial single-account --corp "LG전자" --year 2025 --quarter annual \
  --fields "account_nm,thstrm_amount,fs_div"
```
→ Extracts revenue and operating profit, builds a comparison table.

### Example 3: Schema Discovery → Dry Run → Execute

```
> (KR) dart-fss에서 배당 관련 API가 있는지 찾아보고, 삼성전자 데이터를 조회해줘
> (EN) Find if there's a dividend API in dart-fss, then fetch Samsung's data.
```

What Claude Code does:
```bash
dart-fss endpoints --group report --json-output    # 1. Discover endpoints
dart-fss schema dividend                           # 2. Check parameters
dart-fss report dividend --corp "삼성전자" --year 2025 --quarter annual --dry-run  # 3. Validate
dart-fss report dividend --corp "삼성전자" --year 2025 --quarter annual \
  --fields "se,thstrm,frmtrm"                      # 4. Execute (filtered fields)
```
→ From zero knowledge of the API to fetched data in one natural language request.

### Example 4: Filing Monitor

```
> (KR) 카카오가 2025년에 전환사채나 유상증자를 한 적 있는지 확인해줘
> (EN) Check if Kakao issued any convertible bonds or did a rights offering in 2025.
```

What Claude Code does:
```bash
dart-fss major convertible-bond --corp "카카오" --from 20250101 --to 20251231
dart-fss major paid-increase --corp "카카오" --from 20250101 --to 20251231
```
→ Interprets `"code":"013"` (No data found) as "no history found".

### Example 5: Multi-Year Analysis

```
> (KR) 네이버의 최근 5년간 재무 건전성을 분석해줘. 매출 추이, 감사 의견, 소송 이력을 포함해서.
> (EN) Analyze NAVER's financial health over the last 5 years. Include revenue trends, audit opinions, and lawsuit history.
```

What Claude Code does:
```bash
# 5 years of key financials
for year in 2021 2022 2023 2024 2025; do
  dart-fss financial single-account --corp "네이버" --year $year --quarter annual \
    --fields "account_nm,thstrm_amount,fs_div"
done

# Audit opinion
dart-fss report auditor-opinion --corp "네이버" --year 2025 --quarter annual \
  --fields "bsns_year,adtor,adt_opinion,core_adt_matter" --pretty

# Lawsuit history
dart-fss major lawsuit --corp "네이버" --from 20210101 --to 20251231
```
→ `--fields` keeps context lean even across 5 years of data. Produces a trend report.

### Example 6: Register as a Tool in CLAUDE.md

Add this to your project's `CLAUDE.md` and Claude Code will use dart-fss-cli automatically:

```markdown
## Available Tools

dart-fss-cli is installed. Use it for Korean corporate disclosure data.

- `dart-fss endpoints --json-output` — list available APIs (JSON)
- `dart-fss schema <endpoint>` — get parameter schema
- `dart-fss lookup <name>` — search company by name
- Always use `--fields` to limit response size (saves context window)
- Use `--dry-run` to validate parameters before calling
- Example: `dart-fss report employee --corp "삼성전자" --year 2025 --quarter annual --fields "corp_name,sm"`
```

---

## Quick Reference

| What you want | Command |
|---|---|
| Search company | `dart-fss lookup "삼성전자"` |
| Company overview | `dart-fss disclosure company --corp "삼성전자" --pretty` |
| Search filings | `dart-fss disclosure list --corp "카카오" --from 20250101 --to 20260101` |
| Employee status | `dart-fss report employee --corp "삼성전자" --year 2025 --quarter annual` |
| Executive pay | `dart-fss report exec-pay-individual --corp "네이버" --year 2025 --quarter annual` |
| Dividends | `dart-fss report dividend --corp "카카오" --year 2025 --quarter annual` |
| Financials | `dart-fss financial single-account --corp "삼성전자" --year 2025 --quarter annual` |
| Major holdings | `dart-fss equity major-stock --corp "삼성전자"` |
| Capital raises | `dart-fss major paid-increase --corp "삼성전자" --from 20230101 --to 20251231` |
| All endpoints | `dart-fss endpoints` |
| Schema | `dart-fss schema employee` |
| Filter fields | `--fields "account_nm,thstrm_amount"` |
| Validate only | `--dry-run` |
| JSON output | `--json-output` (endpoints) |
| Save to file | `--output result.json` |
| Pretty print | `--pretty` |
