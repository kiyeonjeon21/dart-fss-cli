import { Command } from 'commander';
import { registerDisclosureCommands, registerLookupCommand, registerCorpCacheCommand } from './commands/disclosure.js';
import { registerPeriodicReportCommands } from './commands/periodic-report.js';
import { registerFinancialCommands } from './commands/financial.js';
import { registerEquityDisclosureCommands } from './commands/equity-disclosure.js';
import { registerMajorReportCommands } from './commands/major-report.js';
import { registerSecuritiesFilingCommands } from './commands/securities-filing.js';
import { registerSchemaCommand } from './commands/schema.js';
import { REGISTRY } from './registry.js';

export function createDartProgram(): Command {
  const program = new Command();

  program
    .name('dart-fss')
    .description(
      'DART Open API CLI — access Korea Financial Supervisory Service (FSS) electronic disclosure system.\n' +
      'Provides 83 API endpoints for company filings, financial statements, equity disclosures, and more.\n' +
      'Authentication: set DART_API_KEY env var or pass --api-key. Get a key at https://opendart.fss.or.kr\n' +
      'Companies are identified by 8-digit corp_code or company name. Use "dart-fss lookup <name>" to find corp_code.\n' +
      'Output is JSON by default (compact single-line). Use --pretty for formatted output.\n' +
      'Rate limit: approximately 20,000 requests per day per API key.'
    )
    .version('0.4.0')
    .option('--api-key <key>', 'DART API key (default: DART_API_KEY env). Get one at https://opendart.fss.or.kr')
    .option('--pretty', 'Pretty-print JSON output (default: compact single-line JSON)')
    .option('--output <file>', 'Save result to file instead of stdout')
    .option('--json <params>', 'Pass raw API parameters as JSON string, bypassing flag parsing')
    .option('--fields <f1,f2,...>', 'Comma-separated field names to include in output (reduces response size for agents)')
    .option('--dry-run', 'Validate parameters and print the resolved API request without calling the API');

  registerDisclosureCommands(program);
  registerPeriodicReportCommands(program);
  registerFinancialCommands(program);
  registerEquityDisclosureCommands(program);
  registerMajorReportCommands(program);
  registerSecuritiesFilingCommands(program);

  registerLookupCommand(program);
  registerCorpCacheCommand(program);
  registerSchemaCommand(program);

  program
    .command('endpoints')
    .description('List all registered API endpoints. Outputs JSON when stdout is not a TTY or --json-output is used.')
    .option('--group <group>', 'disclosure, report, financial, equity, major, securities')
    .option('--json-output', 'Force JSON output')
    .action((opts) => {
      let endpoints = REGISTRY;
      if (opts.group) {
        endpoints = endpoints.filter((ep) => ep.group === opts.group);
      }

      const useJson = opts.jsonOutput || !process.stdout.isTTY;
      if (useJson) {
        const data = endpoints.map((ep) => ({
          name: ep.cliName,
          group: ep.group,
          pattern: ep.pattern,
          description: ep.summary,
        }));
        console.log(JSON.stringify(data));
        return;
      }

      console.log(`${endpoints.length} endpoints:\n`);
      const groups = new Map<string, typeof endpoints>();
      for (const ep of endpoints) {
        const g = groups.get(ep.group) || [];
        g.push(ep);
        groups.set(ep.group, g);
      }
      for (const [groupName, eps] of groups) {
        console.log(`[${groupName}] (${eps.length})`);
        for (const ep of eps) {
          console.log(`  ${ep.cliName.padEnd(35)} ${ep.pattern.padEnd(10)} ${ep.summary}`);
        }
        console.log();
      }
    });

  return program;
}
