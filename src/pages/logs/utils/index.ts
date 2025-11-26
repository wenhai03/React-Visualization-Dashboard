import _ from 'lodash';
import {
  timeMilliseconds,
  timeSecond as second,
  timeMinute as minute,
  timeHour as hour,
  timeDay as day,
  timeMonth as month,
  timeWeek as week,
  timeYear as year,
} from 'd3-time';
import { timeFormat as format } from 'd3-time-format';
import { fromKueryExpression, toElasticsearchQuery } from '@/components/SearchBar/es-query';
import { logsDownLoad } from '@/services/logs';
import * as streamSaver from 'streamsaver';
import { highlightFieldValue } from '@/pages/logs/Stream';
import moment from 'moment-timezone';
import { saveAs } from 'file-saver';
import { message } from 'antd';
import { highlightTags, htmlTags } from '@/utils/constant';

interface Mappings {
  [index: string]: {
    properties: {
      [key: string]:
        | {
            type: string;
          }
        | Mappings;
    };
  };
}

const typeMap: Record<string, string> = {
  float: 'number',
  double: 'number',
  integer: 'number',
  long: 'number',
  date: 'date',
  date_nanos: 'date',
  string: 'string',
  text: 'string',
  scaled_float: 'number',
  nested: 'nested',
  histogram: 'number',
};

export const getMoment = (value, timezone = 'Browser') => {
  return moment.tz(value, timezone === 'Browser' ? moment.tz.guess() : timezone);
};

export function mappingsToFields(mappings: Mappings, type?: string) {
  const fields: string[] = [];
  _.forEach(mappings, (item: any) => {
    function loop(mappings, prefix = '') {
      // mappings?.doc?.properties 为了兼容 6.x 版本接口
      _.forEach(mappings?.doc?.properties || mappings?.properties, (item, key) => {
        if (item.type) {
          if (typeMap[item.type] === type || !type) {
            fields.push(`${prefix}${key}`);
          }
        } else {
          loop(item, `${key}.`);
        }
      });
    }
    loop(item.mappings);
  });
  return _.sortBy(_.union(fields));
}

export function normalizeTimeseriesQueryRequestBody(params: any, intervalkey: string) {
  const header = {
    search_type: 'query_then_fetch',
    ignore_unavailable: true,
    index: params.index,
  };
  const body: any = {
    size: params.limit,
    query: {
      bool: {
        filter: [
          {
            range: {
              [params.date_field]: {
                gte: params.start,
                lte: params.end,
                format: 'epoch_millis',
              },
            },
          },
        ],
      },
    },
    script_fields: {},
    _source: false,
    aggs: {
      A: {
        date_histogram: {
          field: '@timestamp',
          min_doc_count: 0,
          extended_bounds: {
            min: params.start,
            max: params.end,
          },
          format: 'epoch_millis',
          [intervalkey]: params.interval,
        },
        aggs: {},
      },
    },
  };
  if (params.filter) {
    body.query.bool.filter.push(params.filter);
  }
  return `${JSON.stringify(header)}\n${JSON.stringify(body)}\n`;
}

// 日志流-时间
export function normalizeTimeQueryRequestBody(params: any) {
  let bucketSize = 500;
  let bucketIntervalStarts = timeMilliseconds(new Date(params.start), new Date(params.end), bucketSize);

  if (bucketIntervalStarts.length > 100) {
    bucketSize = Math.ceil((bucketIntervalStarts.length * bucketSize) / 100);
    bucketIntervalStarts = timeMilliseconds(new Date(params.start), new Date(params.end), bucketSize);
  }

  const header = {
    search_type: 'query_then_fetch',
    ignore_unavailable: true,
    index: params.index,
    allow_no_indices: true,
  };
  const body: any = {
    aggregations: {
      count_by_date: {
        date_range: {
          field: '@timestamp',
          format: 'epoch_millis',
          ranges: bucketIntervalStarts.map((bucketIntervalStart) => ({
            from: bucketIntervalStart.getTime(),
            to: bucketIntervalStart.getTime() + bucketSize,
          })),
        },
        aggregations: {
          top_hits_by_key: {
            top_hits: {
              size: 1,
              sort: [{ ['@timestamp']: 'asc' }, { ['_doc']: 'asc' }],
              _source: false,
            },
          },
        },
      },
    },
    query: {
      bool: {
        filter: [
          {
            range: {
              ['@timestamp']: {
                gte: params.start,
                lte: params.end,
                format: 'epoch_millis',
              },
            },
          },
        ],
      },
    },
    size: params.limit,
    track_total_hits: false,
  };
  if (params.filter) {
    body.query.bool.filter.push(params.filter);
  }
  return `${JSON.stringify(header)}\n${JSON.stringify(body)}\n`;
}

