import { Command } from 'commander';
import { dartFetch } from '../client.js';
import { getApiKey } from '../config.js';
import { resolveCorpCode } from '../corp-code.js';
import { writeOutput } from '../output.js';
import { REGISTRY_BY_GROUP } from '../registry.js';
import { REPRT_CODE_MAP } from '../types.js';
import type { DartCliOptions } from '../types.js';

function getGlobalOpts(cmd: Command): DartCliOptions {
  return cmd.optsWithGlobals() as DartCliOptions;
}

export function registerPeriodicReportCommands(program: Command): void {
  const group = program
    .command('report')
    .description('DS002: Periodic reports (28 APIs)');

  const endpoints = (REGISTRY_BY_GROUP.get('report') || []).filter(
    (ep) => ep.pattern === 'periodic',
  );

  for (const ep of endpoints) {
    group
      .command(ep.cliName)
      .description(ep.summary)
      .requiredOption('--corp <name-or-code>', 'Company name or corp_code')
      .requiredOption('--year <YYYY>', 'Business year')
      .requiredOption('--quarter <q1|half|q3|annual>', 'Report quarter')
      .action(async (opts) => {
        const globalOpts = getGlobalOpts(group);
        const apiKey = getApiKey(globalOpts.apiKey);
        const corpCode = await resolveCorpCode(opts.corp, apiKey);
        const reprtCode = REPRT_CODE_MAP[opts.quarter];
        if (!reprtCode) {
          console.error(`Invalid quarter: ${opts.quarter} (must be one of: q1, half, q3, annual)`);
          process.exit(1);
        }
        const data = await dartFetch({
          apiKey,
          path: `/${ep.path}`,
          params: { corp_code: corpCode, bsns_year: opts.year, reprt_code: reprtCode },
        });
        writeOutput(data, globalOpts);
      });
  }
}
