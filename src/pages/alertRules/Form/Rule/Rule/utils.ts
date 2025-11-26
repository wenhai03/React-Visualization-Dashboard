import { searchAlertTest } from '@/services/warning';
import moment from 'moment';

const SECONDS_REGEX = /^[1-9][0-9]*s$/;
const MINUTES_REGEX = /^[1-9][0-9]*m$/;
const HOURS_REGEX = /^[1-9][0-9]*h$/;
const DAYS_REGEX = /^[1-9][0-9]*d$/;

function isSeconds(duration: string) {
  return SECONDS_REGEX.test(duration);
}

function isMinutes(duration: string) {
  return MINUTES_REGEX.test(duration);
}

function isHours(duration: string) {
  return HOURS_REGEX.test(duration);
}

function isDays(duration: string) {
  return DAYS_REGEX.test(duration);
}

export function parseDuration(duration: string): number {
  const parsed = parseInt(duration, 10);
  if (isSeconds(duration)) {
    return parsed * 1000;
  } else if (isMinutes(duration)) {
    return parsed * 60 * 1000;
  } else if (isHours(duration)) {
    return parsed * 60 * 60 * 1000;
  } else if (isDays(duration)) {
    return parsed * 24 * 60 * 60 * 1000;
  }
  throw new Error(
    `Invalid duration "${duration}". Durations must be of the form {number}x. Example: 5s, 5m, 5h or 5d"`,
  );
}

export enum Comparator {
  GT = 'more than',
  GT_OR_EQ = 'more than or equals',
  LT = 'less than',
  LT_OR_EQ = 'less than or equals',
  EQ = 'equals',
  NOT_EQ = 'does not equal',
  MATCH = 'matches',
  NOT_MATCH = 'does not match',
  MATCH_PHRASE = 'matches phrase',
  NOT_MATCH_PHRASE = 'does not match phrase',
}

export const getCompatibleComparatorsForField = (fieldInfo) => {
  if (fieldInfo?.type === 'number') {
    return [
      { value: Comparator.GT, label: 'gt' },
      { value: Comparator.GT_OR_EQ, label: 'gt_or_eq' },
      { value: Comparator.LT, label: 'lt' },
      { value: Comparator.LT_OR_EQ, label: 'lt_or_eq' },
      { value: Comparator.EQ, label: 'eq' },
      { value: Comparator.NOT_EQ, label: 'not_eq' },
    ];
  } else if (fieldInfo?.aggregatable) {
    return [
      { value: Comparator.EQ, label: 'eq' },
      { value: Comparator.NOT_EQ, label: 'not_eq' },
    ];
  } else {
    return [
      { value: Comparator.MATCH, label: 'match' },
      { value: Comparator.NOT_MATCH, label: 'not_match' },
      { value: Comparator.MATCH_PHRASE, label: 'match_phrase' },
      {
        value: Comparator.NOT_MATCH_PHRASE,
        label: 'not_match_phrase',
      },
    ];
  }
};

export const isOptimizedGroupedSearchQueryResponse = (response: any): response is any => {
  const result = response.dat;
  return result && !result.hasOwnProperty('filtered_results');
};

export const processGroupedResults = (results: any) => {
  const getGroupName = (key) => Object.values(key).join(', ');

  if (isOptimizedGroupedSearchQueryResponse(results as any)) {
    return results.reduce((series, group) => {
      if (!group.histogramBuckets) return series;
      const groupName = getGroupName(group.key);
      const points = group.histogramBuckets.buckets.reduce((pointsAcc, bucket) => {
        const { key, doc_count: count } = bucket;
        return [...pointsAcc, { timestamp: key, value: count }];
      }, []);
      return [...series, { id: groupName, points }];
    }, []);
  } else {
    return results.reduce((series, group) => {
      if (!group.filtered_results.histogramBuckets) return series;
      const groupName = getGroupName(group.key);
      const points = group.filtered_results.histogramBuckets.buckets.reduce((pointsAcc, bucket) => {
        const { key, doc_count: count } = bucket;
        return [...pointsAcc, { timestamp: key, value: count }];
      }, []);
      return [...series, { id: groupName, points }];
    }, []);
  }
};

export const processIndexResults = (results, type) => {
  if (type === 'groupAgg') {
    if (!results.dat?.aggregations?.groupAgg?.buckets) return [];
    const points = results.dat.aggregations.groupAgg.buckets.reduce((pointsAcc, bucket) => {
      const { dateAgg, key, key_as_string } = bucket;
      const data = dateAgg.buckets.map((item) => ({
        time: moment(item.to).format('YYYY-MM-DD HH:mm:ss'),
        value: item.metricAgg?.value || item.doc_count,
        category: key_as_string || key,
      }));
      return [...pointsAcc, ...data];
    }, []);
    return [{ id: 'Log entries', points }];
  } else {
    if (!results.dat?.aggregations?.dateAgg?.buckets) return [];
    const points = results.dat.aggregations.dateAgg.buckets.reduce((pointsAcc, bucket) => {
      const { to, doc_count, metricAgg } = bucket;
      return [
        ...pointsAcc,
        {
          time: moment(to).format('YYYY-MM-DD HH:mm:ss'),
          value: metricAgg?.value || doc_count,
          category: 'all document',
        },
      ];
    }, []);
    return [{ id: 'Log entries', points }];
  }
};

export const processUngroupedResults = (results) => {
  if (!results.dat?.aggregations?.histogramBuckets) return [];
  const points = results.dat.aggregations.histogramBuckets.buckets.reduce((pointsAcc, bucket) => {
    const { key, doc_count: count } = bucket;
    return [...pointsAcc, { timestamp: key, value: count }];
  }, []);
  return [{ id: 'Log entries', points }];
};