export function flatten(target: object, opts?: { delimiter?: any; maxDepth?: any; safe?: any }): any {
  opts = opts || {};

  const delimiter = opts.delimiter || '.';
  let maxDepth = opts.maxDepth || 3;
  let currentDepth = 1;
  const output: any = {};

  function step(object: any, prev: string | null) {
    Object.keys(object).forEach((key) => {
      const value = object[key];
      const isarray = opts?.safe && Array.isArray(value);
      const type = Object.prototype.toString.call(value);
      const isobject = type === '[object Object]';

      const newKey = prev ? prev + delimiter + key : key;

      if (!opts?.maxDepth) {
        maxDepth = currentDepth + 1;
      }

      if (!isarray && isobject && Object.keys(value).length && currentDepth < maxDepth) {
        ++currentDepth;
        return step(value, newKey);
      }

      if (isobject && Object.keys(value).length === 0) {
        output[newKey] = '{}';
        return;
      }
      output[newKey] = value;
    });
  }

  step(target, null);

  return output;
}

export function newTickFormat(date) {
  function multiFormat(date) {
    return (
      second(date) < date
        ? format('.%L')
        : minute(date) < date
        ? format(':%S')
        : hour(date) < date
        ? format('%H:%M')
        : day(date) < date
        ? format('%H:%M')
        : month(date) < date
        ? week(date) < date
          ? format('%a %d')
          : format('%b %d')
        : year(date) < date
        ? format('%B')
        : format('%Y')
    )(date);
  }
  return multiFormat(date);
}

export const flattenHits = (hits: any[]): { docs: Array<Record<string, any>>; propNames: string[] } => {
  const docs: any[] = [];
  let propNames: string[] = [];

  for (const hit of hits) {
    const flattened = hit._source ? flatten(hit._source) : {};
    const doc = {
      _id: hit._id,
      _type: hit._type,
      _index: hit._index,
      sort: hit.sort,
      highlight: hit.highlight,
      _source: { ...flattened },
      fields: { ...flattened },
    };

    for (const propName of Object.keys(doc)) {
      if (propNames.indexOf(propName) === -1) {
        propNames.push(propName);
      }
    }

    docs.push(doc);
  }

  propNames.sort();
  return { docs, propNames };
};

export const getInterval = (timeDiff) => {
  if (timeDiff > 365 * 24 * 60 * 60 * 1000) {
    // 年
    return `${timeDiff / (365 * 24 * 60 * 60 * 1000)} 年`;
  } else if (timeDiff >= 30 * 24 * 60 * 60 * 1000) {
    // 月
    return `${timeDiff / (30 * 24 * 60 * 60 * 1000)} 月`;
  } else if (timeDiff >= 7 * 24 * 60 * 60 * 1000) {
    // 周
    return `${timeDiff / (7 * 24 * 60 * 60 * 1000)} 周`;
  } else if (timeDiff >= 24 * 60 * 60 * 1000) {
    // 天
    return `${timeDiff / (24 * 60 * 60 * 1000)} 天`;
  } else if (timeDiff >= 60 * 60 * 1000) {
    // 时
    return `${timeDiff / (60 * 60 * 1000)} 小时`;
  } else if (timeDiff >= 60 * 1000) {
    // 分
    return `${timeDiff / (60 * 1000)} 分`;
  } else if (timeDiff >= 1000) {
    // 秒
    return `${timeDiff / 1000} 秒`;
  } else {
    // 毫秒
    return `${timeDiff} 毫秒`;
  }
};

