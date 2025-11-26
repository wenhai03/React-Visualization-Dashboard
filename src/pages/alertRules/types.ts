export interface AlertRuleType<T> {
  sub_prod: string;
  id: number;
  group_id: number;
  name: string;
  disabled: AlertRuleStatus;
  append_tags: string[];
  rule_config: T;
  cate: string;
  datasource_ids: number[];
  prom_ql: string;
  prom_eval_interval: number;
  prom_for_duration: number;
  runbook_url: string;
  enable_status: boolean;
  enable_days_of_weekss: number[][];
  enable_stimes: number[];
  enable_etimes: number[];
  builtin_id: number;
  notify_channels: string[];
  notify_groups: string[];
  notify_recovered: number;
  recover_duration: number;
  notify_repeat_step: number;
  notify_max_number: number;
  callbacks: string[];
  annotations: any;
  prod: string;
  severities: number[];
  event_count: number;
  update_at: number;
  relation_input?: string[];
}

export enum AlertRuleStatus {
  Enable = 0,
  UnEnable = 1,
}

export interface AggregationType {
  text: string;
  fieldRequired: boolean;
  value: string;
  validNormalizedTypes: string[];
}

export enum AGGREGATION_TYPES {
  COUNT = 'count',
  AVERAGE = 'avg',
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
}

export const builtInAggregationTypes: { [key: string]: AggregationType } = {
  count: {
    text: 'count()',
    fieldRequired: false,
    value: AGGREGATION_TYPES.COUNT,
    validNormalizedTypes: [],
  },
  avg: {
    text: 'average()',
    fieldRequired: true,
    validNormalizedTypes: ['number'],
    value: AGGREGATION_TYPES.AVERAGE,
  },
  sum: {
    text: 'sum()',
    fieldRequired: true,
    validNormalizedTypes: ['number'],
    value: AGGREGATION_TYPES.SUM,
  },
  min: {
    text: 'min()',
    fieldRequired: true,
    validNormalizedTypes: ['number', 'date'],
    value: AGGREGATION_TYPES.MIN,
  },
  max: {
    text: 'max()',
    fieldRequired: true,
    validNormalizedTypes: ['number', 'date'],
    value: AGGREGATION_TYPES.MAX,
  },
};
