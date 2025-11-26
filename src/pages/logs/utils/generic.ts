// 日志流 系统 Message 字段解析
const BUILTIN_GENERIC_MESSAGE_FIELDS = ['message', '@message'];
const BUILTIN_FALLBACK_MESSAGE_FIELDS = ['log.original', 'event.original'];

export const getGenericRules = (genericMessageFields: string[]) => {
  return [
    ...Array.from(new Set([...genericMessageFields, ...BUILTIN_GENERIC_MESSAGE_FIELDS])).flatMap(
      createGenericRulesForField,
    ),
    ...BUILTIN_FALLBACK_MESSAGE_FIELDS.filter((fieldName) => !genericMessageFields.includes(fieldName)).flatMap(
      createFallbackRulesForField,
    ),
  ];
};

const createGenericRulesForField = (fieldName: string) => [
  {
    when: {
      exists: ['event.dataset', 'log.level', fieldName, 'error.stack_trace.text'],
    },
    format: [
      {
        constant: '[',
      },
      {
        field: 'event.dataset',
      },
      {
        constant: '][',
      },
      {
        field: 'log.level',
      },
      {
        constant: '] ',
      },
      {
        field: fieldName,
      },
      {
        constant: '\n',
      },
      {
        field: 'error.stack_trace.text',
      },
    ],
  },
  {
    when: {
      exists: ['event.dataset', 'log.level', fieldName],
    },
    format: [
      {
        constant: '[',
      },
      {
        field: 'event.dataset',
      },
      {
        constant: '][',
      },
      {
        field: 'log.level',
      },
      {
        constant: '] ',
      },
      {
        field: fieldName,
      },
    ],
  },
  {
    when: {
      exists: ['log.level', fieldName, 'error.stack_trace.text'],
    },
    format: [
      {
        constant: '[',
      },
      {
        field: 'log.level',
      },
      {
        constant: '] ',
      },
      {
        field: fieldName,
      },
      {
        constant: '\n',
      },
      {
        field: 'error.stack_trace.text',
      },
    ],
  },
  {
    when: {
      exists: ['log.level', fieldName],
    },
    format: [
      {
        constant: '[',
      },
      {
        field: 'log.level',
      },
      {
        constant: '] ',
      },
      {
        field: fieldName,
      },
    ],
  },
  {
    when: {
      exists: [fieldName, 'error.stack_trace.text'],
    },
    format: [
      {
        field: fieldName,
      },
      {
        constant: '\n',
      },
      {
        field: 'error.stack_trace.text',
      },
    ],
  },
  {
    when: {
      exists: [fieldName],
    },
    format: [
      {
        field: fieldName,
      },
    ],
  },
];

const createFallbackRulesForField = (fieldName: string) => [
  {
    when: {
      exists: ['event.dataset', fieldName],
    },
    format: [
      {
        constant: '[',
      },
      {
        field: 'event.dataset',
      },
      {
        constant: '] ',
      },
      {
        field: fieldName,
      },
    ],
  },
  {
    when: {
      exists: [fieldName],
    },
    format: [
      {
        field: fieldName,
      },
    ],
  },
];

export const filebeatApache2Rules = [
  {
    // pre-ECS
    when: {
      existsPrefix: ['apache2.access'],
    },
    format: [
      {
        constant: '[apache][access] ',
      },
      {
        field: 'apache2.access.remote_ip',
      },
      {
        constant: ' ',
      },
      {
        field: 'apache2.access.user_name',
      },
      {
        constant: ' "',
      },
      {
        field: 'apache2.access.method',
      },
      {
        constant: ' ',
      },
      {
        field: 'apache2.access.url',
      },
      {
        constant: ' HTTP/',
      },
      {
        field: 'apache2.access.http_version',
      },
      {
        constant: '" ',
      },
      {
        field: 'apache2.access.response_code',
      },
      {
        constant: ' ',
      },
      {
        field: 'apache2.access.body_sent.bytes',
      },
    ],
  },
  {
    // ECS
    when: {
      values: {
        'event.dataset': 'apache.error',
      },
    },
    format: [
      {
        constant: '[apache][',
      },
      {
        field: 'log.level',
      },
      {
        constant: '] ',
      },
      {
        field: 'message',
      },
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['apache2.error.message'],
    },
    format: [
      {
        constant: '[apache][',
      },
      {
        field: 'apache2.error.level',
      },
      {
        constant: '] ',
      },
      {
        field: 'apache2.error.message',
      },
    ],
  },
];

