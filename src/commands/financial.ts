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
    .description('DS003: 재무정보 (재무제표, 재무지표, XBRL)');

  const endpoints = REGISTRY_BY_GROUP.get('financial') || [];

  for (const ep of endpoints) {
    const cmd = group.command(ep.cliName).description(ep.summary);

    if (ep.pattern === 'periodic') {
      cmd
        .requiredOption('--corp <name-or-code>', '회사명 또는 고유번호')
        .requiredOption('--year <YYYY>', '사업연도')
        .requiredOption('--quarter <q1|half|q3|annual>', '분기');

      const needsIdxClCode = ep.cliName === 'single-index';
      if (needsIdxClCode) {
        cmd.requiredOption('--idx-cl-code <code>', '지표분류코드 (profitability/stability/growth/activity 또는 M210000~M240000)');
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
          console.error(`유효하지 않은 분기: ${opts.quarter}`);
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
        .requiredOption('--corp <codes>', '고유번호 (쉼표 구분, 최대 100개)')
        .requiredOption('--year <YYYY>', '사업연도')
        .requiredOption('--quarter <q1|half|q3|annual>', '분기');

      if (ep.cliName === 'multi-index') {
        cmd.requiredOption('--idx-cl-code <code>', '지표분류코드');
      }

      cmd.action(async (opts) => {
        const globalOpts = getGlobalOpts(group);
        const apiKey = getApiKey(globalOpts.apiKey);
        const reprtCode = REPRT_CODE_MAP[opts.quarter];
        if (!reprtCode) {
          console.error(`유효하지 않은 분기: ${opts.quarter}`);
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
        .requiredOption('--sj-div <code>', '재무제표구분 (BS1, IS1, CIS1, CF1, CF2, SCE 등)')
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