export function getTimeLabelFormat(start: number, end: number): string | undefined {
  const diff = Math.abs(end - start);

  // 15 seconds
  if (diff < 15 * 1000) {
    return ':%S.%L';
  }

  // 16 minutes
  if (diff < 16 * 60 * 1000) {
    return '%H:%M:%S';
  }

  // Use D3's default
  return;
}

// 处理日志流右侧时间流数据格式

export const convertDateRangeBucketToSummaryBucket = (bucket) => ({
  entriesCount: bucket.doc_count,
  start: bucket.from || 0,
  end: bucket.to || 0,
  topEntryKeys: bucket.top_hits_by_key.hits.hits.map((hit) => ({
    tiebreaker: hit.sort[1],
    time: hit.sort[0],
  })),
});

export function convertKueryToEsQuery(kuery: string) {
  const ast = fromKueryExpression(kuery);
  return toElasticsearchQuery(ast);
}

// 日志流自定义展示列
export const getDefaultColumnsConfigs = () => {
  const defaultColumnsConfigs = {
    // 应用日志
    app: [
      'service.name',
      'service.environment',
      'log.level', // 日志等级
      'message',
    ],
    // 主机日志
    host: [
      'ident',
      'unit', // 单元
      'message',
    ],
    // POD日志
    pod: [
      'ident',
      'fields.kubernates.pod_name', // POD 名称
      'message',
    ],
    // 容器日志
    container: [
      'ident',
      'fields.docker.container_name', // 容器名称
      'message',
    ],
    // 采集器日志
    graf: ['message'],
    // k8s事件日志
    'k8s-event': ['type', 'reason', 'involvedObject.kind', 'involvedObject.name', 'message'],
    // Syslog 日志
    syslog: ['message'],
    // 自选索引
    index: ['message'],
    // 自选视图
    view: ['message'],
  };
  let newDefaultColumnsConfigs: Record<string, { name: string; visible: boolean }[]> | {} = {};
  Object.entries(defaultColumnsConfigs).forEach(([key, value]) => {
    newDefaultColumnsConfigs[key] = value.map((item) => ({
      name: item,
      visible: true,
    }));
  });

  const localColumnsConfigs = localStorage.getItem('log_stream_columns_configs');
  if (localColumnsConfigs) {
    try {
      const localStorageColumn = JSON.parse(localColumnsConfigs);
      Object.entries(newDefaultColumnsConfigs).forEach(([key, value]) => {
        if (key === 'index' || key === 'view') {
          newDefaultColumnsConfigs[key] = localStorageColumn?.[key] || newDefaultColumnsConfigs[key];
        } else {
          newDefaultColumnsConfigs[key] = value.map((item) => {
            const localItem = _.find(localStorageColumn?.[key], (i) => i.name === item.name);
            if (localItem) {
              item.visible = localItem.visible;
            }
            return item;
          });
        }
      });
    } catch (e) {
      console.error(e);
    }
  }
  return newDefaultColumnsConfigs;
};

export const setDefaultColumnsConfigs = (columnsConfigs) => {
  localStorage.setItem('log_stream_columns_configs', JSON.stringify(columnsConfigs));
};

export const getIndex = (type, ESIndex, defaultIndex) => {
  switch (type) {
    case 'app': {
      // 应用日志
      return ESIndex.elastic_app_log_index;
    }
    case 'host': {
      // 主机日志
      return ESIndex.elastic_journald_log_index;
    }
    case 'graf': {
      // 采集器日志
      return ESIndex.elastic_graf_log_index;
    }
    case 'pod': {
      // POD日志
      return ESIndex.elastic_pod_log_index;
    }
    case 'k8s-event': {
      // k8s-event日志
      return ESIndex.elastic_k8s_event_index;
    }
    case 'container': {
      // 容器日志
      return ESIndex.elastic_container_log_index;
    }
    default: {
      // 自选索引、自选视图、 syslog日志
      return defaultIndex;
    }
  }
};