export const filebeatNginxRules = [
  {
    // pre-ECS
    when: {
      exists: ['nginx.access.method'],
    },
    format: [
      {
        constant: '[nginx][access] ',
      },
      {
        field: 'nginx.access.remote_ip',
      },
      {
        constant: ' ',
      },
      {
        field: 'nginx.access.user_name',
      },
      {
        constant: ' "',
      },
      {
        field: 'nginx.access.method',
      },
      {
        constant: ' ',
      },
      {
        field: 'nginx.access.url',
      },
      {
        constant: ' HTTP/',
      },
      {
        field: 'nginx.access.http_version',
      },
      {
        constant: '" ',
      },
      {
        field: 'nginx.access.response_code',
      },
      {
        constant: ' ',
      },
      {
        field: 'nginx.access.body_sent.bytes',
      },
    ],
  },
  {
    // ECS
    when: {
      values: {
        'event.dataset': 'nginx.error',
      },
    },
    format: [
      {
        constant: '[nginx]',
      },
      {
        constant: '[',
      },
      {
        field: 'log.level',
      },
      {
        constant: '] ',
      },
      {
        field: 'message',
      },
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['nginx.error.message'],
    },
    format: [
      {
        constant: '[nginx]',
      },
      {
        constant: '[',
      },
      {
        field: 'nginx.error.level',
      },
      {
        constant: '] ',
      },
      {
        field: 'nginx.error.message',
      },
    ],
  },
];

export const filebeatRedisRules = [
  {
    when: {
      exists: ['redis.log.message'],
    },
    format: [
      {
        constant: '[Redis]',
      },
      {
        constant: '[',
      },
      {
        field: 'redis.log.level',
      },
      {
        constant: '] ',
      },
      {
        field: 'redis.log.message',
      },
    ],
  },
];

export const filebeatSystemRules = [
  {
    when: {
      exists: ['system.syslog.message'],
    },
    format: [
      {
        constant: '[System][syslog] ',
      },
      {
        field: 'system.syslog.program',
      },
      {
        constant: ' - ',
      },
      {
        field: 'system.syslog.message',
      },
    ],
  },
  {
    when: {
      exists: ['system.auth.message'],
    },
    format: [
      {
        constant: '[System][auth] ',
      },
      {
        field: 'system.auth.program',
      },
      {
        constant: ' - ',
      },
      {
        field: 'system.auth.message',
      },
    ],
  },
  {
    when: {
      exists: ['system.auth.ssh.event'],
    },
    format: [
      {
        constant: '[System][auth][ssh]',
      },
      {
        constant: ' ',
      },
      {
        field: 'system.auth.ssh.event',
      },
      {
        constant: ' user ',
      },
      {
        field: 'system.auth.user',
      },
      {
        constant: ' from ',
      },
      {
        field: 'system.auth.ssh.ip',
      },
    ],
  },
  {
    when: {
      exists: ['system.auth.ssh.dropped_ip'],
    },
    format: [
      {
        constant: '[System][auth][ssh]',
      },
      {
        constant: ' Dropped connection from ',
      },
      {
        field: 'system.auth.ssh.dropped_ip',
      },
    ],
  },
];

