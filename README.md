# dart-fss-cli

[![npm version](https://img.shields.io/npm/v/dart-fss-cli)](https://www.npmjs.com/package/dart-fss-cli)
[![license](https://img.shields.io/npm/l/dart-fss-cli)](LICENSE)

CLI for the Korea FSS [DART Open API](https://opendart.fss.or.kr) (Electronic Disclosure System).

Access all **83 DART API endpoints** from the command line. Designed for both humans and AI agents (Claude Code, etc.).

**[Demo & Examples](DEMO.md)** | **[Agent Integration Guide](AGENTS.md)** | **[한국어 가이드](docs/ko.md)**

## Install

```bash
npx dart-fss-cli --help
```

Runs instantly without installation. For global install:

```bash
npm install -g dart-fss-cli
```

## Setup

Get an API key from [DART Open API](https://opendart.fss.or.kr).

```bash
export DART_API_KEY=your_api_key_here
```

## Usage

```bash
# Look up a company (Korean name → corp_code)
dart-fss lookup "삼성전자"

# Company overview
dart-fss disclosure company --corp "삼성전자" --pretty

# Search filings
dart-fss disclosure list --corp "카카오" --from 20250101 --to 20260101

# Employee status (filtered fields)
dart-fss report employee --corp "삼성전자" --year 2025 --quarter annual \
  --fields "sexdstn,fo_bbm,sm,avrg_cnwk_sdytrn"

# Financial statements
dart-fss financial single-account --corp "SK하이닉스" --year 2025 --quarter annual --pretty

# Major shareholding
dart-fss equity major-stock --corp "네이버"

# Save to file
dart-fss disclosure company --corp "삼성전자" --output result.json
```

> Korean company names work directly. Companies registered with English names (NAVER, LG, etc.) can also be found using Korean input.

## Command Groups

| Command | Description | APIs |
|---------|-------------|------|
| `disclosure` | Filings search, company overview, documents | 4 |
| `report` | Periodic reports (employees, executives, dividends, audit) | 28 |
| `financial` | Financial statements, indices, XBRL | 7 |
| `equity` | Equity disclosure (major holdings, executive ownership) | 2 |
| `major` | Major events (capital changes, bonds, M&A, lawsuits) | 36 |
| `securities` | Securities registration statements | 6 |

## Options

| Option | Description |
|--------|-------------|
| `--pretty` | Pretty-print JSON output |
| `--fields <f1,f2>` | Filter response fields (saves context window for agents) |
| `--dry-run` | Validate parameters without calling the API |
| `--output <file>` | Save result to file |
| `--json <params>` | Pass raw API parameters as JSON |
| `--api-key <key>` | DART API key (default: `DART_API_KEY` env) |

## Quarter Codes

| Value | Meaning |
|-------|---------|
| `q1` | Q1 report |
| `half` | Semi-annual |
| `q3` | Q3 report |
| `annual` | Annual report |

## Agent Integration

Built for AI agents to self-discover and call endpoints:

```bash
# Discover endpoints (auto-JSON when piped)
dart-fss endpoints --json-output

# Inspect parameter schema
dart-fss schema dividend

# Validate without API call
dart-fss report dividend --corp "삼성전자" --year 2025 --quarter annual --dry-run

# Structured JSON errors
# {"error":true,"code":"013","description":"No data found","message":"..."}
```

Add to your `CLAUDE.md` to use as a tool:

```markdown
## Available Tools

dart-fss-cli is installed. Use it for Korean corporate disclosure data.

- `dart-fss endpoints --json-output` — list available APIs
- `dart-fss schema <endpoint>` — get parameter schema
- `dart-fss lookup <name>` — search company by name
- Always use `--fields` to limit response size
- Example: `dart-fss report employee --corp "삼성전자" --year 2025 --quarter annual --fields "corp_name,sm"`
```

See [AGENTS.md](AGENTS.md) and [DEMO.md](DEMO.md) for detailed examples.

## Programmatic Usage

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
