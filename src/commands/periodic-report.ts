import { Command } from 'commander';
import { dartFetch } from '../client.js';
import { getApiKey } from '../config.js';
import { resolveCorpCode } from '../corp-code.js';
import { parseJsonParams } from '../json-params.js';
import { writeOutput, writeDryRun } from '../output.js';
import { REGISTRY_BY_GROUP } from '../registry.js';
import { REPRT_CODE_MAP } from '../types.js';
import type { DartCliOptions } from '../types.js';

function getGlobalOpts(cmd: Command): DartCliOptions {
  return cmd.optsWithGlobals() as DartCliOptions;
}

export function registerPeriodicReportCommands(program: Command): void {
  const group = program
    .command('report')
    .description(
      'DS002: Periodic report key information — 28 APIs extracting data from annual/quarterly reports.\n' +
      'Covers: capital changes, dividends, treasury stock, shareholders, executives, employees,\n' +
      'compensation, debt securities, audit info, outside directors, investments, fund usage.\n' +
      'Data available from 2015 onward.'
    );

  const endpoints = (REGISTRY_BY_GROUP.get('report') || []).filter(
    (ep) => ep.pattern === 'periodic',
  );

  for (const ep of endpoints) {
    group
      .command(ep.cliName)
      .description(ep.summary)
      .requiredOption('--corp <name-or-code>', 'Company name (e.g. "삼성전자") or 8-digit corp_code')
      .requiredOption('--year <YYYY>', 'Business year in YYYY format (e.g. 2024). Data from 2015 onward')
      .requiredOption('--quarter <q1|half|q3|annual>', 'Report quarter: q1 (Q1), half (semi-annual), q3 (Q3), annual (full year)')
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
        const reprtCode = REPRT_CODE_MAP[opts.quarter];
        if (!reprtCode) {
          throw new Error(`Invalid quarter: ${opts.quarter} (must be one of: q1, half, q3, annual)`);
        }
        const params = { corp_code: corpCode, bsns_year: opts.year, reprt_code: reprtCode };
        if (globalOpts.dryRun) { writeDryRun(`/${ep.path}`, params, globalOpts); return; }
        const data = await dartFetch({ apiKey, path: `/${ep.path}`, params });
        writeOutput(data, globalOpts);
      });
  }
}