export const filebeatMySQLRules = [
  {
    // pre-ECS
    when: {
      exists: ['mysql.error.message'],
    },
    format: [
      {
        constant: '[MySQL][error] ',
      },
      {
        field: 'mysql.error.message',
      },
    ],
  },
  {
    // ECS
    when: {
      exists: ['ecs.version', 'mysql.slowlog.query'],
    },
    format: [
      {
        constant: '[MySQL][slowlog] ',
      },
      {
        field: 'user.name',
      },
      {
        constant: '@',
      },
      {
        field: 'source.domain',
      },
      {
        constant: ' [',
      },
      {
        field: 'source.ip',
      },
      {
        constant: '] ',
      },
      {
        constant: ' - ',
      },
      {
        field: 'event.duration',
      },
      {
        constant: ' ns - ',
      },
      {
        field: 'mysql.slowlog.query',
      },
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['mysql.slowlog.user', 'mysql.slowlog.query_time.sec', 'mysql.slowlog.query'],
    },
    format: [
      {
        constant: '[MySQL][slowlog] ',
      },
      {
        field: 'mysql.slowlog.user',
      },
      {
        constant: '@',
      },
      {
        field: 'mysql.slowlog.host',
      },
      {
        constant: ' [',
      },
      {
        field: 'mysql.slowlog.ip',
      },
      {
        constant: '] ',
      },
      {
        constant: ' - ',
      },
      {
        field: 'mysql.slowlog.query_time.sec',
      },
      {
        constant: ' s - ',
      },
      {
        field: 'mysql.slowlog.query',
      },
    ],
  },
];

const commonActionField = [{ constant: '[AuditD][' }, { field: 'event.action' }, { constant: ']' }];
const commonOutcomeField = [{ constant: ' ' }, { field: 'event.outcome' }];
const labelFieldsPrefix = (label: string, fieldsPrefix: string) => [
  { constant: ' ' },
  { constant: label },
  { constant: '=' },
  { fieldsPrefix },
];

export const filebeatAuditdRules = [
  {
    // ECS format with outcome
    when: {
      all: [{ exists: ['ecs.version', 'event.action', 'event.outcome'] }, { existsPrefix: ['auditd.log'] }],
    },
    format: [
      ...commonActionField,
      ...commonOutcomeField,
      ...labelFieldsPrefix('user', 'user'),
      ...labelFieldsPrefix('process', 'process'),
      { constant: ' ' },
      { fieldsPrefix: 'auditd.log' },
      { constant: ' ' },
      { field: 'message' },
    ],
  },
  {
    // ECS format without outcome
    when: {
      all: [{ exists: ['ecs.version', 'event.action'] }, { existsPrefix: ['auditd.log'] }],
    },
    format: [
      ...commonActionField,
      ...labelFieldsPrefix('user', 'user'),
      ...labelFieldsPrefix('process', 'process'),
      { constant: ' ' },
      { fieldsPrefix: 'auditd.log' },
      { constant: ' ' },
      { field: 'message' },
    ],
  },
  {
    // pre-ECS IPSEC_EVENT Rule
    when: {
      all: [
        { exists: ['auditd.log.record_type', 'auditd.log.src', 'auditd.log.dst', 'auditd.log.op'] },
        { values: { 'auditd.log.record_type': 'MAC_IPSEC_EVENT' } },
      ],
    },
    format: [
      { constant: '[AuditD][' },
      { field: 'auditd.log.record_type' },
      { constant: '] src:' },
      { field: 'auditd.log.src' },
      { constant: ' dst:' },
      { field: 'auditd.log.dst' },
      { constant: ' op:' },
      { field: 'auditd.log.op' },
    ],
  },
  {
    // pre-ECS SYSCALL Rule
    when: {
      all: [
        {
          exists: [
            'auditd.log.record_type',
            'auditd.log.exe',
            'auditd.log.gid',
            'auditd.log.uid',
            'auditd.log.tty',
            'auditd.log.pid',
            'auditd.log.ppid',
          ],
        },
        { values: { 'auditd.log.record_type': 'SYSCALL' } },
      ],
    },
    format: [
      { constant: '[AuditD][' },
      { field: 'auditd.log.record_type' },
      { constant: '] exe:' },
      { field: 'auditd.log.exe' },
      { constant: ' gid:' },
      { field: 'auditd.log.gid' },
      { constant: ' uid:' },
      { field: 'auditd.log.uid' },
      { constant: ' tty:' },
      { field: 'auditd.log.tty' },
      { constant: ' pid:' },
      { field: 'auditd.log.pid' },
      { constant: ' ppid:' },
      { field: 'auditd.log.ppid' },
    ],
  },
  {
    // pre-ECS Events with `msg` Rule
    when: {
      exists: ['auditd.log.record_type', 'auditd.log.msg'],
    },
    format: [
      { constant: '[AuditD][' },
      { field: 'auditd.log.record_type' },
      { constant: '] ' },
      { field: 'auditd.log.msg' },
    ],
  },
  {
    // pre-ECS Events with `msg` Rule
    when: {
      exists: ['auditd.log.record_type'],
    },
    format: [{ constant: '[AuditD][' }, { field: 'auditd.log.record_type' }, { constant: '] Event without message.' }],
  },
];

