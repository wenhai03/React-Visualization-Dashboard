import moment from 'moment';

export const defaultRuleConfig = {
  host: {
    queries: [
      {
        key: 'group',
        op: '==',
        values: [],
      },
    ],
    triggers: [
      {
        type: 'target_miss',
        severity: 2,
        duration: 30,
      },
    ],
  },
  metric: {
    queries: [
      {
        prom_ql: '',
        severity: 2,
      },
    ],
  },
  dial: {
    queries: [
      {
        type: 'all',
        severity: 2,
        alert_type: 'fail',
      },
    ],
  },
  log: {
    queries: [
      {
        type: 'elastic_log',
        severity: 2,
        rule: {
          comparators: [
            {
              field: '',
              comparator: '',
              value: '',
            },
          ],
          check_value: {
            operator: '>',
            values: [1000],
          },
          search_time: {
            size: 5,
            unit: 'm',
          },
          aggregation_type: 'count',
          group: {
            type: 'top',
            top_count: 1,
            top_field: '',
          },
          mode: 'common',
        },
      },
    ],
  },
  apm: {
    queries: [
      {
        type: 'apm_error',
        severity: 2,
        rule: {
          time_field: '@timestamp',
          service_name: '',
          service_environment: '',
          transaction_type: '',
          get_value_type: 'avg',
          check_value: {
            operator: '>',
            values: [25],
          },
          search_time: {
            size: 1,
            unit: 'm',
          },
        },
      },
    ],
  },
  logging: {
    queries: [
      {
        interval_unit: 'min',
        interval: 1,
        date_field: '@timestamp',
        value: {
          func: 'count',
        },
      },
    ],
    triggers: [
      {
        mode: 0,
        expressions: [
          {
            ref: 'A',
            comparisonOperator: '>',
            value: 0,
            logicalOperator: '&&',
          },
        ],
        severity: 2,
      },
    ],
  },
  anomaly: {
    algorithm: 'holtwinters',
    severity: 2,
  },
};

export const defaultValues = {
  disabled: 0,
  effective_time: [
    {
      enable_days_of_week: ['0', '1', '2', '3', '4', '5', '6'],
      enable_stime: moment('00:00', 'HH:mm'),
      enable_etime: moment('23:59', 'HH:mm'),
    },
  ],
  notify_recovered: true,
  notify_mode: 1,
  recover_duration: 0,
  notify_repeat_step: 60,
  notify_max_number: 0,
  rule_config: defaultRuleConfig.metric,
  datasource_ids: [],
  prom_eval_interval: 30,
  prom_for_duration: 60,
  prod: 'metric',
  cate: 'prometheus',
  enable_status: true,
  enable_in_bg: 0,
};

export const ruleTypeOptions = [
  {
    label: 'Metric',
    value: 'metric',
    pro: false,
  },
  {
    label: 'Host',
    value: 'host',
    pro: false,
  },
  {
    label: 'Dial',
    value: 'dial',
    pro: false,
  },
  {
    label: 'Log',
    value: 'log',
    pro: false,
  },
  {
    label: 'Apm',
    value: 'apm',
    pro: false,
  },
];
