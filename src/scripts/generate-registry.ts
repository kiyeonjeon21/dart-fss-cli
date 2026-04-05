/**
 * Parses reference/dart-openapi.yaml and generates src/registry.ts
 * Usage: npx tsx src/scripts/generate-registry.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const yamlPath = join(__dirname, '..', '..', 'reference', 'dart-openapi.yaml');
const outPath = join(__dirname, '..', 'registry.ts');

interface PathItem {
  get: {
    operationId: string;
    summary: string;
    tags: string[];
    parameters: Array<{ $ref?: string; name?: string; required?: boolean; description?: string; schema?: { enum?: string[] } }>;
  };
}

const TAG_TO_GROUP: Record<string, string> = {
  '공시정보': 'disclosure',
  '정기보고서': 'report',
  '재무정보': 'financial',
  '지분공시': 'equity',
  '주요사항보고서': 'major',
  '증권신고서': 'securities',
};

const CLI_NAME_OVERRIDES: Record<string, string> = {
  // DS001
  searchDisclosures: 'list',
  getCompanyOverview: 'company',
  downloadDisclosureDocument: 'document',
  downloadCorpCodeList: 'corp-code',
  // DS002
  getIrdsSttus: 'capital-change',
  getAlotMatter: 'dividend',
  getTesstkAcqsDspsSttus: 'treasury-stock',
  getStockTotqySttus: 'stock-total',
  getHyslrSttus: 'shareholder',
  getHyslrChgSttus: 'shareholder-change',
  getMrhlSttus: 'minority-shareholder',
  getExctvSttus: 'executive',
  getEmpSttus: 'employee',
  getHmvAuditIndvdlBySttus: 'exec-pay-individual',
  getHmvAuditAllSttus: 'exec-pay-total',
  getIndvdlByPay: 'top-pay',
  getUnrstExctvMendngSttus: 'unregistered-exec-pay',
  getDrctrAdtAllMendngSttusGmtsckConfmAmount: 'director-pay-approved',
  getDrctrAdtAllMendngSttusMendngPymntamtTyCl: 'director-pay-type',
  getDetScritsIsuAcmslt: 'debt-securities',
  getEntrprsBilScritsNrdmpBlce: 'commercial-paper',
  getSrtpdPsndbtNrdmpBlce: 'short-term-bond',
  getCprndNrdmpBlce: 'contingent-bond',
  getNewCaplScritsNrdmpBlce: 'new-capital-securities',
  getCndlCaplScritsNrdmpBlce: 'conditional-capital-securities',
  getAccnutAdtorNmNdAdtOpinion: 'auditor-opinion',
  getAdtServcCnclsSttus: 'audit-service',
  getAccnutAdtorNonAdtServcCnclsSttus: 'non-audit-service',
  getOutcmpnyDrctrNdChangeSttus: 'outside-director',
  getOtrCprInvstmntSttus: 'other-corp-investment',
  getPssrpCptalUseDtls: 'public-fund-usage',
  getPrvsrpCptalUseDtls: 'private-fund-usage',
  // DS003
  getSingleCompanyMajorAccounts: 'single-account',
  getMultiCompanyMajorAccounts: 'multi-account',
  getSingleCompanyFullStatements: 'full-statement',
  getSingleCompanyFinancialIndex: 'single-index',
  getMultiCompanyFinancialIndex: 'multi-index',
  downloadXbrlStatement: 'xbrl',
  getXbrlTaxonomy: 'taxonomy',
  // DS004
  getMajorstock: 'major-stock',
  getElestock: 'executive-stock',
  // DS005
  getAstInhtrfEtcPtbkOpt: 'asset-transfer',
  getDfOcr: 'default',
  getBsnSp: 'business-suspension',
  getCtrcvsBgrq: 'rehabilitation',
  getDsRsOcr: 'dissolution',
  getPiicDecsn: 'paid-increase',
  getFricDecsn: 'free-increase',
  getPifricDecsn: 'paid-free-increase',
  getCrDecsn: 'capital-reduction',
  getBnkMngtPcbg: 'creditor-mgmt-start',
  getLwstLg: 'lawsuit',
  getOvLstDecsn: 'overseas-listing-decision',
  getOvDlstDecsn: 'overseas-delisting-decision',
  getOvLst: 'overseas-listing',
  getOvDlst: 'overseas-delisting',
  getCvbdIsDecsn: 'convertible-bond',
  getBdwtIsDecsn: 'bond-with-warrant',
  getExbdIsDecsn: 'exchangeable-bond',
  getBnkMngtPcsp: 'creditor-mgmt-stop',
  getWdCocobdIsDecsn: 'contingent-convertible',
  getTsstkAqDecsn: 'treasury-acquire',
  getTsstkDpDecsn: 'treasury-dispose',
  getTsstkAqTrctrCnsDecsn: 'treasury-trust-start',
  getTsstkAqTrctrCcDecsn: 'treasury-trust-end',
  getBsnInhDecsn: 'business-acquire',
  getBsnTrfDecsn: 'business-transfer',
  getTgastInhDecsn: 'tangible-asset-acquire',
  getTgastTrfDecsn: 'tangible-asset-transfer',
  getOtcprStkInvscrInhDecsn: 'other-stock-acquire',
  getOtcprStkInvscrTrfDecsn: 'other-stock-transfer',
  getStkrtbdInhDecsn: 'stock-bond-acquire',
  getStkrtbdTrfDecsn: 'stock-bond-transfer',
  getCmpMgDecsn: 'merger-decision',
  getCmpDvDecsn: 'split-decision',
  getCmpDvmgDecsn: 'split-merger-decision',
  getStkExtrDecsn: 'stock-exchange-decision',
  // DS006
  getEstkRs: 'equity-securities',
  getBdRs: 'debt-registration',
  getStkdpRs: 'depository-receipt',
  getMgRs: 'merger-registration',
  getExtrRs: 'exchange-registration',
  getDvRs: 'split-registration',
};

function toKebab(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function classifyParams(
  params: Array<{ $ref?: string; name?: string; required?: boolean }>,
): string {
  const refs = params.filter((p) => p.$ref).map((p) => p.$ref!);
  const hasCorpCode = refs.some((r) => r.includes('CorpCode'));
  const hasBsnsYear = refs.some((r) => r.includes('BsnsYear'));
  const hasReprtCode = refs.some((r) => r.includes('ReprtCode'));
  const hasBgnDe = refs.some((r) => r.includes('BgnDe'));
  const hasEndDe = refs.some((r) => r.includes('EndDe'));

  if (hasCorpCode && hasBsnsYear && hasReprtCode) return 'periodic';
  if (hasCorpCode && hasBgnDe && hasEndDe) return 'dateRange';
  if (hasCorpCode && !hasBsnsYear && !hasBgnDe) return 'corpOnly';
  return 'special';
}

function main() {
  const raw = readFileSync(yamlPath, 'utf-8');
  const spec = YAML.parse(raw);
  const paths: Record<string, PathItem> = spec.paths;

  const entries: string[] = [];

  for (const [pathKey, pathItem] of Object.entries(paths)) {
    const op = pathItem.get;
    const tag = op.tags[0];
    const group = TAG_TO_GROUP[tag] || 'unknown';
    const pathClean = pathKey.replace(/^\//, '');

    const opId = op.operationId;
    let cliName = CLI_NAME_OVERRIDES[opId];
    if (!cliName) {
      const stripped = opId
        .replace(/^(get|search|download)/, '')
        .replace(/^([A-Z])/, (m) => m.toLowerCase());
      cliName = toKebab(stripped);
    }

    const pattern = classifyParams(op.parameters);

    const extraParams = op.parameters
      .filter((p) => !p.$ref && p.name && p.name !== 'crtfc_key')
      .map((p) => {
        const obj: Record<string, unknown> = {
          name: p.name,
          description: (p.description || '').split('\n')[0].trim(),
          required: p.required ?? false,
        };
        if (p.schema?.enum) {
          obj.enum = p.schema.enum;
        }
        return obj;
      });

    let extraStr = '';
    if (extraParams.length > 0) {
      extraStr = `,\n    extraParams: ${JSON.stringify(extraParams, null, 2).replace(/\n/g, '\n    ')}`;
    }

    entries.push(`  {
    path: '${pathClean}',
    cliName: '${cliName}',
    summary: '${op.summary.replace(/'/g, "\\'")}',
    pattern: '${pattern}',
    group: '${group}',
    tag: '${tag}'${extraStr},
  }`);
  }

  const content = `// AUTO-GENERATED by scripts/generate-registry.ts — DO NOT EDIT
import type { EndpointMeta } from './types.js';

export const REGISTRY: EndpointMeta[] = [
${entries.join(',\n')}
];

export const REGISTRY_BY_CLI_NAME = new Map<string, EndpointMeta>();
export const REGISTRY_BY_GROUP = new Map<string, EndpointMeta[]>();

for (const entry of REGISTRY) {
  REGISTRY_BY_CLI_NAME.set(entry.cliName, entry);
  const group = REGISTRY_BY_GROUP.get(entry.group) || [];
  group.push(entry);
  REGISTRY_BY_GROUP.set(entry.group, group);
}
`;

  writeFileSync(outPath, content, 'utf-8');
  console.log(`Generated ${entries.length} endpoints → ${outPath}`);
}

main();
