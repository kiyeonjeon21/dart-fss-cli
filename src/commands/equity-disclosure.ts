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

export function registerEquityDisclosureCommands(program: Command): void {
  const group = program
    .command('equity')
    .description('DS004: 지분공시 (대량보유, 임원·주요주주 소유보고)');

  const endpoints = (REGISTRY_BY_GROUP.get('equity') || []).filter(
    (ep) => ep.pattern === 'corpOnly',
  );

  for (const ep of endpoints) {
    group
      .command(ep.cliName)
      .description(ep.summary)
      .requiredOption('--corp <name-or-code>', '회사명 또는 고유번호')
      .action(async (opts) => {
        const globalOpts = getGlobalOpts(group);
        const apiKey = getApiKey(globalOpts.apiKey);
        const corpCode = await resolveCorpCode(opts.corp, apiKey);
        const data = await dartFetch({
          apiKey,
          path: `/${ep.path}`,
          params: { corp_code: corpCode },
        });
        writeOutput(data, globalOpts);
      });
  }
}
