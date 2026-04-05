import { Command } from 'commander';
import { dartFetch } from '../client.js';
import { getApiKey } from '../config.js';
import { resolveCorpCode } from '../corp-code.js';
import { parseJsonParams } from '../json-params.js';
import { writeOutput, writeDryRun } from '../output.js';
import { REGISTRY_BY_GROUP } from '../registry.js';
import { REPRT_CODE_MAP, IDX_CL_CODE_MAP } from '../types.js';
import type { DartCliOptions } from '../types.js';

function getGlobalOpts(cmd: Command): DartCliOptions {
  return cmd.optsWithGlobals() as DartCliOptions;
}

export function registerFinancialCommands(program: Command): void {
  const group = program
    .command('financial')
    .description(
      'DS003: Financial data — statements, indices, and XBRL for listed companies (KOSPI/KOSDAQ).\n' +
      'Includes key accounts (assets, liabilities, revenue), full financial statements,\n' +
      'financial indices (profitability, stability, growth, activity), and XBRL taxonomy.'
    );

  const endpoints = REGISTRY_BY_GROUP.get('financial') || [];

  for (const ep of endpoints) {
    const cmd = group.command(ep.cliName).description(ep.summary);

    if (ep.pattern === 'periodic') {
      cmd
        .requiredOption('--corp <name-or-code>', 'Company name (e.g. "삼성전자") or 8-digit corp_code')
        .requiredOption('--year <YYYY>', 'Business year in YYYY format (e.g. 2024). Data from 2015 onward')
        .requiredOption('--quarter <q1|half|q3|annual>', 'Report quarter: q1 (Q1), half (semi-annual), q3 (Q3), annual (full year)');

      const needsIdxClCode = ep.cliName === 'single-index';
      if (needsIdxClCode) {
        cmd.requiredOption('--idx-cl-code <code>', 'Index classification: profitability (M210000), stability (M220000), growth (M230000), activity (M240000). Accepts aliases or raw codes');
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
        if (globalOpts.dryRun) { writeDryRun(`/${ep.path}`, params, globalOpts); return; }
        const data = await dartFetch({ apiKey, path: `/${ep.path}`, params });
        writeOutput(data, globalOpts);
      });
    } else if (ep.cliName === 'multi-account' || ep.cliName === 'multi-index') {
      cmd
        .requiredOption('--corp <codes>', 'Corp codes, comma-separated, max 100 (e.g. "00126380,00258801")')
        .requiredOption('--year <YYYY>', 'Business year in YYYY format (e.g. 2024). Data from 2015 onward')
        .requiredOption('--quarter <q1|half|q3|annual>', 'Report quarter: q1 (Q1), half (semi-annual), q3 (Q3), annual (full year)');

      if (ep.cliName === 'multi-index') {
        cmd.requiredOption('--idx-cl-code <code>', 'Index classification: profitability (M210000), stability (M220000), growth (M230000), activity (M240000). Accepts aliases or raw codes');
      }

      cmd.action(async (opts) => {
        const globalOpts = getGlobalOpts(group);
        const apiKey = getApiKey(globalOpts.apiKey);
        if (globalOpts.json) {
          const params = parseJsonParams(globalOpts.json);
          const data = await dartFetch({ apiKey, path: `/${ep.path}`, params });
          writeOutput(data, globalOpts);
          return;
        }
        const reprtCode = REPRT_CODE_MAP[opts.quarter];
        if (!reprtCode) {
          throw new Error(`Invalid quarter: ${opts.quarter} (must be one of: q1, half, q3, annual)`);
        }
        const params: Record<string, string> = {
          corp_code: opts.corp,
          bsns_year: opts.year,
          reprt_code: reprtCode,
        };
        if (opts.idxClCode) {
          params.idx_cl_code = IDX_CL_CODE_MAP[opts.idxClCode] || opts.idxClCode;
        }
        if (globalOpts.dryRun) { writeDryRun(`/${ep.path}`, params, globalOpts); return; }
        const data = await dartFetch({ apiKey, path: `/${ep.path}`, params });
        writeOutput(data, globalOpts);
      });
    } else if (ep.cliName === 'taxonomy') {
      cmd
        .requiredOption('--sj-div <code>', 'Statement type code: BS1=Balance sheet, IS1=Income statement, CIS1=Comprehensive income, CF1/CF2=Cash flow, SCE=Equity changes')
        .action(async (opts) => {
          const globalOpts = getGlobalOpts(group);
          const apiKey = getApiKey(globalOpts.apiKey);
          if (globalOpts.json) {
            const params = parseJsonParams(globalOpts.json);
            const data = await dartFetch({ apiKey, path: `/${ep.path}`, params });
            writeOutput(data, globalOpts);
            return;
          }
          const params = { sj_div: opts.sjDiv };
          if (globalOpts.dryRun) { writeDryRun(`/${ep.path}`, params, globalOpts); return; }
          const data = await dartFetch({ apiKey, path: `/${ep.path}`, params });
          writeOutput(data, globalOpts);
        });
    }
  }
}