// 日志导出
let isRequestStopped = false;

const requestData = async (writer, body) => {
  if (isRequestStopped) {
    // 如果用户取消下载，终止后续请求
    return;
  }

  if (body?.file_size < body?.page_size) {
    // 数据请求完毕，关闭文件流
    writer.close();
    return;
  }

  const { dat, err } = await logsDownLoad(body);
  // 切片下载过程中出现问题，终止下载
  if (!(err === '')) {
    message.error('请求异常，请重新下载');
    writer.abort();
    return;
  }

  if (dat.file_bytes) {
    const BOM = '\uFEFF'; // 添加 BOM，避免 Excel 乱码
    const encoder = new TextEncoder();
    // 写入 BOM
    await writer.write(encoder.encode(BOM));
    // 将数据写入到文件
    const uint8Array = encoder.encode(dat.file_bytes);
    writer.write(uint8Array).catch(() => {
      writer.abort();
    });

    // 递归请求下一批数据
    setTimeout(
      () =>
        requestData(writer, {
          ...body,
          file_size: dat.file_size,
          page_size: dat.page_size,
          data_position: dat.data_position,
          scroll_id: dat.scroll_id,
        }),
      0,
    );
  } else {
    message.warning('当前没有可导出的数据');
    writer.close();
  }
};

export const onDownLoad = (body, timezone) => {
  isRequestStopped = false;
  const currentTime = getMoment(new Date(), timezone).format('YYYYMMDDHHmmss');
  // 创建一个WritableStream，用于将数据写入到本地文件
  const fileStream = streamSaver.createWriteStream(`日志导出-${currentTime}.csv`);
  // 将WritableStream传递给StreamSaver.js的saveToStream方法
  const writer = fileStream.getWriter();

  requestData(writer, body);

  writer.closed
    .then(() => {
      // 使用 streamSaver.createBlob 方法创建 Blob 对象
      streamSaver.createBlob(fileStream).then((blob) => {
        // 使用 file-saver 保存 Blob 对象为文件
        saveAs(blob, `日志导出-${currentTime}.csv`);
      });
    })
    .catch((err) => {
      isRequestStopped = true;
    });
};

interface TabifyDocsOptions {
  shallow?: boolean;
  /**
   * If set to `false` the _source of the document, if requested, won't be
   * merged into the flattened document.
   */
  source?: boolean;
  /**
   * If set to `true` values that have been ignored in ES (ignored_field_values)
   * will be merged into the flattened document. This will only have an effect if
   * the `hit` has been retrieved using the `fields` option.
   */
  includeIgnoredValues?: boolean;
}

const EXCLUDED_META_FIELDS: string[] = ['_type', '_source'];

/**
 * Flattens an individual hit (from an ES response) into an object. This will
 * create flattened field names, like `user.name`.
 *
 * @param hit The hit from an ES reponse's hits.hits[]
 * @param indexPattern The index pattern for the requested index if available.
 * @param params Parameters how to flatten the hit
 */
