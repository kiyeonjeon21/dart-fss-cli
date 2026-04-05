# Contributing to dart-fss-cli

Thanks for your interest in contributing! This project is open to contributions of all kinds — bug fixes, new features, documentation improvements, and more.

## Getting Started

```bash
# Clone the repo
git clone https://github.com/kiyeonjeon21/dart-fss-cli.git
cd dart-fss-cli

# Install dependencies
npm install

# Build
npm run build

# Run locally
node dist/bin.js --help

# Or use dev mode (no build needed)
npm run dev -- --help
```

## Setup

You'll need a DART API key for testing:

1. Get a free key at [https://opendart.fss.or.kr](https://opendart.fss.or.kr)
2. Create a `.env` file in the project root:
   ```
   DART_API_KEY=your_key_here
   ```

The CLI loads `.env` automatically — no need to export.

## Project Structure

```
src/
├── bin.ts              # Entry point
├── cli.ts              # Command registration and global options
├── client.ts           # DART API fetch (JSON and binary)
├── config.ts           # API key, cache paths, base URL
├── corp-code.ts        # Company lookup and cache management
├── env.ts              # .env file loader
├── errors.ts           # Structured error handling
├── json-params.ts      # --json flag parser
├── output.ts           # --pretty, --fields, --dry-run, --output
├── registry.ts         # Auto-generated endpoint metadata (83 endpoints)
├── types.ts            # TypeScript interfaces and constants
├── commands/
│   ├── disclosure.ts       # disclosure group (4 endpoints)
│   ├── periodic-report.ts  # report group (28 endpoints)
│   ├── financial.ts        # financial group (7 endpoints)
│   ├── equity-disclosure.ts # equity group (2 endpoints)
│   ├── major-report.ts     # major group (36 endpoints)
│   ├── securities-filing.ts # securities group (6 endpoints)
│   └── schema.ts           # schema introspection command
```

## Making Changes

1. **Fork** the repo and create a branch from `main`
2. Make your changes
3. Build and test locally:
   ```bash
   npm run build
   node dist/bin.js lookup "삼성전자"
   ```
4. Commit with a clear message describing what and why
5. Open a **Pull Request** against `main`

## Code Style

- TypeScript, ES modules (`import`/`export`)
- No unnecessary abstractions — keep it simple
- Errors should `throw` (not `process.exit`) so the central handler in `bin.ts` outputs structured JSON
- Help text should include concrete examples so AI agents can use commands correctly on first try

## Adding a New Feature

- **New global option**: Add to `src/cli.ts` and `GlobalOutputOptions` in `src/output.ts`
- **New endpoint support**: Usually handled by `src/registry.ts` — run `npm run registry` to regenerate
- **Help text improvements**: Add `.addHelpText('after', ...)` with examples to both group-level and subcommand-level

## Good First Issues

Check [issues labeled `good first issue`](https://github.com/kiyeonjeon21/dart-fss-cli/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) for beginner-friendly tasks.

## Questions?

Open an issue or start a discussion. All contributions are welcome!
