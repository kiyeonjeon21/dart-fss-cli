import { Command } from 'commander';
import { registerDisclosureCommands, registerLookupCommand, registerCorpCacheCommand } from './commands/disclosure.js';
import { registerPeriodicReportCommands } from './commands/periodic-report.js';
import { registerFinancialCommands } from './commands/financial.js';
import { registerEquityDisclosureCommands } from './commands/equity-disclosure.js';
import { registerMajorReportCommands } from './commands/major-report.js';
import { registerSecuritiesFilingCommands } from './commands/securities-filing.js';
import { REGISTRY } from './registry.js';

export function createDartProgram(): Command {
  const program = new Command();

  program
    .name('dart-fss')
    .description('DART Open API CLI — 금융감독원 전자공시시스템')
    .version('0.1.0')
    .option('--api-key <key>', 'DART API 인증키 (기본: DART_API_KEY 환경변수)')
    .option('--pretty', 'JSON 예쁘게 출력')
    .option('--output <file>', '결과를 파일로 저장');

  registerDisclosureCommands(program);
  registerPeriodicReportCommands(program);
  registerFinancialCommands(program);
  registerEquityDisclosureCommands(program);
  registerMajorReportCommands(program);
  registerSecuritiesFilingCommands(program);

  registerLookupCommand(program);
  registerCorpCacheCommand(program);

  program
    .command('endpoints')
    .description('등록된 전체 API 엔드포인트 목록')
    .option('--group <group>', 'disclosure, report, financial, equity, major, securities')
    .action((opts) => {
      let endpoints = REGISTRY;
      if (opts.group) {
        endpoints = endpoints.filter((ep) => ep.group === opts.group);
      }
      console.log(`총 ${endpoints.length}개 엔드포인트:\n`);
      const groups = new Map<string, typeof endpoints>();
      for (const ep of endpoints) {
        const g = groups.get(ep.group) || [];
        g.push(ep);
        groups.set(ep.group, g);
      }
      for (const [groupName, eps] of groups) {
        console.log(`[${groupName}] (${eps.length}개)`);
        for (const ep of eps) {
          console.log(`  ${ep.cliName.padEnd(35)} ${ep.pattern.padEnd(10)} ${ep.summary}`);
        }
        console.log();
      }
    });

  return program;
}