export function flattenHit(hit: any, indexPattern?: any, params?: TabifyDocsOptions) {
  const flat = {} as Record<string, any>;

  function flatten(obj: Record<string, any>, keyPrefix: string = '') {
    for (const [k, val] of Object.entries(obj)) {
      const key = keyPrefix + k;

      const field = indexPattern?.fields.getByName(key);

      if (params?.shallow === false) {
        const isNestedField = field?.type === 'nested';
        if (Array.isArray(val) && !isNestedField) {
          val.forEach((v) => _.isPlainObject(v) && flatten(v, key + '.'));
          continue;
        }
      } else if (flat[key] !== undefined) {
        continue;
      }

      const hasValidMapping = field && field.type !== 'conflict';
      const isValue = !_.isPlainObject(val);

      if (hasValidMapping || isValue) {
        if (!flat[key]) {
          flat[key] = val;
        } else if (Array.isArray(flat[key])) {
          flat[key].push(val);
        } else {
          flat[key] = [flat[key], val];
        }
        continue;
      }

      flatten(val, key + '.');
    }
  }

  flatten(hit.fields || {});
  if (params?.source !== false && hit._source) {
    flatten(hit._source as Record<string, any>);
  } else if (params?.includeIgnoredValues && hit.ignored_field_values) {
    Object.entries(hit.ignored_field_values).forEach(([fieldName, fieldValue]) => {
      if (flat[fieldName]) {
        // If there was already a value from the fields API, make sure we're merging both together
        if (Array.isArray(flat[fieldName])) {
          flat[fieldName] = [...flat[fieldName], ...(fieldValue as string[])];
        } else {
          flat[fieldName] = [flat[fieldName], ...(fieldValue as string[])];
        }
      } else {
        // If no previous value was assigned we can simply use the value from `ignored_field_values` as it is
        flat[fieldName] = fieldValue;
      }
    });
  }

  // Merge all valid meta fields into the flattened object
  indexPattern?.metaFields?.forEach((fieldName) => {
    const isExcludedMetaField = EXCLUDED_META_FIELDS.includes(fieldName) || fieldName.at(0) !== '_';
    if (isExcludedMetaField) {
      return;
    }
    flat[fieldName] = hit[fieldName];
  });

  // Use a proxy to make sure that keys are always returned in a specific order,
  // so we have a guarantee on the flattened order of keys.
  return new Proxy(flat, {
    ownKeys: (target) => {
      return Reflect.ownKeys(target).sort((a, b) => {
        const aIsMeta = indexPattern?.metaFields?.includes(String(a));
        const bIsMeta = indexPattern?.metaFields?.includes(String(b));
        if (aIsMeta && bIsMeta) {
          return String(a).localeCompare(String(b));
        }
        if (aIsMeta) {
          return 1;
        }
        if (bIsMeta) {
          return -1;
        }
        return String(a).localeCompare(String(b));
      });
    },
  });
}

const isConstantSegment = (segment) => 'constant' in segment;

const isFieldSegment = (segment) => 'field' in segment && 'value' in segment;

const isHighlightMessageColumn = (column) => column != null && 'message' in column;

export const isHighlightFieldSegment = (segment) => segment && 'field' in segment && 'highlights' in segment;

export const formatMessageSegments = (messageSegments: any[], highlights: any[], isActiveHighlight: boolean) => {
  return messageSegments.map((messageSegment, index) => {
    if (isFieldSegment(messageSegment)) {
      // we only support one highlight for now
      const [firstHighlight = []] = highlights.map((highlight) => {
        if (isHighlightMessageColumn(highlight)) {
          const segment = highlight.message[index];
          if (isHighlightFieldSegment(segment)) {
            return segment.highlights;
          }
        }
        return [];
      });

      return highlightFieldValue(messageSegment.value, firstHighlight, isActiveHighlight);
    } else if (isConstantSegment(messageSegment)) {
      return messageSegment.constant;
    }

    return 'failed to format message';
  });
};

export function proxyToRecord(proxyObj: object): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // 使用 Reflect.ownKeys 获取 Proxy 对象的所有键
  for (const key of Reflect.ownKeys(proxyObj)) {
    result[key as string] = (proxyObj as any)[key][0];
  }

  return result;
}

export interface LogMessageFormattingRule {
  when: LogMessageFormattingCondition;
  format: LogMessageFormattingInstruction[];
}

export interface Fields {
  [fieldName: string]: any;
}

export interface Highlights {
  [fieldName: string]: string[];
}