const ecsFrontendFields = [
  {
    field: 'source.address',
  },
  {
    constant: ':',
  },
  {
    field: 'source.port',
  },
  {
    constant: ' ',
  },
  {
    field: 'haproxy.frontend_name',
  },
];

const preEcsFrontendFields = [
  {
    field: 'haproxy.client.ip',
  },
  {
    constant: ':',
  },
  {
    field: 'haproxy.client.port',
  },
  {
    constant: ' ',
  },
  {
    field: 'haproxy.frontend_name',
  },
];

const commonBackendFields = [
  {
    constant: ' -> ',
  },
  {
    field: 'haproxy.backend_name',
  },
  {
    constant: '/',
  },
  {
    field: 'haproxy.server_name',
  },
];

const commonConnectionStatsFields = [
  {
    field: 'haproxy.connections.active',
  },
  {
    constant: '/',
  },
  {
    field: 'haproxy.connections.frontend',
  },
  {
    constant: '/',
  },
  {
    field: 'haproxy.connections.backend',
  },
  {
    constant: '/',
  },
  {
    field: 'haproxy.connections.server',
  },
  {
    constant: '/',
  },
  {
    field: 'haproxy.connections.retries',
  },
];

const commonQueueStatsFields = [
  {
    field: 'haproxy.server_queue',
  },
  {
    constant: '/',
  },
  {
    field: 'haproxy.backend_queue',
  },
];

