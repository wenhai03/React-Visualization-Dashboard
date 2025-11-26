import _ from 'lodash';
import moment from 'moment';
import { parseRange } from '@/components/TimeRangePicker';
import { fromKueryExpression, toElasticsearchQuery } from '@/components/SearchBar/es-query';
import numeral from '@elastic/numeral';
import {
  AGENT_NAME,
  CHILD_ID,
  ERROR_ID,
  EVENT_OUTCOME,
  FAAS_COLDSTART,
  PARENT_ID,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_ACTION,
  SPAN_COMPOSITE_COMPRESSION_STRATEGY,
  SPAN_COMPOSITE_COUNT,
  SPAN_COMPOSITE_SUM,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_LINKS,
  SPAN_NAME,
  SPAN_SUBTYPE,
  SPAN_SYNC,
  SPAN_TYPE,
  TIMESTAMP,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_RESULT,
  TRANSACTION_TYPE,
  TRANSACTION_ROOT,
  METRICSET_NAME,
  METRICSET_INTERVAL,
  TRANSACTION_DURATION_HISTOGRAM,
  TRANSACTION_DURATION_SUMMARY,
  TRANSACTION_SAMPLED,
} from './apm';

export enum ApmDocumentType {
  TransactionMetric = 'transactionMetric',
  ServiceTransactionMetric = 'serviceTransactionMetric',
  TransactionEvent = 'transactionEvent',
  ServiceDestinationMetric = 'serviceDestinationMetric',
  ServiceSummaryMetric = 'serviceSummaryMetric',
  ErrorEvent = 'error',
}

export function getDurationFieldForTransactions(
  typeOrSearchAgggregatedTransactions:
    | ApmDocumentType.ServiceTransactionMetric
    | ApmDocumentType.TransactionMetric
    | ApmDocumentType.TransactionEvent
    | boolean,
  useDurationSummaryField?: boolean,
) {
  let type: ApmDocumentType;

  if (typeOrSearchAgggregatedTransactions === true) {
    type = ApmDocumentType.TransactionMetric;
  } else if (typeOrSearchAgggregatedTransactions === false) {
    type = ApmDocumentType.TransactionEvent;
  } else {
    type = typeOrSearchAgggregatedTransactions;
  }

  if (type === ApmDocumentType.ServiceTransactionMetric || type === ApmDocumentType.TransactionMetric) {
    if (useDurationSummaryField) {
      return TRANSACTION_DURATION_SUMMARY;
    }
    return TRANSACTION_DURATION_HISTOGRAM;
  }

  return TRANSACTION_DURATION;
}

export function convertKueryToEsQuery(kuery: string) {
  const ast = fromKueryExpression(kuery);
  return toElasticsearchQuery(ast);
}

function isUndefinedOrNull(value: any): value is undefined | null {
  return value === undefined || value === null;
}

interface TermQueryOpts {
  queryEmptyString: boolean;
}

export function termQuery<T extends string>(
  field: T,
  value: string | boolean | number | undefined | null,
  opts: TermQueryOpts = { queryEmptyString: true },
) {
  if (isUndefinedOrNull(value) || (!opts.queryEmptyString && value === '')) {
    return [];
  }

  return [{ term: { [field]: value } }];
}

export function getDocumentTypeFilterForTransactions(searchAggregatedTransactions: boolean) {
  return searchAggregatedTransactions
    ? [
        {
          bool: {
            filter: [{ exists: { field: TRANSACTION_DURATION_HISTOGRAM } }],
            must_not: [
              { terms: { [METRICSET_INTERVAL]: ['10m', '60m'] } },
              { term: { [METRICSET_NAME]: 'service_transaction' } },
            ],
          },
        },
      ]
    : [];
}

export function isRootTransaction(searchAggregatedTransactions: boolean) {
  return searchAggregatedTransactions
    ? {
        term: {
          [TRANSACTION_ROOT]: true,
        },
      }
    : {
        bool: {
          must_not: {
            exists: { field: PARENT_ID },
          },
        },
      };
}

export function environmentQuery(environment: string | undefined) {
  if (!environment || environment === 'ENVIRONMENT_ALL') {
    return [];
  }

  if (environment === 'ENVIRONMENT_NOT_DEFINED') {
    return [{ bool: { must_not: { exists: { field: SERVICE_ENVIRONMENT } } } }];
  }

  return [{ term: { [SERVICE_ENVIRONMENT]: environment } }];
}

