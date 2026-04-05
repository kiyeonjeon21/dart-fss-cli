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
    .description('DS001: Disclosure (search, company overview, documents, corp codes)');

  group
    .command('list')
    .description('Search disclosures')
    .option('--corp <name-or-code>', 'Company name or corp_code')
    .option('--from <YYYYMMDD>', 'Start date')
    .option('--to <YYYYMMDD>', 'End date')
    .option('--type <code>', 'Disclosure type (A~J)')
    .option('--corp-cls <cls>', 'Corp class (Y/K/N/E)')
    .option('--page <n>', 'Page number', '1')
    .option('--count <n>', 'Items per page', '10')
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
    .description('Company overview')
    .requiredOption('--corp <name-or-code>', 'Company name or corp_code')
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
        .requiredOption('--corp <name-or-code>', 'Company name or corp_code')
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
    .description('Look up corp_code by company name')
    .action(async (term: string) => {
      const globalOpts = program.opts() as DartCliOptions;
      const apiKey = getApiKey(globalOpts.apiKey);
      const results = await lookupCorpCode(term, apiKey);
      if (results.length === 0) {
        console.error(`No corporation found for "${term}".`);
        process.exit(1);
      }
      writeOutput(results, globalOpts);
    });
}

export function registerCorpCacheCommand(program: Command): void {
  const cache = program
    .command('corp-cache')
    .description('Manage corp_code cache');

  cache
    .command('refresh')
    .description('Force refresh corp_code cache')
    .action(async () => {
      const globalOpts = program.opts() as DartCliOptions;
      const apiKey = getApiKey(globalOpts.apiKey);
      const entries = await refreshCorpCodeCache(apiKey);
      console.error(`Refreshed: ${entries.length} corporations`);
    });
}
