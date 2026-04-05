import { Command } from 'commander';
import { dartFetch } from '../client.js';
import { getApiKey } from '../config.js';
import { resolveCorpCode, lookupCorpCode, refreshCorpCodeCache } from '../corp-code.js';
import { writeOutput } from '../output.js';
import { REGISTRY_BY_GROUP } from '../registry.js';
import type { DartCliOptions } from '../types.js';

function getGlobalOpts(cmd: Command): DartCliOptions {
  return cmd.optsWithGlobals() as DartCliOptions;
}

export function registerDisclosureCommands(program: Command): void {
  const group = program
    .command('disclosure')
    .description('DS001: 공시정보 (공시 검색, 기업 개황, 공시서류, 고유번호)');

  group
    .command('list')
    .description('공시 검색')
    .option('--corp <name-or-code>', '회사명 또는 고유번호')
    .option('--from <YYYYMMDD>', '시작일')
    .option('--to <YYYYMMDD>', '종료일')
    .option('--type <code>', '공시유형 (A~J)')
    .option('--corp-cls <cls>', '법인구분 (Y/K/N/E)')
    .option('--page <n>', '페이지 번호', '1')
    .option('--count <n>', '페이지당 건수', '10')
    .action(async (opts) => {
      const globalOpts = getGlobalOpts(group);
      const apiKey = getApiKey(globalOpts.apiKey);
      const params: Record<string, string> = {};
      if (opts.corp) params.corp_code = await resolveCorpCode(opts.corp, apiKey);
      if (opts.from) params.bgn_de = opts.from;
      if (opts.to) params.end_de = opts.to;
      if (opts.type) params.pblntf_ty = opts.type;
      if (opts.corpCls) params.corp_cls = opts.corpCls;
      params.page_no = opts.page;
      params.page_count = opts.count;
      const data = await dartFetch({ apiKey, path: '/list.json', params });
      writeOutput(data, globalOpts);
    });

  group
    .command('company')
    .description('기업 개황')
    .requiredOption('--corp <name-or-code>', '회사명 또는 고유번호')
    .action(async (opts) => {
      const globalOpts = getGlobalOpts(group);
      const apiKey = getApiKey(globalOpts.apiKey);
      const corpCode = await resolveCorpCode(opts.corp, apiKey);
      const data = await dartFetch({ apiKey, path: '/company.json', params: { corp_code: corpCode } });
      writeOutput(data, globalOpts);
    });

  const ds001Endpoints = REGISTRY_BY_GROUP.get('disclosure') || [];
  for (const ep of ds001Endpoints) {
    if (['list', 'company', 'document', 'corp-code'].includes(ep.cliName)) continue;
    if (ep.pattern === 'corpOnly') {
      group
        .command(ep.cliName)
        .description(ep.summary)
        .requiredOption('--corp <name-or-code>', '회사명 또는 고유번호')
        .action(async (opts) => {
          const globalOpts = getGlobalOpts(group);
          const apiKey = getApiKey(globalOpts.apiKey);
          const corpCode = await resolveCorpCode(opts.corp, apiKey);
          const data = await dartFetch({ apiKey, path: `/${ep.path}`, params: { corp_code: corpCode } });
          writeOutput(data, globalOpts);
        });
    }
  }
}

export function registerLookupCommand(program: Command): void {
  program
    .command('lookup <term>')
    .description('회사명으로 corp_code 조회')
    .action(async (term: string) => {
      const globalOpts = program.opts() as DartCliOptions;
      const apiKey = getApiKey(globalOpts.apiKey);
      const results = await lookupCorpCode(term, apiKey);
      if (results.length === 0) {
        console.error(`"${term}"에 해당하는 기업을 찾을 수 없습니다.`);
        process.exit(1);
      }
      writeOutput(results, globalOpts);
    });
}

export function registerCorpCacheCommand(program: Command): void {
  const cache = program
    .command('corp-cache')
    .description('corp_code 캐시 관리');

  cache
    .command('refresh')
    .description('corp_code 캐시 강제 갱신')
    .action(async () => {
      const globalOpts = program.opts() as DartCliOptions;
      const apiKey = getApiKey(globalOpts.apiKey);
      const entries = await refreshCorpCodeCache(apiKey);
      console.error(`갱신 완료: ${entries.length}개 기업`);
    });
}
