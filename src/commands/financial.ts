import { Command } from 'commander';
import { dartFetch } from '../client.js';
import { getApiKey } from '../config.js';
import { resolveCorpCode } from '../corp-code.js';
import { writeOutput } from '../output.js';
import { REGISTRY_BY_GROUP } from '../registry.js';
import { REPRT_CODE_MAP, IDX_CL_CODE_MAP } from '../types.js';
import type { DartCliOptions } from '../types.js';

function getGlobalOpts(cmd: Command): DartCliOptions {
  return cmd.optsWithGlobals() as DartCliOptions;
}

export function registerFinancialCommands(program: Command): void {
  const group = program
    .command('financial')
    .description('DS003: Financial statements, indices & XBRL');

  const endpoints = REGISTRY_BY_GROUP.get('financial') || [];

  for (const ep of endpoints) {
    const cmd = group.command(ep.cliName).description(ep.summary);

    if (ep.pattern === 'periodic') {
      cmd
        .requiredOption('--corp <name-or-code>', 'Company name or corp_code')
        .requiredOption('--year <YYYY>', 'Business year')
        .requiredOption('--quarter <q1|half|q3|annual>', 'Report quarter');

      const needsIdxClCode = ep.cliName === 'single-index';
      if (needsIdxClCode) {
        cmd.requiredOption('--idx-cl-code <code>', 'Index classification code (profitability/stability/growth/activity or M210000~M240000)');
      }

      if (ep.extraParams) {
        for (const p of ep.extraParams) {
          const flag = `--${p.name.replace(/_/g, '-')} <value>`;
          if (p.required) {
            cmd.requiredOption(flag, p.description);
          } else {
            cmd.option(flag, p.description);
          }
        }
      }

      cmd.action(async (opts) => {
        const globalOpts = getGlobalOpts(group);
        const apiKey = getApiKey(globalOpts.apiKey);
        const corpCode = await resolveCorpCode(opts.corp, apiKey);
        const reprtCode = REPRT_CODE_MAP[opts.quarter];
        if (!reprtCode) {
          console.error(`Invalid quarter: ${opts.quarter}`);
          process.exit(1);
        }
        const params: Record<string, string> = {
          corp_code: corpCode,
          bsns_year: opts.year,
          reprt_code: reprtCode,
        };
        if (needsIdxClCode && opts.idxClCode) {
          params.idx_cl_code = IDX_CL_CODE_MAP[opts.idxClCode] || opts.idxClCode;
        }
        if (ep.extraParams) {
          for (const p of ep.extraParams) {
            const optKey = p.name.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
            if (opts[optKey]) {
              params[p.name] = opts[optKey];
            }
          }
        }
        const data = await dartFetch({ apiKey, path: `/${ep.path}`, params });
        writeOutput(data, globalOpts);
      });
    } else if (ep.cliName === 'multi-account' || ep.cliName === 'multi-index') {
      cmd
        .requiredOption('--corp <codes>', 'Corp codes (comma-separated, max 100)')
        .requiredOption('--year <YYYY>', 'Business year')
        .requiredOption('--quarter <q1|half|q3|annual>', 'Report quarter');

      if (ep.cliName === 'multi-index') {
        cmd.requiredOption('--idx-cl-code <code>', 'Index classification code');
      }

      cmd.action(async (opts) => {
        const globalOpts = getGlobalOpts(group);
        const apiKey = getApiKey(globalOpts.apiKey);
        const reprtCode = REPRT_CODE_MAP[opts.quarter];
        if (!reprtCode) {
          console.error(`Invalid quarter: ${opts.quarter}`);
          process.exit(1);
        }
        const params: Record<string, string> = {
          corp_code: opts.corp,
          bsns_year: opts.year,
          reprt_code: reprtCode,
        };
        if (opts.idxClCode) {
          params.idx_cl_code = IDX_CL_CODE_MAP[opts.idxClCode] || opts.idxClCode;
        }
        const data = await dartFetch({ apiKey, path: `/${ep.path}`, params });
        writeOutput(data, globalOpts);
      });
    } else if (ep.cliName === 'taxonomy') {
      cmd
        .requiredOption('--sj-div <code>', 'Statement type (BS1, IS1, CIS1, CF1, CF2, SCE, etc.)')
        .action(async (opts) => {
          const globalOpts = getGlobalOpts(group);
          const apiKey = getApiKey(globalOpts.apiKey);
          const data = await dartFetch({
            apiKey,
            path: `/${ep.path}`,
            params: { sj_div: opts.sjDiv },
          });
          writeOutput(data, globalOpts);
        });
    }
  }
}