export const filebeatHaproxyRules = [
  {
    // ECS
    when: {
      exists: ['ecs.version', 'haproxy.http.request.raw_request_line'],
    },
    format: [
      {
        constant: '[HAProxy][http] ',
      },
      ...ecsFrontendFields,
      ...commonBackendFields,
      {
        constant: ' "',
      },
      {
        field: 'haproxy.http.request.raw_request_line',
      },
      {
        constant: '" ',
      },
      {
        field: 'http.response.status_code',
      },
      {
        constant: ' ',
      },
      {
        field: 'haproxy.http.request.time_wait_ms',
      },
      {
        constant: '/',
      },
      {
        field: 'event.duration',
      },
      {
        constant: '/',
      },
      {
        field: 'haproxy.connection_wait_time_ms',
      },
      {
        constant: '/',
      },
      {
        field: 'haproxy.http.request.time_wait_without_data_ms',
      },
      {
        constant: '/',
      },
      {
        field: 'event.duration',
      },
      {
        constant: ' ',
      },
      ...commonConnectionStatsFields,
      {
        constant: ' ',
      },
      ...commonQueueStatsFields,
    ],
  },
  {
    // ECS
    when: {
      exists: ['ecs.version', 'haproxy.connections.active'],
    },
    format: [
      {
        constant: '[HAProxy][tcp] ',
      },
      ...ecsFrontendFields,
      ...commonBackendFields,
      {
        constant: ' ',
      },
      ...commonConnectionStatsFields,
      {
        constant: ' ',
      },
      ...commonQueueStatsFields,
    ],
  },
  {
    // ECS
    when: {
      exists: ['ecs.version', 'haproxy.error_message'],
    },
    format: [
      {
        constant: '[HAProxy] ',
      },
      ...ecsFrontendFields,
      {
        constant: ' ',
      },
      {
        field: 'haproxy.error_message',
      },
    ],
  },
  {
    // ECS
    when: {
      exists: ['ecs.version', 'haproxy.frontend_name'],
    },
    format: [
      {
        constant: '[HAProxy] ',
      },
      ...ecsFrontendFields,
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['haproxy.http.request.raw_request_line'],
    },
    format: [
      {
        constant: '[HAProxy][http] ',
      },
      ...preEcsFrontendFields,
      ...commonBackendFields,
      {
        constant: ' "',
      },
      {
        field: 'haproxy.http.request.raw_request_line',
      },
      {
        constant: '" ',
      },
      {
        field: 'haproxy.http.response.status_code',
      },
      {
        constant: ' ',
      },
      {
        field: 'haproxy.http.request.time_wait_ms',
      },
      {
        constant: '/',
      },
      {
        field: 'haproxy.total_waiting_time_ms',
      },
      {
        constant: '/',
      },
      {
        field: 'haproxy.connection_wait_time_ms',
      },
      {
        constant: '/',
      },
      {
        field: 'haproxy.http.request.time_wait_without_data_ms',
      },
      {
        constant: '/',
      },
      {
        field: 'haproxy.http.request.time_active_ms',
      },
      {
        constant: ' ',
      },
      ...commonConnectionStatsFields,
      {
        constant: ' ',
      },
      ...commonQueueStatsFields,
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['haproxy.connections.active'],
    },
    format: [
      {
        constant: '[HAProxy][tcp] ',
      },
      ...preEcsFrontendFields,
      ...commonBackendFields,
      {
        constant: ' ',
      },
      ...commonConnectionStatsFields,
      {
        constant: ' ',
      },
      ...commonQueueStatsFields,
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['haproxy.error_message'],
    },
    format: [
      {
        constant: '[HAProxy] ',
      },
      ...preEcsFrontendFields,
      {
        constant: ' ',
      },
      {
        field: 'haproxy.error_message',
      },
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['haproxy.frontend_name'],
    },
    format: [
      {
        constant: '[HAProxy] ',
      },
      ...preEcsFrontendFields,
    ],
  },
];

export const filebeatIcingaRules = [
  {
    // pre-ECS
    when: {
      exists: ['icinga.main.message'],
    },
    format: [
      {
        constant: '[Icinga][',
      },
      {
        field: 'icinga.main.facility',
      },
      {
        constant: '][',
      },
      {
        field: 'icinga.main.severity',
      },
      {
        constant: '] ',
      },
      {
        field: 'icinga.main.message',
      },
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['icinga.debug.message'],
    },
    format: [
      {
        constant: '[Icinga][',
      },
      {
        field: 'icinga.debug.facility',
      },
      {
        constant: '][',
      },
      {
        field: 'icinga.debug.severity',
      },
      {
        constant: '] ',
      },
      {
        field: 'icinga.debug.message',
      },
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['icinga.startup.message'],
    },
    format: [
      {
        constant: '[Icinga][',
      },
      {
        field: 'icinga.startup.facility',
      },
      {
        constant: '][',
      },
      {
        field: 'icinga.startup.severity',
      },
      {
        constant: '] ',
      },
      {
        field: 'icinga.startup.message',
      },
    ],
  },
];

