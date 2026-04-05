# dart-fss-cli — Agent Integration Guide

dart-fss-cli is an AI-agent-optimized CLI for Korea's DART financial disclosure API (83 endpoints).

## Quick Start for Agents

```bash
# 1. Discover available endpoints
dart-fss endpoints --json-output

# 2. Get parameter schema for a specific endpoint
dart-fss schema employee

# 3. Validate parameters without API call (saves rate limit)
dart-fss report employee --corp "삼성전자" --year 2025 --quarter annual --dry-run

# 4. Execute with field filtering (reduces output size)
dart-fss report employee --corp "삼성전자" --year 2025 --quarter annual --fields "corp_name,sexdstn,sm,avrg_cnwk_sdytrn"
```

## Recommended Workflow

1. **Discover**: `dart-fss endpoints --json-output` or `dart-fss endpoints --group <group> --json-output`
2. **Inspect**: `dart-fss schema <endpoint>` — returns parameter types, required fields, enums
3. **Validate**: Add `--dry-run` to any command — resolves company names, builds URL, prints request JSON without calling API
4. **Execute**: Run the command; use `--fields` to limit response fields
5. **Filter**: Pipe to `jq` for complex transformations

## Agent-Friendly Features

### Field Masks (`--fields`)
Reduces response size to protect context windows:
```bash
# Full response: ~30 fields per item
dart-fss financial single-account --corp "삼성전자" --year 2025 --quarter annual

# Filtered: only what you need
dart-fss financial single-account --corp "삼성전자" --year 2025 --quarter annual \
  --fields "account_nm,thstrm_amount,frmtrm_amount"
```

### Dry Run (`--dry-run`)
Validates parameters and resolves company names without consuming API quota:
```bash
dart-fss report dividend --corp "삼성전자" --year 2025 --quarter annual --dry-run
# Output: { "endpoint": "...", "method": "GET", "url": "...", "params": {...} }
```

### Structured JSON Errors
All errors output as machine-parseable JSON to stderr:
```json
{"error":true,"code":"013","description":"No data found","message":"조회된 데이타가 없습니다."}
{"error":true,"code":"CLI_ERROR","message":"No corporation found for \"...\"."}
```

### Auto-JSON for Pipes
`dart-fss endpoints` outputs structured JSON when stdout is not a TTY (i.e., when an agent reads it). Force it with `--json-output`.

### Raw API Parameters (`--json`)
Bypass CLI flag parsing — pass DART API parameters directly:
```bash
dart-fss disclosure list --json '{"corp_code":"00126380","bgn_de":"20250101","end_de":"20251231"}'
```

## Command Patterns

All 83 endpoints follow one of four patterns:

| Pattern | Required Params | CLI Flags |
|---------|----------------|-----------|
| `periodic` | corp_code, bsns_year, reprt_code | `--corp`, `--year`, `--quarter` |
| `dateRange` | corp_code, bgn_de, end_de | `--corp`, `--from`, `--to` |
| `corpOnly` | corp_code | `--corp` |
| `special` | varies | varies (check `dart-fss schema <endpoint>`) |

### Quarter Codes
| Flag | Code | Meaning |
|------|------|---------|
| `q1` | 11013 | Q1 report |
| `half` | 11012 | Semi-annual |
| `q3` | 11014 | Q3 report |
| `annual` | 11011 | Annual report |

## Company Name Resolution

All `--corp` flags accept Korean company names (e.g., "삼성전자") or 8-digit corp_codes. Names are resolved from a local cache (~20K companies, refreshed every 7 days).

Companies with English-registered names (e.g., NAVER, LG, SK) are automatically enriched with Korean names during cache refresh. Users can search using either Korean or English names. When multiple partial matches exist but only one is a listed company, the CLI automatically selects the listed company.

## Rate Limits

- ~20,000 requests per day per API key
- Use `--dry-run` to validate before calling
- Use `--fields` to avoid re-fetching for different fields

## CLAUDE.md Snippet

Add this to your project's `CLAUDE.md` to enable dart-fss as a tool:

```markdown
## Available Tools

dart-fss-cli is installed. Use it for Korean corporate disclosure data.

- `dart-fss endpoints --json-output` — list all API endpoints as JSON
- `dart-fss schema <endpoint>` — get parameter schema
- `dart-fss lookup <name>` — search company by name
- Always use `--fields` to limit response size when you only need specific data
- Use `--dry-run` to validate parameters before making API calls
- Example: `dart-fss report employee --corp "삼성전자" --year 2025 --quarter annual --fields "corp_name,sm"`
```