export const getGroupedResults = async (body) => {
  let compositeGroupBuckets: any = [];
  let lastAfterKey;

  while (true) {
    const groupResponse = await searchAlertTest({ ...body, after_key: lastAfterKey ?? null });
    compositeGroupBuckets = [...compositeGroupBuckets, ...groupResponse.dat?.aggregations.groups.buckets];
    lastAfterKey = groupResponse.dat?.aggregations.groups.after_key;
    if (groupResponse.dat?.aggregations.groups.buckets.length < 40) {
      break;
    }
  }

  return compositeGroupBuckets;
};

export const positiveComparators = [
  Comparator.GT,
  Comparator.GT_OR_EQ,
  Comparator.LT,
  Comparator.LT_OR_EQ,
  Comparator.EQ,
  Comparator.MATCH,
  Comparator.MATCH_PHRASE,
];

export const negativeComparators = [Comparator.NOT_EQ, Comparator.NOT_MATCH, Comparator.NOT_MATCH_PHRASE];

const intervalUnits = ['y', 'M', 'w', 'd', 'h', 'm', 's', 'ms'];
const INTERVAL_STRING_RE = new RegExp('^([0-9\\.]*)\\s*(' + intervalUnits.join('|') + ')$');

interface UnitsToSeconds {
  [unit: string]: number;
}

const units: UnitsToSeconds = {
  ms: 0.001,
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 86400 * 7,
  M: 86400 * 30,
  y: 86400 * 356,
};

export const queryMappings: {
  [key: string]: string;
} = {
  [Comparator.GT]: 'range',
  [Comparator.GT_OR_EQ]: 'range',
  [Comparator.LT]: 'range',
  [Comparator.LT_OR_EQ]: 'range',
  [Comparator.EQ]: 'term',
  [Comparator.MATCH]: 'match',
  [Comparator.MATCH_PHRASE]: 'match_phrase',
  [Comparator.NOT_EQ]: 'term',
  [Comparator.NOT_MATCH]: 'match',
  [Comparator.NOT_MATCH_PHRASE]: 'match_phrase',
};

const getQueryMappingForComparator = (comparator: Comparator) => {
  return queryMappings[comparator];
};

export const getIntervalInSeconds = (interval: string): number => {
  const matches = interval.match(INTERVAL_STRING_RE);
  if (matches) {
    return parseFloat(matches[1]) * units[matches[2]];
  }
  throw new Error('Invalid interval string format.');
};

const buildCriterionQuery = (criterion) => {
  const { field, value, comparator } = criterion;

  const queryType = getQueryMappingForComparator(comparator);

  switch (queryType) {
    case 'term':
      return {
        term: {
          [field]: {
            value,
          },
        },
      };
    case 'match': {
      return {
        match: {
          [field]: value,
        },
      };
    }
    case 'match_phrase': {
      return {
        match_phrase: {
          [field]: String(value),
        },
      };
    }
    case 'range': {
      const comparatorToRangePropertyMapping: {
        [key: string]: string;
      } = {
        [Comparator.LT]: 'lt',
        [Comparator.LT_OR_EQ]: 'lte',
        [Comparator.GT]: 'gt',
        [Comparator.GT_OR_EQ]: 'gte',
      };

      const rangeProperty = comparatorToRangePropertyMapping[comparator];

      return {
        range: {
          [field]: {
            [rangeProperty]: value,
          },
        },
      };
    }
    default: {
      return undefined;
    }
  }
};

const buildFiltersForCriteria = (criteria) => {
  let filters: any = [];

  criteria.forEach((criterion) => {
    const criterionQuery = buildCriterionQuery(criterion);
    if (criterionQuery) {
      filters = [...filters, criterionQuery];
    }
  });
  return filters;
};

export const buildFiltersFromCriteria = (
  params: any,
  timestampField: string,
  executionTimeRange?: ExecutionTimeRange,
) => {
  const { timeSize, timeUnit, criteria } = params;
  const interval = `${timeSize}${timeUnit}`;
  const intervalAsSeconds = getIntervalInSeconds(interval);
  const intervalAsMs = intervalAsSeconds * 1000;
  const to = executionTimeRange?.lte || Date.now();
  const from = executionTimeRange?.gte || to - intervalAsMs;
  const positiveCriteria = criteria.filter((criterion) => positiveComparators.includes(criterion.comparator));
  const negativeCriteria = criteria.filter((criterion) => negativeComparators.includes(criterion.comparator));
  // Positive assertions (things that "must" match)
  const mustFilters = buildFiltersForCriteria(positiveCriteria);
  // Negative assertions (things that "must not" match)
  const mustNotFilters = buildFiltersForCriteria(negativeCriteria);

  const rangeFilter = {
    range: {
      [timestampField]: {
        gte: from,
        lte: to,
        format: 'epoch_millis',
      },
    },
  };

  const groupedRangeFilter = {
    range: {
      [timestampField]: {
        gte: Number(from) ? from - intervalAsMs : from,
        lte: Number(to) ? to + intervalAsMs : to,
        format: 'epoch_millis',
      },
    },
  };

  const mustFiltersFields = positiveCriteria.map((criterion) => criterion.field);

  return { rangeFilter, groupedRangeFilter, mustFilters, mustNotFilters, mustFiltersFields };
};

export interface ExecutionTimeRange {
  gte?: number;
  lte: number;
}
