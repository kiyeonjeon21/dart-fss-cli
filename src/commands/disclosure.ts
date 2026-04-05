import { Command } from 'commander';
import { dartFetch } from '../client.js';
import { getApiKey } from '../config.js';
import { resolveCorpCode, lookupCorpCode, refreshCorpCodeCache } from '../corp-code.js';
import { parseJsonParams } from '../json-params.js';
import { writeOutput, writeDryRun } from '../output.js';
import { REGISTRY_BY_GROUP } from '../registry.js';
import type { DartCliOptions } from '../types.js';

function getGlobalOpts(cmd: Command): DartCliOptions {
  return cmd.optsWithGlobals() as DartCliOptions;
}

export function registerDisclosureCommands(program: Command): void {
  const group = program
    .command('disclosure')
    .description(
      'DS001: Disclosure info — search filings, company overview, original documents, corp codes.\n' +
      'Use "disclosure list" to search filings by company/date/type.\n' +
      'Use "disclosure company" to get company profile (CEO, address, industry code).'
    );

  group
    .command('list')
    .description(
      'Search DART disclosure filings. Returns paginated results with report name, filing date, receipt number.\n' +
      'Without --corp, searches ALL companies (date range limited to 3 months).\n' +
      'With --corp, searches specific company with no date limit.\n' +
      'Disclosure types: A=Regular, B=Major events, C=Issuance, D=Equity, E=Other, F=Audit, G=Fund, H=ABS, I=Exchange, J=FTC'
    )
    .option('--corp <name-or-code>', 'Company name (e.g. "삼성전자") or 8-digit corp_code')
    .option('--from <YYYYMMDD>', 'Start date in YYYYMMDD format (e.g. 20240101)')
    .option('--to <YYYYMMDD>', 'End date in YYYYMMDD format (e.g. 20241231)')
    .option('--type <code>', 'Disclosure type: A=Regular, B=Major events, C=Issuance, D=Equity, E=Other, F=Audit, G=Fund, H=ABS, I=Exchange, J=FTC')
    .option('--corp-cls <cls>', 'Corp class filter: Y=KOSPI, K=KOSDAQ, N=KONEX, E=Other')
    .option('--page <n>', 'Page number, starting from 1 (default: 1)', '1')
    .option('--count <n>', 'Items per page, 1-100 (default: 10)', '10')
    .action(async (opts) => {
      const globalOpts = getGlobalOpts(group);
      const apiKey = getApiKey(globalOpts.apiKey);
      if (globalOpts.json) {
        const params = parseJsonParams(globalOpts.json);
        const data = await dartFetch({ apiKey, path: '/list.json', params });
        writeOutput(data, globalOpts);
        return;
      }
      const params: Record<string, string> = {};
      if (opts.corp) params.corp_code = await resolveCorpCode(opts.corp, apiKey);
      if (opts.from) params.bgn_de = opts.from;
      if (opts.to) params.end_de = opts.to;
      if (opts.type) params.pblntf_ty = opts.type;
      if (opts.corpCls) params.corp_cls = opts.corpCls;
      params.page_no = opts.page;
      params.page_count = opts.count;
      if (globalOpts.dryRun) { writeDryRun('/list.json', params, globalOpts); return; }
      const data = await dartFetch({ apiKey, path: '/list.json', params });
      writeOutput(data, globalOpts);
    });

  group
    .command('company')
    .description(
      'Get company profile from DART. Returns corp name, CEO, address, stock code, industry code, incorporation date, fiscal month.\n' +
      'Accepts company name (e.g. "삼성전자") or 8-digit corp_code.'
    )
    .requiredOption('--corp <name-or-code>', 'Company name (e.g. "삼성전자") or 8-digit corp_code')
    .action(async (opts) => {
      const globalOpts = getGlobalOpts(group);
      const apiKey = getApiKey(globalOpts.apiKey);
      if (globalOpts.json) {
        const params = parseJsonParams(globalOpts.json);
        const data = await dartFetch({ apiKey, path: '/company.json', params });
        writeOutput(data, globalOpts);
        return;
      }
      const corpCode = await resolveCorpCode(opts.corp, apiKey);
      const params = { corp_code: corpCode };
      if (globalOpts.dryRun) { writeDryRun('/company.json', params, globalOpts); return; }
      const data = await dartFetch({ apiKey, path: '/company.json', params });
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
}

export function registerLookupCommand(program: Command): void {
  program
    .command('lookup <term>')
    .description(
      'Look up corp_code by company name. Use this to find the 8-digit corp_code needed by other commands.\n' +
      'Searches by exact and partial match. If multiple matches, lists all with stock codes.'
    )
    .action(async (term: string) => {
      const globalOpts = program.opts() as DartCliOptions;
      const apiKey = getApiKey(globalOpts.apiKey);
      const results = await lookupCorpCode(term, apiKey);
      if (results.length === 0) {
        throw new Error(`No corporation found for "${term}".`);
      }
      writeOutput(results, globalOpts);
    });
}

export function registerCorpCacheCommand(program: Command): void {
  const cache = program
    .command('corp-cache')
    .description('Manage the local corp_code cache (~/.dart-fss/corp-codes.json). Auto-refreshes every 7 days.');

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