export const filebeatIisRules = [
  {
    // pre-ECS
    when: {
      exists: ['iis.access.method'],
    },
    format: [
      {
        constant: '[iis][access] ',
      },
      {
        field: 'iis.access.remote_ip',
      },
      {
        constant: ' ',
      },
      {
        field: 'iis.access.user_name',
      },
      {
        constant: ' "',
      },
      {
        field: 'iis.access.method',
      },
      {
        constant: ' ',
      },
      {
        field: 'iis.access.url',
      },
      {
        constant: ' HTTP/',
      },
      {
        field: 'iis.access.http_version',
      },
      {
        constant: '" ',
      },
      {
        field: 'iis.access.response_code',
      },
      {
        constant: ' ',
      },
      {
        field: 'iis.access.body_sent.bytes',
      },
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['iis.error.url'],
    },
    format: [
      {
        constant: '[iis][error] ',
      },
      {
        field: 'iis.error.remote_ip',
      },
      {
        constant: ' "',
      },
      {
        field: 'iis.error.method',
      },
      {
        constant: ' ',
      },
      {
        field: 'iis.error.url',
      },
      {
        constant: ' HTTP/',
      },
      {
        field: 'iis.error.http_version',
      },
      {
        constant: '" ',
      },
      {
        field: 'iis.error.response_code',
      },
      {
        constant: ' ',
      },
      {
        field: 'iis.error.reason_phrase',
      },
    ],
  },
  {
    // ECS
    when: {
      exists: ['ecs.version', 'iis.error.reason_phrase'],
    },
    format: [
      {
        constant: '[iis][error] ',
      },
      {
        field: 'source.ip',
      },
      {
        constant: ' ',
      },
      {
        field: 'iis.error.reason_phrase',
      },
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['iis.error.reason_phrase'],
    },
    format: [
      {
        constant: '[iis][error] ',
      },
      {
        field: 'iis.error.remote_ip',
      },
      {
        constant: ' ',
      },
      {
        field: 'iis.error.reason_phrase',
      },
    ],
  },
];

export const filebeatLogstashRules = [
  {
    // pre-ECS
    when: {
      exists: ['logstash.log.message'],
    },
    format: [
      {
        constant: '[Logstash][',
      },
      {
        field: 'logstash.log.level',
      },
      {
        constant: '] ',
      },
      {
        field: 'logstash.log.module',
      },
      {
        constant: ' - ',
      },
      {
        field: 'logstash.log.message',
      },
    ],
  },
  {
    // ECS
    when: {
      all: [{ exists: ['ecs.version'] }, { existsPrefix: ['logstash.slowlog'] }],
    },
    format: [
      {
        constant: '[Logstash][',
      },
      {
        field: 'log.level',
      },
      {
        constant: '] ',
      },
      {
        fieldsPrefix: 'logstash.slowlog',
      },
    ],
  },
  {
    // pre-ECS
    when: {
      exists: ['logstash.slowlog.message'],
    },
    format: [
      {
        constant: '[Logstash][',
      },
      {
        field: 'logstash.slowlog.level',
      },
      {
        constant: '] ',
      },
      {
        field: 'logstash.slowlog.module',
      },
      {
        constant: ' - ',
      },
      {
        field: 'logstash.slowlog.message',
      },
    ],
  },
];

export const filebeatMongodbRules = [
  {
    // pre-ECS
    when: {
      exists: ['mongodb.log.message'],
    },
    format: [
      {
        constant: '[MongoDB][',
      },
      {
        field: 'mongodb.log.component',
      },
      {
        constant: '] ',
      },
      {
        field: 'mongodb.log.message',
      },
    ],
  },
];

