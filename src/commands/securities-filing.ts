import { Command } from 'commander';
import { dartFetch } from '../client.js';
import { getApiKey } from '../config.js';
import { resolveCorpCode } from '../corp-code.js';
import { parseJsonParams } from '../json-params.js';
import { writeOutput, writeDryRun } from '../output.js';
import { REGISTRY_BY_GROUP } from '../registry.js';
import type { DartCliOptions } from '../types.js';

function getGlobalOpts(cmd: Command): DartCliOptions {
  return cmd.optsWithGlobals() as DartCliOptions;
}

export function registerSecuritiesFilingCommands(program: Command): void {
  const group = program
    .command('securities')
    .description(
      'DS006: Securities registration statements — 6 APIs for securities filings.\n' +
      'Covers: equity securities, debt securities, depository receipts,\n' +
      'mergers, comprehensive stock exchange/transfer, and splits.\n' +
      'Data available from 2015 onward. Requires date range.'
    );

  const endpoints = (REGISTRY_BY_GROUP.get('securities') || []).filter(
    (ep) => ep.pattern === 'dateRange',
  );

  for (const ep of endpoints) {
    group
      .command(ep.cliName)
      .description(ep.summary)
      .requiredOption('--corp <name-or-code>', 'Company name (e.g. "삼성전자") or 8-digit corp_code')
      .requiredOption('--from <YYYYMMDD>', 'Start date in YYYYMMDD format (filing date). Data from 2015 onward')
      .requiredOption('--to <YYYYMMDD>', 'End date in YYYYMMDD format (filing date)')
      .addHelpText('after', `\nExamples:\n  dart-fss securities ${ep.cliName} --corp "삼성전자" --from 20230101 --to 20251231 --pretty`)
      .action(async (opts) => {
        const globalOpts = getGlobalOpts(group);
        const apiKey = getApiKey(globalOpts.apiKey);
        if (globalOpts.json) {
          const params = parseJsonParams(globalOpts.json);
          const data = await dartFetch({ apiKey, path: `/${ep.path}`, params });
          writeOutput(data, globalOpts);
          return;
        }
        const corpCode = await resolveCorpCode(opts.corp, apiKey);
        const params = { corp_code: corpCode, bgn_de: opts.from, end_de: opts.to };
        if (globalOpts.dryRun) { writeDryRun(`/${ep.path}`, params, globalOpts); return; }
        const data = await dartFetch({ apiKey, path: `/${ep.path}`, params });
        writeOutput(data, globalOpts);
      });
  }
}
