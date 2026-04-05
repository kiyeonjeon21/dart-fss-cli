# dart-fss-cli

CLI for the Korea FSS [DART Open API](https://opendart.fss.or.kr) (Electronic Disclosure System).

Access all DART API endpoints from the command line.

**[한국어 가이드 (Korean Guide)](docs/ko.md)**

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/kiyeonjeon21/dart-cli/main/install.sh | bash
```

Or via npm:

```bash
npm install -g dart-fss-cli
```

Or run directly with npx:

```bash
npx dart-fss-cli --help
```

## Setup

Get an API key from [DART Open API](https://opendart.fss.or.kr).

```bash
export DART_API_KEY=your_api_key_here
```

## Usage

```bash
# Company overview
dart-fss disclosure company --corp "삼성전자" --pretty

# Search disclosures
dart-fss disclosure list --corp "카카오" --from 20240101 --to 20241231

# Employee status
dart-fss report employee --corp "삼성전자" --year 2024 --quarter annual

# Financial statements
dart-fss financial single-account --corp "카카오" --year 2024 --quarter annual --pretty

# Major holdings
dart-fss equity major-stock --corp "삼성전자" --pretty

# Look up corp_code by name
dart-fss lookup "네이버"

# List all endpoints
dart-fss endpoints

# Save output to file
dart-fss disclosure company --corp "삼성전자" --output result.json
```

## Command Groups

| Command | Description | APIs |
|---------|-------------|------|
| `disclosure` | Disclosures (search, company overview, documents) | 4 |
| `report` | Periodic reports (employees, executives, dividends, etc.) | 28 |
| `financial` | Financial data (statements, indices, XBRL) | 7 |
| `equity` | Equity disclosure (major holdings, executive ownership) | 2 |
| `major` | Major event reports (capital changes, bonds, M&A, etc.) | 36 |
| `securities` | Securities registration (equity, debt, mergers, etc.) | 6 |

## Global Options

| Option | Description |
|--------|-------------|
| `--api-key <key>` | DART API key (default: `DART_API_KEY` env) |
| `--pretty` | Pretty-print JSON output |
| `--output <file>` | Save result to file |

## Programmatic Usage

```typescript
import { createDartProgram } from 'dart-fss-cli';

const program = createDartProgram();
await program.parseAsync(['node', 'dart-fss', 'disclosure', 'company', '--corp', '삼성전자', '--pretty']);
```

## License

MIT
