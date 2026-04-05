import { Command } from 'commander';
import { REGISTRY, REGISTRY_BY_CLI_NAME, REGISTRY_BY_GROUP } from '../registry.js';
import type { EndpointMeta, ExtraParam } from '../types.js';

interface SchemaParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
  enum?: Record<string, string> | string[];
  format?: string;
}

function getPeriodicParams(): SchemaParam[] {
  return [
    {
      name: 'corp_code',
      type: 'STRING(8)',
      required: true,
      description: 'Company unique code (8 digits)',
    },
    {
      name: 'bsns_year',
      type: 'STRING(4)',
      required: true,
      description: 'Business year (e.g. 2024). Data from 2015 onward',
    },
    {
      name: 'reprt_code',
      type: 'STRING(5)',
      required: true,
      description: 'Report code',
      enum: { '11013': 'Q1', '11012': 'Semi-annual', '11014': 'Q3', '11011': 'Annual' },
    },
  ];
}

function getDateRangeParams(): SchemaParam[] {
  return [
    {
      name: 'corp_code',
      type: 'STRING(8)',
      required: true,
      description: 'Company unique code (8 digits)',
    },
    {
      name: 'bgn_de',
      type: 'STRING(8)',
      required: true,
      description: 'Start date',
      format: 'YYYYMMDD',
    },
    {
      name: 'end_de',
      type: 'STRING(8)',
      required: true,
      description: 'End date',
      format: 'YYYYMMDD',
    },
  ];
}

function getCorpOnlyParams(): SchemaParam[] {
  return [
    {
      name: 'corp_code',
      type: 'STRING(8)',
      required: true,
      description: 'Company unique code (8 digits)',
    },
  ];
}

function extraParamToSchema(p: ExtraParam): SchemaParam {
  const schema: SchemaParam = {
    name: p.name,
    type: 'STRING',
    required: p.required,
    description: p.description,
  };
  if (p.enum) {
    schema.enum = p.enum;
  }
  return schema;
}

function buildSchema(ep: EndpointMeta) {
  let parameters: SchemaParam[];

  switch (ep.pattern) {
    case 'periodic':
      parameters = getPeriodicParams();
      break;
    case 'dateRange':
      parameters = getDateRangeParams();
      break;
    case 'corpOnly':
      parameters = getCorpOnlyParams();
      break;
    case 'special':
      parameters = [];
      break;
  }

  if (ep.extraParams) {
    for (const p of ep.extraParams) {
      // Avoid duplicating params already added by pattern
      if (!parameters.find((existing) => existing.name === p.name)) {
        parameters.push(extraParamToSchema(p));
      }
    }
  }

  return {
    endpoint: ep.cliName,
    path: `/api/${ep.path}`,
    group: ep.group,
    pattern: ep.pattern,
    description: ep.summary,
    parameters,
  };
}

export function registerSchemaCommand(program: Command): void {
  program
    .command('schema [endpoint]')
    .description(
      'Dump parameter schema for an endpoint (for AI agent introspection).\n' +
      'Without argument, lists all endpoint names grouped by group.'
    )
    .action((endpoint?: string) => {
      if (!endpoint) {
        // List all endpoints grouped
        const output: Record<string, string[]> = {};
        for (const [groupName, eps] of REGISTRY_BY_GROUP) {
          output[groupName] = eps.map((ep) => ep.cliName);
        }
        console.log(JSON.stringify(output, null, 2));
        return;
      }

      const ep = REGISTRY_BY_CLI_NAME.get(endpoint);
      if (!ep) {
        console.error(`Unknown endpoint: "${endpoint}". Run "dart-fss schema" to list all.`);
        process.exit(1);
      }

      const schema = buildSchema(ep);
      console.log(JSON.stringify(schema, null, 2));
    });
}
