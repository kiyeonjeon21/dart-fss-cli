import { Command } from 'commander';
import { dartFetch } from '../client.js';
import { getApiKey } from '../config.js';
import { resolveCorpCode } from '../corp-code.js';
import { writeOutput } from '../output.js';
import { REGISTRY_BY_GROUP } from '../registry.js';
import type { DartCliOptions } from '../types.js';

function getGlobalOpts(cmd: Command): DartCliOptions {
  return cmd.optsWithGlobals() as DartCliOptions;
}

export function registerMajorReportCommands(program: Command): void {
  const group = program
    .command('major')
    .description('DS005: Major event reports (capital changes, bonds, M&A, etc. 36 APIs)');

  const endpoints = (REGISTRY_BY_GROUP.get('major') || []).filter(
    (ep) => ep.pattern === 'dateRange',
  );

  for (const ep of endpoints) {
    group
      .command(ep.cliName)
      .description(ep.summary)
      .requiredOption('--corp <name-or-code>', 'Company name or corp_code')
      .requiredOption('--from <YYYYMMDD>', 'Start date (filing date)')
      .requiredOption('--to <YYYYMMDD>', 'End date (filing date)')
      .action(async (opts) => {
        const globalOpts = getGlobalOpts(group);
        const apiKey = getApiKey(globalOpts.apiKey);
        const corpCode = await resolveCorpCode(opts.corp, apiKey);
        const data = await dartFetch({
          apiKey,
          path: `/${ep.path}`,
          params: { corp_code: corpCode, bgn_de: opts.from, end_de: opts.to },
        });
        writeOutput(data, globalOpts);
      });
  }
}