export interface CompiledLogMessageFormattingRule {
  requiredFields: string[];
  fulfillsCondition(fields: Fields): boolean;
  format(fields: Fields, highlights: Highlights): any[];
}

export interface CompiledLogMessageFormattingCondition {
  conditionFields: string[];
  fulfillsCondition(fields: Fields): boolean;
}

export interface CompiledLogMessageFormattingInstruction {
  formattingFields: string[];
  format(fields: Fields, highlights: Highlights): any[];
}

export type LogMessageFormattingInstruction =
  | LogMessageFormattingFieldReference
  | LogMessageFormattingFieldsPrefixReference
  | LogMessageFormattingConstant;

export interface LogMessageFormattingFieldReference {
  field: string;
}

export interface LogMessageFormattingFieldsPrefixReference {
  fieldsPrefix: string;
}

export interface LogMessageFormattingConstant {
  constant: string;
}

export type LogMessageFormattingCondition =
  | LogMessageFormattingAllCondition
  | LogMessageFormattingExistsCondition
  | LogMessageFormattingExistsPrefixCondition
  | LogMessageFormattingFieldValueCondition;

export interface LogMessageFormattingAllCondition {
  all: LogMessageFormattingCondition[];
}

export interface LogMessageFormattingExistsCondition {
  exists: string[];
}

export interface LogMessageFormattingExistsPrefixCondition {
  existsPrefix: string[];
}

export interface LogMessageFormattingFieldValueCondition {
  values: {
    [fieldName: string]: LogMessageFormattingFieldValueConditionValue;
  };
}

export type LogMessageFormattingFieldValueConditionValue = any;

const equalsOrContains = (operand: any, value: LogMessageFormattingFieldValueConditionValue): boolean => {
  if (Array.isArray(operand)) {
    return operand.includes(value);
  } else if (typeof operand === 'object' && operand !== null) {
    return Object.values(operand).includes(value);
  } else {
    return operand === value;
  }
};

const compileAllCondition = (
  condition: LogMessageFormattingCondition,
): CompiledLogMessageFormattingCondition | null => {
  if (!('all' in condition)) {
    return null;
  }

  const compiledConditions = condition.all.map(compileCondition);

  return {
    conditionFields: compiledConditions.flatMap(({ conditionFields }) => conditionFields),
    fulfillsCondition: (fields: Fields) =>
      compiledConditions.every(({ fulfillsCondition }) => fulfillsCondition(fields)),
  };
};

const compileExistsCondition = (condition: LogMessageFormattingCondition) =>
  'exists' in condition
    ? {
        conditionFields: condition.exists,
        fulfillsCondition: (fields: Fields) => condition.exists.every((fieldName) => fieldName in fields),
      }
    : null;

const compileExistsPrefixCondition = (condition: LogMessageFormattingCondition) =>
  'existsPrefix' in condition
    ? {
        conditionFields: condition.existsPrefix.map((prefix) => `${prefix}.*`),
        fulfillsCondition: (fields: Fields) =>
          condition.existsPrefix.every((fieldNamePrefix) =>
            Object.keys(fields).some((field) => field.startsWith(`${fieldNamePrefix}.`)),
          ),
      }
    : null;

const compileFieldValueCondition = (condition: LogMessageFormattingCondition) =>
  'values' in condition
    ? {
        conditionFields: Object.keys(condition.values),
        fulfillsCondition: (fields: Fields) =>
          Object.entries(condition.values).every(([fieldName, expectedValue]) =>
            equalsOrContains(fields[fieldName] ?? [], expectedValue),
          ),
      }
    : null;

const compileFieldReferenceFormattingInstruction = (
  formattingInstruction: LogMessageFormattingInstruction,
): CompiledLogMessageFormattingInstruction | null =>
  'field' in formattingInstruction
    ? {
        formattingFields: [formattingInstruction.field],
        format: (fields, highlights) => {
          const value = fields[formattingInstruction.field] ?? [];
          const highlightedValues = highlights[formattingInstruction.field] ?? [];
          return [
            {
              field: formattingInstruction.field,
              value,
              highlights: highlightedValues,
            },
          ];
        },
      }
    : null;