export function kqlQuery(kql?: string) {
  if (!kql) {
    return [];
  }

  const ast = fromKueryExpression(kql);
  return [toElasticsearchQuery(ast)];
}

export function rangeQuery(start?: number, end?: number, field = '@timestamp') {
  return [
    {
      range: {
        [field]: {
          gte: start,
          lte: end,
          format: 'epoch_millis',
        },
      },
    },
  ];
}

// 动态生成随机颜色
export function generateRandomColor() {
  const hue = Math.floor(Math.random() * 360); // 随机色相
  const saturation = Math.floor(Math.random() * 50) + 50; // 饱和度在 50%-100% 之间
  const lightness = Math.floor(Math.random() * 20) + 50; // 亮度在 50%-70% 之间
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function calculateThroughputWithRange({ start, end, value }: { start: number; end: number; value: number }) {
  const durationAsMinutes = (end - start) / 1000 / 60;
  return value / durationAsMinutes;
}

export function calculateImpactBuilder(sums?: Array<number | null>) {
  const sumValues = (sums ?? []).filter((value) => value !== null) as number[];

  const max = Math.max(...sumValues);
  const min = Math.min(...sumValues);

  return (sum: number) => (sum !== null && sum !== undefined ? ((sum - min) / (max - min)) * 100 || 0 : 0);
}

// 数据重组
export const handleTracesList = (res, start, end, data_id, filter, environment, bgid) => {
  const calculateImpact = calculateImpactBuilder(res.map(({ sum }) => sum.value));
  const timeRange = conversionTime(start, end);
  const items = res.map((bucket) => {
    return {
      key: bucket.key,
      serviceName: bucket.key[SERVICE_NAME],
      transactionName: bucket.key[TRANSACTION_NAME],
      averageResponseTime: bucket.avg.value,
      transactionsPerMinute: calculateThroughputWithRange({
        ...timeRange,
        value: bucket.doc_count ?? 0,
      }),
      transactionType: bucket.transaction_type.top[0].metrics[TRANSACTION_TYPE],
      impact: calculateImpact(bucket.sum.value ?? 0),
      agentName: bucket.transaction_type.top[0].metrics[AGENT_NAME],
      start,
      end,
      data_id,
      filter,
      environment,
      bgid,
    };
  });

  return _.sortBy(items, 'impact').reverse();
};

export function normalizeTraceItemsQueryRequestBody(params: any) {
  const { start, end, traceId, maxTraceItems, limit, index } = params;
  const header = {
    search_type: 'query_then_fetch',
    ignore_unavailable: true,
    index: index,
  };
  const body: any = {
    // track_total_hits: Math.max(10000, maxTraceItems + 1),
    size: limit,
    _source: [
      TIMESTAMP,
      TRACE_ID,
      PARENT_ID,
      SERVICE_NAME,
      SERVICE_ENVIRONMENT,
      AGENT_NAME,
      EVENT_OUTCOME,
      PROCESSOR_EVENT,
      TRANSACTION_DURATION,
      TRANSACTION_ID,
      TRANSACTION_NAME,
      TRANSACTION_TYPE,
      TRANSACTION_RESULT,
      FAAS_COLDSTART,
      SPAN_ID,
      SPAN_TYPE,
      SPAN_SUBTYPE,
      SPAN_ACTION,
      SPAN_NAME,
      SPAN_DURATION,
      SPAN_LINKS,
      SPAN_COMPOSITE_COUNT,
      SPAN_COMPOSITE_COMPRESSION_STRATEGY,
      SPAN_COMPOSITE_SUM,
      SPAN_SYNC,
      CHILD_ID,
    ],
    query: {
      bool: {
        filter: [{ term: { [TRACE_ID]: traceId } }, ...rangeQuery(start, end)],
        should: {
          exists: { field: PARENT_ID },
        },
      },
    },
    sort: [
      { _score: { order: 'asc' as const } },
      { [TRANSACTION_DURATION]: { order: 'desc' as const } },
      { [SPAN_DURATION]: { order: 'desc' as const } },
    ],
  };
  if (params.filter) {
    body.query.bool.filter.push(params.filter);
  }

  return `${JSON.stringify(header)}\n${JSON.stringify(body)}\n`;
}

export function getCriticalPath(waterfall) {
  const segments: any[] = [];

  function scan({ item, start, end }: { item: any; start: number; end: number }): void {
    segments.push({
      self: false,
      duration: end - start,
      item,
      offset: start,
    });
    const directChildren = waterfall.childrenByParentId[item.id];

    if (directChildren && directChildren.length > 0) {
      // We iterate over all the item's direct children. The one that
      // ends last is the first item in the array.
      const orderedChildren = directChildren.concat().sort((a, b) => {
        const endTimeA = a.offset + a.skew + a.duration;
        const endTimeB = b.offset + b.skew + b.duration;
        if (endTimeA === endTimeB) {
          return 0;
        }
        return endTimeB > endTimeA ? 1 : -1;
      });

      // For each point in time, determine what child is on the critical path.
      // We start scanning at the end. Once we've decided what the child on the
      // critical path is, scan its children, from the start time of that span
      // until the end. The next scan time is the start time of the child that was
      // on the critical path.
      let scanTime = end;

      orderedChildren.forEach((child) => {
        const normalizedChildStart = Math.max(child.offset + child.skew, start);
        const childEnd = child.offset + child.skew + child.duration;

        // if a span ends before the current scan time, use the current
        // scan time as when the child ended. We don't want to scan further
        // than the scan time. This prevents overlap in the critical path.
        const normalizedChildEnd = Math.min(childEnd, scanTime);

        const isOnCriticalPath = !(
          // A span/tx is NOT on the critical path if:
          // - The start time is equal to or greater than the current scan time.
          // Otherwise, spans that started at the same time will all contribute to
          // the critical path, but we only want one to contribute.
          // - The span/tx ends before the start of the initial scan period.
          // - The span ends _after_ the current scan time.

          (normalizedChildStart >= scanTime || normalizedChildEnd < start || childEnd > scanTime)
        );

        if (!isOnCriticalPath) {
          return;
        }

        if (normalizedChildEnd < scanTime - 1000) {
          // This span is on the critical path, but it ended before the scan time.
          // This means that there is a gap, so we add a segment to the critical path
          // for the _parent_. There's a slight offset because we don't want really small
          // segments that can be reasonably attributed to clock skew.
          segments.push({
            item,
            duration: scanTime - normalizedChildEnd,
            offset: normalizedChildEnd,
            self: true,
          });
        }

        // scan this child for the period we're considering it to be on the critical path
        scan({
          start: normalizedChildStart,
          end: childEnd,
          item: child,
        });

        // set the scan time to the start of the span, and scan the next child
        scanTime = normalizedChildStart;
      });

      // there's an unattributed gap at the start, so add a segment for the parent as well
      if (scanTime > start) {
        segments.push({
          item,
          offset: start,
          duration: scanTime - start,
          self: true,
        });
      }
    } else {
      // for the entire scan period, add this item to the critical path
      segments.push({
        item,
        offset: start,
        duration: end - start,
        self: true,
      });
    }
  }

  if (waterfall.entryWaterfallTransaction) {
    const start = waterfall.entryWaterfallTransaction.skew + waterfall.entryWaterfallTransaction.offset;
    scan({
      item: waterfall.entryWaterfallTransaction,
      start,
      end: start + waterfall.entryWaterfallTransaction.duration,
    });
  }

  return { segments };
}

export enum ProcessorEvent {
  transaction = 'transaction',
  error = 'error',
  metric = 'metric',
  span = 'span',
}

export function normalizeMetadataQueryRequestBody(params: any) {
  const { processorEvent, id, start, end, index } = params;
  const filter: any[] = [{ terms: { [PROCESSOR_EVENT]: [processorEvent] } }, ...rangeQuery(start, end)];

  switch (processorEvent) {
    case ProcessorEvent.error:
      filter.push({
        term: { [ERROR_ID]: id },
      });
      break;

    case ProcessorEvent.transaction:
      filter.push({
        term: {
          [TRANSACTION_ID]: id,
        },
      });
      break;

    case ProcessorEvent.span:
      filter.push({
        term: { [SPAN_ID]: id },
      });
      break;
  }
  const header = {
    search_type: 'query_then_fetch',
    ignore_unavailable: true,
    index: index,
  };
  const body = {
    track_total_hits: false,
    query: {
      bool: { filter },
    },
    size: 1,
    _source: false,
    fields: [{ field: '*', include_unmapped: true }],
  };

  return `${JSON.stringify(header)}\n${JSON.stringify(body)}\n`;
}

const EXCLUDED_FIELDS = ['error.exception.stacktrace', 'span.stacktrace'];

export const getSectionsFromFields = (fields: Record<string, any>) => {
  const rows = Object.keys(fields)
    .filter((field) => !EXCLUDED_FIELDS.some((excluded) => field.startsWith(excluded)))
    .sort()
    .map((field) => {
      return {
        section: field.split('.')[0],
        field,
        value: fields[field],
      };
    });

  const sections = Object.values(_.groupBy(rows, 'section')).map((rowsForSection) => {
    const first = rowsForSection[0];

    const section = {
      key: first.section,
      label: first.section.toLowerCase(),
      properties: rowsForSection.map((row) => ({
        field: row.field,
        value: row.value,
      })),
    };

    return section;
  });

  const [labelSections, otherSections] = _.partition(
    sections,
    (section) => section.key === 'labels' || section.key === 'numeric_labels',
  );

  return [...labelSections, ...otherSections];
};

function getErrorCountByParentId(errorDocs: any[]) {
  return errorDocs.reduce<Record<string, number>>((acc, doc) => {
    const parentId = doc.parent?.id;

    if (!parentId) {
      return acc;
    }

    acc[parentId] = (acc[parentId] ?? 0) + 1;

    return acc;
  }, {});
}

function getRootWaterfallTransaction(childrenByParentId: Record<string, any[]>) {
  const item = _.first(childrenByParentId.root);
  if (item && item.docType === 'transaction') {
    return item;
  }
}

export enum WaterfallLegendType {
  ServiceName = 'serviceName',
  SpanType = 'spanType',
}

function getLegendValues(transactionOrSpan: any) {
  return {
    [WaterfallLegendType.ServiceName]: transactionOrSpan.service.name,
    [WaterfallLegendType.SpanType]:
      transactionOrSpan.processor.event === ProcessorEvent.span
        ? transactionOrSpan.span.subtype || transactionOrSpan.span.type
        : '',
  };
}

function getSpanItem(span: any, linkedChildrenCount: number = 0) {
  return {
    docType: 'span',
    doc: span,
    id: span.span.id,
    parentId: span.parent?.id,
    duration: span.span.duration.us,
    offset: 0,
    skew: 0,
    legendValues: getLegendValues(span),
    color: '',
    spanLinksCount: {
      linkedParents: span.span.links?.length ?? 0,
      linkedChildren: linkedChildrenCount,
    },
  };
}

function getTransactionItem(transaction: any, linkedChildrenCount: number = 0) {
  return {
    docType: 'transaction',
    doc: transaction,
    id: transaction.transaction.id,
    parentId: transaction.parent?.id,
    duration: transaction.transaction.duration.us,
    offset: 0,
    skew: 0,
    legendValues: getLegendValues(transaction),
    color: '',
    spanLinksCount: {
      linkedParents: transaction.span?.links?.length ?? 0,
      linkedChildren: linkedChildrenCount,
    },
  };
}

const getWaterfallItems = (items: any, spanLinksCountById: any) => {
  return items.map((item) => {
    const docType = item.processor.event;
    switch (docType) {
      case 'span': {
        const span = item;
        return getSpanItem(span, spanLinksCountById[span.span.id]);
      }
      case 'transaction':
        const transaction = item;
        return getTransactionItem(transaction, spanLinksCountById[transaction.transaction.id]);
    }
  });
};

const getChildrenGroupedByParentId = (waterfallItems: any[]) =>
  _.groupBy(waterfallItems, (item) => (item.parentId ? item.parentId : 'root'));

const getEntryWaterfallTransaction = (entryTransactionId: string, waterfallItems: any[]): any | undefined =>
  waterfallItems.find((item) => item.docType === 'transaction' && item.id === entryTransactionId);

export function getClockSkew(item: any, parentItem?: any) {
  if (!parentItem) {
    return 0;
  }
  switch (item.docType) {
    // don't calculate skew for spans and errors. Just use parent's skew
    case 'error':
    case 'span':
      return parentItem.skew;
    // transaction is the inital entry in a service. Calculate skew for this, and it will be propogated to all child spans
    case 'transaction': {
      const parentStart = parentItem.doc.timestamp.us + parentItem.skew;

      // determine if child starts before the parent
      const offsetStart = parentStart - item.doc.timestamp.us;
      if (offsetStart > 0) {
        const latency = Math.max(parentItem.duration - item.duration, 0) / 2;
        return offsetStart + latency;
      }

      // child transaction starts after parent thus no adjustment is needed
      return 0;
    }
  }
}

export function getOrderedWaterfallItems(childrenByParentId: Record<string, any[]>, entryWaterfallTransaction?: any) {
  if (!entryWaterfallTransaction) {
    return [];
  }
  const entryTimestamp = entryWaterfallTransaction.doc.timestamp.us;
  const visitedWaterfallItemSet = new Set();

  function getSortedChildren(item: any, parentItem?: any) {
    if (visitedWaterfallItemSet.has(item)) {
      return [];
    }
    visitedWaterfallItemSet.add(item);

    const children = _.sortBy(childrenByParentId[item.id] || [], 'doc.timestamp.us');

    item.parent = parentItem;
    // get offset from the beginning of trace
    item.offset = item.doc.timestamp.us - entryTimestamp;
    // move the item to the right if it starts before its parent
    item.skew = getClockSkew(item, parentItem);

    const deepChildren = _.flatten(children.map((child) => getSortedChildren(child, item)));
    return [item, ...deepChildren];
  }

  return getSortedChildren(entryWaterfallTransaction);
}

function reparentSpans(waterfallItems: any[]) {
  // find children that needs to be re-parented and map them to their correct parent id
  const childIdToParentIdMapping = Object.fromEntries(
    _.flatten(
      waterfallItems.map((waterfallItem) => {
        if (waterfallItem.docType === 'span') {
          const childIds = waterfallItem.doc.child?.id ?? [];
          return childIds.map((id) => [id, waterfallItem.id]);
        }
        return [];
      }),
    ),
  );

  // update parent id for children that needs it or return unchanged
  return waterfallItems.map((waterfallItem) => {
    const newParentId = childIdToParentIdMapping[waterfallItem.id];
    if (newParentId) {
      return {
        ...waterfallItem,
        parentId: newParentId,
      };
    }

    return waterfallItem;
  });
}

function getErrorItem(error: any, items: any[], entryWaterfallTransaction?: any) {
  const entryTimestamp = entryWaterfallTransaction?.doc.timestamp.us ?? 0;
  const parent = items.find((waterfallItem) => waterfallItem.id === error.parent?.id);

  const errorItem = {
    docType: 'error',
    doc: error,
    id: error.error?.id,
    parent,
    parentId: parent?.id,
    offset: error.timestamp?.us - entryTimestamp,
    skew: 0,
    color: '',
  };

  return {
    ...errorItem,
    skew: getClockSkew(errorItem, parent),
  };
}

function isInEntryTransaction(
  parentIdLookup: Map<string, string>,
  entryTransactionId: string,
  currentId: string,
): boolean {
  if (currentId === entryTransactionId) {
    return true;
  }
  const parentId = parentIdLookup.get(currentId);
  if (parentId) {
    return isInEntryTransaction(parentIdLookup, entryTransactionId, parentId);
  }
  return false;
}

function getWaterfallErrors(errorDocs: any[], items: any[], entryWaterfallTransaction?: any) {
  const errorItems = errorDocs.map((errorDoc) => getErrorItem(errorDoc, items, entryWaterfallTransaction));
  if (!entryWaterfallTransaction) {
    return errorItems;
  }
  const parentIdLookup = [...items, ...errorItems].reduce((map, { id, parentId }) => {
    map.set(id, parentId ?? 'root');
    return map;
  }, new Map<string, string>());
  return errorItems.filter((errorItem) =>
    isInEntryTransaction(parentIdLookup, entryWaterfallTransaction?.id, errorItem.id),
  );
}

function getLegends(waterfallItems: any[]) {
  const onlyBaseSpanItems = waterfallItems.filter((item) => item.docType === 'span' || item.docType === 'transaction');

  const legends = [WaterfallLegendType.ServiceName, WaterfallLegendType.SpanType].flatMap((legendType) => {
    const allLegendValues = _.uniq(onlyBaseSpanItems.map((item) => item.legendValues[legendType]));

    const palette = ['#1890ff', '#52c41a', '#fadb14', '#f5222d', '#fa8c16', '#8c8c8c', '#c41d7f'];

    const data = allLegendValues.map((value, index) => {
      const color = palette[index] ?? generateRandomColor();
      return {
        type: legendType,
        value,
        color: color,
      };
    });

    return data;
  });

  return legends;
}

const getWaterfallDuration = (waterfallItems: any[]) =>
  Math.max(...waterfallItems.map((item) => item.offset + item.skew + ('duration' in item ? item.duration : 0)), 0);

export function getWaterfall(apiResponse) {
  const { traceItems, entryTransaction } = apiResponse;
  if (_.isEmpty(traceItems.traceDocs) || !entryTransaction) {
    return {
      duration: 0,
      items: [],
      legends: [],
      errorItems: [],
      childrenByParentId: {},
      getErrorCount: () => 0,
      exceedsMax: false,
      totalErrorsCount: 0,
      traceItemCount: 0,
      maxTraceItems: 0,
      encryptedTraceId: '',
    };
  }

  const errorCountByParentId = getErrorCountByParentId(traceItems.errorDocs);

  const waterfallItems = getWaterfallItems(traceItems.traceDocs, traceItems.spanLinksCountById);

  const childrenByParentId = getChildrenGroupedByParentId(reparentSpans(waterfallItems));

  const entryWaterfallTransaction = getEntryWaterfallTransaction(entryTransaction.transactionId, waterfallItems);
  const items = getOrderedWaterfallItems(childrenByParentId, entryWaterfallTransaction);
  const errorItems = getWaterfallErrors(traceItems.errorDocs, items, entryWaterfallTransaction);

  const rootWaterfallTransaction = getRootWaterfallTransaction(childrenByParentId);

  const duration = getWaterfallDuration(items);
  const legends = getLegends(items);

  return {
    entryWaterfallTransaction,
    rootWaterfallTransaction,
    entryTransaction,
    duration,
    items,
    legends,
    errorItems,
    childrenByParentId: getChildrenGroupedByParentId(items),
    getErrorCount: (parentId: string) => errorCountByParentId[parentId] ?? 0,
    exceedsMax: traceItems.exceedsMax,
    totalErrorsCount: traceItems.errorDocs.length,
    traceItemCount: traceItems.traceItemCount,
    maxTraceItems: traceItems.maxTraceItems,
    encryptedTraceId: traceItems.encryptedTraceId,
    rootLinks: traceItems.rootLinks,
  };
}

export function conversionTime(startTime, endTime) {
  const timeRange = parseRange({ start: startTime, end: endTime });
  const start = moment(timeRange.start).valueOf();
  const end = moment(timeRange.end).valueOf();
  return { start, end };
}

export function calculationTime(time, duration) {
  const framePaddingMs = 1000 * 60 * 60 * 24; // 24 hours
  const start = time - framePaddingMs;
  const end = Math.ceil(start + duration / 1000) + framePaddingMs;
  return { start, end };
}

function getLambdaFunctionNameFromARN(arn: string) {
  return arn.split(':')[6] || '';
}

export const OPEN_TELEMETRY_AGENT_NAMES = [
  'otlp',
  'opentelemetry/cpp',
  'opentelemetry/dotnet',
  'opentelemetry/erlang',
  'opentelemetry/go',
  'opentelemetry/java',
  'opentelemetry/nodejs',
  'opentelemetry/php',
  'opentelemetry/python',
  'opentelemetry/ruby',
  'opentelemetry/rust',
  'opentelemetry/swift',
  'opentelemetry/android',
  'opentelemetry/webjs',
];

export function isOpenTelemetryAgentName(agentName: string) {
  return OPEN_TELEMETRY_AGENT_NAMES.includes(agentName);
}

export const handleMetaDetail = (response) => {
  if (response.hits.total.value === 0) {
    return {
      service: undefined,
      container: undefined,
      cloud: undefined,
    };
  }

  const { service, agent, host, kubernetes, container, cloud } = response.hits.hits[0]._source;

  const serviceMetadataDetails = {
    versions: response.aggregations?.serviceVersions.buckets.map((bucket) => bucket.key as string),
    runtime: service.runtime,
    framework: service.framework?.name,
    agent,
  };

  const totalNumberInstances = response.aggregations?.totalNumberInstances.value;

  const containerDetails =
    host || container || totalNumberInstances || kubernetes
      ? {
          os: host?.os?.platform,
          type: !!kubernetes ? 'Kubernetes' : 'Docker',
          isContainerized: !!container?.id,
          totalNumberInstances,
        }
      : undefined;

  const serverlessDetails =
    !!response.aggregations?.faasTriggerTypes?.buckets.length && cloud
      ? {
          type: cloud.service?.name,
          functionNames: response.aggregations?.faasFunctionNames.buckets
            .map((bucket) => getLambdaFunctionNameFromARN(bucket.key as string))
            .filter((name) => name),
          faasTriggerTypes: response.aggregations?.faasTriggerTypes.buckets.map((bucket) => bucket.key as string),
        }
      : undefined;

  const cloudDetails = cloud
    ? {
        provider: cloud.provider,
        projectName: cloud.project?.name,
        serviceName: cloud.service?.name,
        availabilityZones: response.aggregations?.availabilityZones.buckets.map((bucket) => bucket.key as string),
        regions: response.aggregations?.regions.buckets.map((bucket) => bucket.key as string),
        machineTypes: response.aggregations?.machineTypes.buckets.map((bucket) => bucket.key as string),
      }
    : undefined;

  return {
    service: serviceMetadataDetails,
    container: containerDetails,
    serverless: serverlessDetails,
    cloud: cloudDetails,
  };
};

export enum ServerlessType {
  AWS_LAMBDA = 'aws.lambda',
  AZURE_FUNCTIONS = 'azure.functions',
}

export function getServerlessTypeFromCloudData(
  cloudProvider?: string,
  cloudServiceName?: string,
): ServerlessType | undefined {
  if (cloudProvider?.toLowerCase() === 'aws' && cloudServiceName?.toLowerCase() === 'lambda') {
    return ServerlessType.AWS_LAMBDA;
  }

  if (cloudProvider?.toLowerCase() === 'azure' && cloudServiceName?.toLowerCase() === 'functions') {
    return ServerlessType.AZURE_FUNCTIONS;
  }
}

export const handleMetaIcons = (response) => {
  if (response.hits.total.value === 0) {
    return {
      agentName: undefined,
      containerType: undefined,
      cloudProvider: undefined,
      serverlessType: undefined,
    };
  }

  const { kubernetes, cloud, container, agent } = response.hits.hits[0]._source;

  let containerType: string | undefined;
  if (!!kubernetes) {
    containerType = 'Kubernetes';
  } else if (!!container) {
    containerType = 'Docker';
  }

  const serverlessType = getServerlessTypeFromCloudData(cloud?.provider, cloud?.service?.name);

  return {
    agentName: agent?.name,
    containerType,
    serverlessType,
    cloudProvider: cloud?.provider,
  };
};

export type JavaAgentName = 'java' | 'opentelemetry/java';
export const JAVA_AGENT_NAMES: JavaAgentName[] = ['java', 'opentelemetry/java'];
export type RumAgentName = 'js-base' | 'rum-js' | 'opentelemetry/webjs';
export const RUM_AGENT_NAMES: RumAgentName[] = ['js-base', 'rum-js', 'opentelemetry/webjs'];

export function isJavaAgentName(agentName?: string): agentName is JavaAgentName {
  return JAVA_AGENT_NAMES.includes(agentName! as JavaAgentName);
}

export function isRumAgentName(agentName?: string): agentName is RumAgentName {
  return RUM_AGENT_NAMES.includes(agentName! as RumAgentName);
}

export function isIosAgentName(agentName?: string) {
  return agentName?.toLowerCase() === 'ios/swift';
}

export function isAndroidAgentName(agentName?: string) {
  const lowercased = agentName && agentName.toLowerCase();
  return lowercased === 'android/java';
}

export function getAgentIconKey(agentName: string) {
  // Ignore case
  const lowercasedAgentName = agentName.toLowerCase();

  // RUM agent names
  if (isRumAgentName(lowercasedAgentName)) {
    return 'rum';
  }

  // Java  agent names
  if (isJavaAgentName(lowercasedAgentName)) {
    return 'java';
  }

  if (isIosAgentName(lowercasedAgentName)) {
    return 'ios';
  }

  if (isAndroidAgentName(lowercasedAgentName)) {
    return 'android';
  }

  // Remove "opentelemetry/" prefix
  const agentNameWithoutPrefix = lowercasedAgentName.replace(/^opentelemetry\//, '');

  if (
    [
      'cpp',
      'dotnet',
      'erlang',
      'go',
      'ios',
      'java',
      'lambda',
      'nodejs',
      'ocaml',
      'opentelemetry',
      'php',
      'python',
      'ruby',
      'rum',
      'rust',
      'android',
    ].includes(agentNameWithoutPrefix)
  ) {
    return agentNameWithoutPrefix;
  }

  // OpenTelemetry-only agents
  if (OPEN_TELEMETRY_AGENT_NAMES.includes(lowercasedAgentName)) {
    return 'opentelemetry';
  }
}

export function asDecimal(value?: number | null) {
  if (!_.isFinite(value)) {
    return 'N/A';
  }
  return numeral(value).format('0,0.0');
}

export function asInteger(value?: number | null) {
  if (!_.isFinite(value)) {
    return 'N/A';
  }
  return numeral(value).format('0,0');
}

export function asDecimalOrInteger(value: number, threshold = 10) {
  // exact 0 or above threshold should not have decimal
  if (value === 0 || value >= threshold) {
    return asInteger(value);
  }
  return asDecimal(value);
}

function getUnitLabelAndConvertedValue(unitKey: any, value: number, threshold: number = 10) {
  const ms = value / 1000;

  switch (unitKey) {
    case 'hours': {
      return {
        unitLabel: 'h',
        convertedValue: asDecimalOrInteger(moment.duration(ms).asHours(), threshold),
      };
    }
    case 'minutes': {
      return {
        unitLabel: 'min',
        convertedValue: asDecimalOrInteger(moment.duration(ms).asMinutes(), threshold),
      };
    }
    case 'seconds': {
      return {
        unitLabel: 's',
        convertedValue: asDecimalOrInteger(moment.duration(ms).asSeconds(), threshold),
      };
    }
    case 'milliseconds': {
      return {
        unitLabel: 'ms',
        convertedValue: asDecimalOrInteger(moment.duration(ms).asMilliseconds(), threshold),
      };
    }
    case 'microseconds': {
      return {
        unitLabel: 'μs',
        convertedValue: asInteger(value),
      };
    }
  }
}

export function convertTo({
  unit,
  microseconds,
  defaultValue = 'N/A',
  threshold = 10,
}: {
  unit: any;
  microseconds: any;
  defaultValue?: string;
  threshold?: number;
}) {
  if (!isFinite(microseconds)) {
    return { value: defaultValue, formatted: defaultValue };
  }

  const { convertedValue, unitLabel } = getUnitLabelAndConvertedValue(unit, microseconds, threshold) as any;

  return {
    value: convertedValue,
    unit: unitLabel,
    formatted: `${convertedValue} ${unitLabel}`,
  };
}

export const toMicroseconds = (value: number, timeUnit: any) =>
  moment.duration(value, timeUnit).asMilliseconds() * 1000;

function getDurationUnitKey(max: number, threshold = 10) {
  if (max > toMicroseconds(threshold, 'hours')) {
    return 'hours';
  }
  if (max > toMicroseconds(threshold, 'minutes')) {
    return 'minutes';
  }
  if (max > toMicroseconds(threshold, 'seconds')) {
    return 'seconds';
  }
  if (max > toMicroseconds(1, 'milliseconds')) {
    return 'milliseconds';
  }
  return 'microseconds';
}

export const getDurationFormatter = _.memoize(
  (max: number, threshold: number = 10) => {
    const unit = getDurationUnitKey(max, threshold);
    return (value, { defaultValue }: any = {}) => {
      return convertTo({ unit, microseconds: value, defaultValue, threshold });
    };
  },
  (max, threshold) => `${max}_${threshold}`,
);

export function asDuration(value, { defaultValue = 'N/A' } = {}) {
  if (!_.isFinite(value)) {
    return defaultValue;
  }

  const formatter = getDurationFormatter(value);
  return formatter(value, { defaultValue }).formatted;
}

// 根据当前时间向前向后整合一段时间凑成5分钟
export function roundToNearestMinute({
  timestamp,
  diff = 0,
  direction = 'up',
}: {
  timestamp: string;
  diff?: number;
  direction?: 'up' | 'down';
}) {
  const date = new Date(timestamp);
  const fiveMinutes = 1000 * 60 * 5; // round to 5 min

  const ms = date.getTime() + diff;

  return new Date(
    direction === 'down' ? Math.floor(ms / fiveMinutes) * fiveMinutes : Math.ceil(ms / fiveMinutes) * fiveMinutes,
  ).toISOString();
}

// 前后加4天
export function getBufferedTimerange({
  start,
  end,
  bufferSize = 4,
}: {
  start: number;
  end: number;
  bufferSize?: number;
}) {
  return {
    startWithBuffer: moment(start).subtract(bufferSize, 'days').valueOf(),
    endWithBuffer: moment(end).add(bufferSize, 'days').valueOf(),
  };
}