export const filebeatOsqueryRules = [
  {
    // pre-ECS
    when: {
      exists: ['osquery.result.name'],
    },
    format: [
      {
        constant: '[Osquery][',
      },
      {
        field: 'osquery.result.action',
      },
      {
        constant: '] ',
      },
      {
        field: 'osquery.result.host_identifier',
      },
      {
        constant: ' ',
      },
      {
        fieldsPrefix: 'osquery.result.columns',
      },
    ],
  },
];

export const filebeatTraefikRules = [
  {
    // pre-ECS
    when: {
      exists: ['traefik.access.method'],
    },
    format: [
      {
        constant: '[traefik][access] ',
      },
      {
        field: 'traefik.access.remote_ip',
      },
      {
        constant: ' ',
      },
      {
        field: 'traefik.access.frontend_name',
      },
      {
        constant: ' -> ',
      },
      {
        field: 'traefik.access.backend_url',
      },
      {
        constant: ' "',
      },
      {
        field: 'traefik.access.method',
      },
      {
        constant: ' ',
      },
      {
        field: 'traefik.access.url',
      },
      {
        constant: ' HTTP/',
      },
      {
        field: 'traefik.access.http_version',
      },
      {
        constant: '" ',
      },
      {
        field: 'traefik.access.response_code',
      },
      {
        constant: ' ',
      },
      {
        field: 'traefik.access.body_sent.bytes',
      },
    ],
  },
];

const commonPrefixFields = [{ constant: '[' }, { field: 'event.module' }, { constant: '][access] ' }];

export const genericWebserverRules = [
  {
    // ECS with parsed url
    when: {
      exists: ['ecs.version', 'http.response.status_code', 'url.path'],
    },
    format: [
      ...commonPrefixFields,
      {
        field: 'source.ip',
      },
      {
        constant: ' ',
      },
      {
        field: 'user.name',
      },
      {
        constant: ' "',
      },
      {
        field: 'http.request.method',
      },
      {
        constant: ' ',
      },
      {
        field: 'url.path',
      },
      {
        constant: '?',
      },
      {
        field: 'url.query',
      },
      {
        constant: ' HTTP/',
      },
      {
        field: 'http.version',
      },
      {
        constant: '" ',
      },
      {
        field: 'http.response.status_code',
      },
      {
        constant: ' ',
      },
      {
        field: 'http.response.body.bytes',
      },
    ],
  },
  {
    // ECS with original url
    when: {
      exists: ['ecs.version', 'http.response.status_code'],
    },
    format: [
      ...commonPrefixFields,
      {
        field: 'source.ip',
      },
      {
        constant: ' ',
      },
      {
        field: 'user.name',
      },
      {
        constant: ' "',
      },
      {
        field: 'http.request.method',
      },
      {
        constant: ' ',
      },
      {
        field: 'url.original',
      },
      {
        constant: ' HTTP/',
      },
      {
        field: 'http.version',
      },
      {
        constant: '" ',
      },
      {
        field: 'http.response.status_code',
      },
      {
        constant: ' ',
      },
      {
        field: 'http.response.body.bytes',
      },
    ],
  },
];

export const getBuiltinRules = (genericMessageFields: string[]) => [
  ...filebeatApache2Rules,
  ...filebeatNginxRules,
  ...filebeatRedisRules,
  ...filebeatSystemRules,
  ...filebeatMySQLRules,
  ...filebeatAuditdRules,
  ...filebeatHaproxyRules,
  ...filebeatIcingaRules,
  ...filebeatIisRules,
  ...filebeatLogstashRules,
  ...filebeatMongodbRules,
  ...filebeatOsqueryRules,
  ...filebeatTraefikRules,
  ...genericWebserverRules,
  ...getGenericRules(genericMessageFields),
  {
    when: {
      exists: ['log.path'],
    },
    format: [
      {
        constant: 'failed to format message from ',
      },
      {
        field: 'log.path',
      },
    ],
  },
  {
    when: {
      exists: [],
    },
    format: [
      {
        constant: 'failed to find message',
      },
    ],
  },
];