const compileFieldsPrefixReferenceFormattingInstruction = (
  formattingInstruction: LogMessageFormattingInstruction,
): CompiledLogMessageFormattingInstruction | null =>
  'fieldsPrefix' in formattingInstruction
    ? {
        formattingFields: [`${formattingInstruction.fieldsPrefix}.*`],
        format: (fields, highlights) => {
          const matchingFields = Object.keys(fields).filter((field) =>
            field.startsWith(`${formattingInstruction.fieldsPrefix}.`),
          );
          return matchingFields.flatMap((field) => {
            const value = fields[field] ?? [];
            const highlightedValues = highlights[field] ?? [];
            return [
              {
                field,
                value,
                highlights: highlightedValues,
              },
            ];
          });
        },
      }
    : null;

const compileConstantFormattingInstruction = (
  formattingInstruction: LogMessageFormattingInstruction,
): CompiledLogMessageFormattingInstruction | null =>
  'constant' in formattingInstruction
    ? {
        formattingFields: [] as string[],
        format: () => [
          {
            constant: formattingInstruction.constant,
          },
        ],
      }
    : null;

const falseCondition: CompiledLogMessageFormattingCondition = {
  conditionFields: [] as string[],
  fulfillsCondition: () => false,
};

const compileCondition = (condition: LogMessageFormattingCondition): CompiledLogMessageFormattingCondition =>
  [compileAllCondition, compileExistsCondition, compileExistsPrefixCondition, compileFieldValueCondition].reduce(
    (compiledCondition, compile) => compile(condition) || compiledCondition,
    falseCondition,
  );

const catchAllFormattingInstruction: CompiledLogMessageFormattingInstruction = {
  formattingFields: [],
  format: () => [
    {
      constant: 'invalid format',
    },
  ],
};

const compileFormattingInstruction = (
  formattingInstruction: LogMessageFormattingInstruction,
): CompiledLogMessageFormattingInstruction =>
  [
    compileFieldReferenceFormattingInstruction,
    compileFieldsPrefixReferenceFormattingInstruction,
    compileConstantFormattingInstruction,
  ].reduce(
    (compiledFormattingInstruction, compile) => compile(formattingInstruction) || compiledFormattingInstruction,
    catchAllFormattingInstruction,
  );

const compileFormattingInstructions = (formattingInstructions: any) =>
  formattingInstructions.reduce(
    (combinedFormattingInstructions, formattingInstruction) => {
      const compiledFormattingInstruction = compileFormattingInstruction(formattingInstruction);

      return {
        formattingFields: [
          ...combinedFormattingInstructions.formattingFields,
          ...compiledFormattingInstruction.formattingFields,
        ],
        format: (fields, highlights) => [
          ...combinedFormattingInstructions.format(fields, highlights),
          ...compiledFormattingInstruction.format(fields, highlights),
        ],
      };
    },
    {
      formattingFields: [],
      format: () => [],
    },
  );

const compileRule = (rule: LogMessageFormattingRule): CompiledLogMessageFormattingRule => {
  const { conditionFields, fulfillsCondition } = compileCondition(rule.when);
  const { formattingFields, format } = compileFormattingInstructions(rule.format);

  return {
    requiredFields: [...conditionFields, ...formattingFields],
    fulfillsCondition,
    format,
  };
};

export function compileFormattingRules(rules: LogMessageFormattingRule[]): CompiledLogMessageFormattingRule {
  const compiledRules = rules.map(compileRule);

  return {
    requiredFields: Array.from(
      new Set(
        compiledRules.reduce(
          (combinedRequiredFields, { requiredFields }) => [...combinedRequiredFields, ...requiredFields],
          [] as string[],
        ),
      ),
    ),
    format(fields, highlights): any[] {
      for (const compiledRule of compiledRules) {
        if (compiledRule.fulfillsCondition(fields)) {
          return compiledRule.format(fields, highlights);
        }
      }

      return [];
    },
    fulfillsCondition() {
      return true;
    },
  };
}

