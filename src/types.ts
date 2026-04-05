import type { GlobalOutputOptions } from './output.js';

export type ParamPattern = 'periodic' | 'dateRange' | 'corpOnly' | 'special';

export type ApiGroup = 'disclosure' | 'report' | 'financial' | 'equity' | 'major' | 'securities';

export interface EndpointMeta {
  path: string;
  cliName: string;
  summary: string;
  pattern: ParamPattern;
  group: ApiGroup;
  tag: string;
  extraParams?: ExtraParam[];
}

export interface ExtraParam {
  name: string;
  description: string;
  required: boolean;
  enum?: string[];
}

export interface DartResponse {
  status: string;
  message: string;
  [key: string]: unknown;
}

export interface CorpCodeEntry {
  corp_code: string;
  corp_name: string;
  stock_code: string;
  modify_date: string;
  korean_name?: string;
  stock_name?: string;
}

export interface DartCliOptions extends GlobalOutputOptions {
  apiKey?: string;
  json?: string;
  dryRun?: boolean;
}

export const REPRT_CODE_MAP: Record<string, string> = {
  'q1': '11013',
  'half': '11012',
  'q3': '11014',
  'annual': '11011',
};

export const IDX_CL_CODE_MAP: Record<string, string> = {
  'profitability': 'M210000',
  'stability': 'M220000',
  'growth': 'M230000',
  'activity': 'M240000',
};
