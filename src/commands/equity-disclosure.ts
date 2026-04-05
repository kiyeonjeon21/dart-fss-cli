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

export function registerEquityDisclosureCommands(program: Command): void {
  const group = program
    .command('equity')
    .description(
      'DS004: Equity disclosure — major shareholding reports and executive/major shareholder ownership.\n' +
      'Use "equity major-stock" for large shareholding (5%+ ownership) status reports.\n' +
      'Use "equity executive-stock" for executive and major shareholder ownership reports.'
    );

  const endpoints = (REGISTRY_BY_GROUP.get('equity') || []).filter(
    (ep) => ep.pattern === 'corpOnly',
  );

  for (const ep of endpoints) {
    group
      .command(ep.cliName)
      .description(ep.summary)
      .requiredOption('--corp <name-or-code>', 'Company name or corp_code')
      .addHelpText('after', `\nExamples:\n  dart-fss equity ${ep.cliName} --corp "삼성전자" --pretty\n  dart-fss equity ${ep.cliName} --corp "삼성전자" --fields "repror,stkqy,stkrt"`)
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
        const params = { corp_code: corpCode };
        if (globalOpts.dryRun) { writeDryRun(`/${ep.path}`, params, globalOpts); return; }
        const data = await dartFetch({ apiKey, path: `/${ep.path}`, params });
        writeOutput(data, globalOpts);
      });
  }
}
