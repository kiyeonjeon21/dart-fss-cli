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
    .description('DS005: 주요사항보고서 (증자/감자, 사채권, M&A, 분할 등 36개 API)');

  const endpoints = (REGISTRY_BY_GROUP.get('major') || []).filter(
    (ep) => ep.pattern === 'dateRange',
  );

  for (const ep of endpoints) {
    group
      .command(ep.cliName)
      .description(ep.summary)
      .requiredOption('--corp <name-or-code>', '회사명 또는 고유번호')
      .requiredOption('--from <YYYYMMDD>', '검색시작 접수일자')
      .requiredOption('--to <YYYYMMDD>', '검색종료 접수일자')
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