export function isDataViewFieldSubtypeMulti(field) {
  const subTypeNested = field?.subType;
  return !!subTypeNested?.multi?.parent;
}

/**
 * Returns subtype data for multi field
 * @public
 * @param field field to get subtype data from
 */

export function getFieldSubtypeMulti(field) {
  return isDataViewFieldSubtypeMulti(field) ? field.subType : undefined;
}

// 过来衍生字段
export const getFieldsToShow = (fields: string[], indexPatternFields: any, showMultiFields: boolean) => {
  const childParentFieldsMap = {} as Record<string, string>;
  const mapping = (name: string) => indexPatternFields.find((f) => f.name === name);
  fields.forEach((key) => {
    const mapped = mapping(key);
    const subTypeMulti = mapped && getFieldSubtypeMulti(mapped);
    if (mapped && subTypeMulti?.multi?.parent) {
      childParentFieldsMap[mapped.name] = subTypeMulti.multi.parent;
    }
  });
  return fields.filter((key: string) => {
    const fieldMapping = mapping(key);
    const subTypeMulti = fieldMapping && getFieldSubtypeMulti(fieldMapping);
    const isMultiField = !!subTypeMulti?.multi;
    if (!isMultiField) {
      return true;
    }

    const parent = childParentFieldsMap[key];
    return showMultiFields || (parent && !fields.includes(parent));
  });
};

// 日志查询高亮，替换变量逻辑
export function getHighlightHtml(fieldValue: string | object, highlights: string[] | undefined | null) {
  let highlightHtml = typeof fieldValue === 'object' ? JSON.stringify(fieldValue) : fieldValue;

  _.each(highlights, function (highlight) {
    // 带高亮变量转义
    const escapedHighlight = _.escape(highlight);

    // 将变量剔除
    const untaggedHighlight = escapedHighlight.split(highlightTags.pre).join('').split(highlightTags.post).join('');
    // 变量替换成指定标签
    const taggedHighlight = escapedHighlight
      .split(highlightTags.pre)
      .join(htmlTags.pre)
      .split(highlightTags.post)
      .join(htmlTags.post);

    // 替换掉原始值中高亮部分并换成指定标签
    highlightHtml = highlightHtml.split(untaggedHighlight).join(taggedHighlight);
  });

  return highlightHtml;
}

// 更新字段筛选状态
export const updateFieldStatus = (historyRecord, data, type) => {
  const record = _.cloneDeep(historyRecord);
  let matchIndex;
  if (data.meta.type === 'custom') {
    matchIndex = record.findIndex(
      (item) =>
        item.meta.type === 'custom' && JSON.stringify(item.query, null, 2) === JSON.stringify(data.query, null, 2),
    );
  } else {
    matchIndex = record.findIndex(
      (item) =>
        item.meta.type !== 'custom' &&
        `${item.meta.negate}-${item.meta.field.name}-${item.meta.type}-${JSON.stringify(item.meta.params ?? {})}` ===
          `${data.meta.negate}-${data.meta.field.name}-${data.meta.type}-${JSON.stringify(data.meta.params ?? {})}`,
    );
  }

  record[matchIndex] = { ...data, meta: { ...data.meta, [type]: !data.meta[type] } };
  return record;
};

export function sortIpAddresses(ipAddresses) {
  return ipAddresses.sort((a, b) => {
    // 将IP地址转换为数字数组
    const aOctets = a.label.split('.').map(Number);
    const bOctets = b.label.split('.').map(Number);

    // 依次比较每个八位组
    for (let i = 0; i < 4; i++) {
      if (aOctets[i] !== bOctets[i]) {
        return aOctets[i] - bOctets[i];
      }
    }

    return 0; // IP相同
  });
}
