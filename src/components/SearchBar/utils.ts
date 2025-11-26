import _ from 'lodash';
import type { DataViewFieldBase, IFieldSubTypeNested } from './es-query';
import { fromKueryExpression } from './es-query';
import {
  setupGetFieldSuggestions,
  setupGetValueSuggestions,
  setupGetOperatorSuggestions,
  setupGetConjunctionSuggestions,
} from './async_loads';

export function toUser(text: { [key: string]: any } | string | number): string {
  if (text == null) {
    return '';
  }
  if (typeof text === 'object') {
    if (text.query_string) {
      return toUser(text.query_string.query);
    }
    return JSON.stringify(text);
  }
  return '' + text;
}

export function fromUser(userInput: object | string) {
  const matchAll = '';

  if (_.isEmpty(userInput)) {
    return '';
  }

  if (_.isObject(userInput)) {
    return userInput;
  }

  userInput = userInput || '';
  if (typeof userInput === 'string') {
    const trimmedUserInput = userInput.trim();
    if (trimmedUserInput.length === 0) {
      return matchAll;
    }

    if (trimmedUserInput[0] === '{') {
      try {
        return JSON.parse(trimmedUserInput);
      } catch (e) {
        return userInput;
      }
    } else {
      return userInput;
    }
  }
}

export function onRaf(fn: Function) {
  let req: number | null;
  return (...args: unknown[]) => {
    if (req) window.cancelAnimationFrame(req);
    req = window.requestAnimationFrame(() => {
      req = null;
      fn(...args);
    });
  };
}

export function shallowEqual(objA: unknown, objB: unknown): boolean {
  if (Object.is(objA, objB)) return true;

  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  for (let i = 0; i < keysA.length; i++) {
    if (
      !Object.prototype.hasOwnProperty.call(objB, keysA[i]) ||
      // @ts-ignore
      !Object.is(objA[keysA[i]], objB[keysA[i]])
    ) {
      return false;
    }
  }

  return true;
}

const pairs = ['()', '[]', '{}', `''`, '""'];
const openers = pairs.map((pair) => pair[0]);
const closers = pairs.map((pair) => pair[1]);

interface MatchPairsOptions {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  key: string;
  metaKey: boolean;
  updateQuery: (query: string, selectionStart: number, selectionEnd: number) => void;
  preventDefault: () => void;
}

function isAlphanumeric(value = '') {
  return value.match(/[a-zA-Z0-9_]/);
}

function shouldMoveCursorForward(key: string, value: string, selectionStart: number, selectionEnd: number) {
  if (!closers.includes(key)) {
    return false;
  }

  // Never move selection forward for multi-character selections
  if (selectionStart !== selectionEnd) {
    return false;
  }

  // Move selection forward if the key is the same as the closer in front of the selection
  return value.charAt(selectionEnd) === key;
}

function shouldInsertMatchingCloser(key: string, value: string, selectionStart: number, selectionEnd: number) {
  if (!openers.includes(key)) {
    return false;
  }

  // Always insert for multi-character selections
  if (selectionStart !== selectionEnd) {
    return true;
  }

  const precedingCharacter = value.charAt(selectionStart - 1);
  const followingCharacter = value.charAt(selectionStart + 1);

  // Don't insert if the preceding character is a backslash
  if (precedingCharacter === '\\') {
    return false;
  }

  // Don't insert if it's a quote and the either of the preceding/following characters is alphanumeric
  return !(['"', `'`].includes(key) && (isAlphanumeric(precedingCharacter) || isAlphanumeric(followingCharacter)));
}

function shouldRemovePair(key: string, metaKey: boolean, value: string, selectionStart: number, selectionEnd: number) {
  if (key !== 'Backspace' || metaKey) {
    return false;
  }

  // Never remove for multi-character selections
  if (selectionStart !== selectionEnd) {
    return false;
  }

  // Remove if the preceding/following characters are a pair
  return pairs.includes(value.substr(selectionEnd - 1, 2));
}

export function matchPairs({
  value,
  selectionStart,
  selectionEnd,
  key,
  metaKey,
  updateQuery,
  preventDefault,
}: MatchPairsOptions) {
  if (shouldMoveCursorForward(key, value, selectionStart, selectionEnd)) {
    preventDefault();
    updateQuery(value, selectionStart + 1, selectionEnd + 1);
  } else if (shouldInsertMatchingCloser(key, value, selectionStart, selectionEnd)) {
    preventDefault();
    const newValue =
      value.substr(0, selectionStart) +
      key +
      value.substring(selectionStart, selectionEnd) +
      closers[openers.indexOf(key)] +
      value.substr(selectionEnd);
    updateQuery(newValue, selectionStart + 1, selectionEnd + 1);
  } else if (shouldRemovePair(key, metaKey, value, selectionStart, selectionEnd)) {
    preventDefault();
    const newValue = value.substr(0, selectionEnd - 1) + value.substr(selectionEnd + 1);
    updateQuery(newValue, selectionStart - 1, selectionEnd - 1);
  }
}
type HasSubtype = Pick<DataViewFieldBase, 'subType'>;
export function isDataViewFieldSubtypeNested(field: HasSubtype) {
  const subTypeNested = field?.subType as IFieldSubTypeNested;
  return !!subTypeNested?.nested?.path;
}

export function getFieldSubtypeNested(field: HasSubtype) {
  return isDataViewFieldSubtypeNested(field) ? (field.subType as IFieldSubTypeNested) : undefined;
}

export enum ES_FIELD_TYPES {
  _ID = '_id',
  _INDEX = '_index',
  _SOURCE = '_source',
  _TYPE = '_type',

  STRING = 'string',
  TEXT = 'text',
  MATCH_ONLY_TEXT = 'match_only_text',
  KEYWORD = 'keyword',
  VERSION = 'version',

  BOOLEAN = 'boolean',
  OBJECT = 'object',

  DATE = 'date',
  DATE_NANOS = 'date_nanos',
  DATE_RANGE = 'date_range',

  GEO_POINT = 'geo_point',
  GEO_SHAPE = 'geo_shape',

  FLOAT = 'float',
  HALF_FLOAT = 'half_float',
  SCALED_FLOAT = 'scaled_float',
  DOUBLE = 'double',
  INTEGER = 'integer',
  LONG = 'long',
  SHORT = 'short',
  UNSIGNED_LONG = 'unsigned_long',

  AGGREGATE_METRIC_DOUBLE = 'aggregate_metric_double',

  FLOAT_RANGE = 'float_range',
  DOUBLE_RANGE = 'double_range',
  INTEGER_RANGE = 'integer_range',
  LONG_RANGE = 'long_range',

  NESTED = 'nested',
  BYTE = 'byte',
  IP = 'ip',
  IP_RANGE = 'ip_range',
  ATTACHMENT = 'attachment',
  TOKEN_COUNT = 'token_count',
  MURMUR3 = 'murmur3',

  HISTOGRAM = 'histogram',
}

/** @public **/
export enum KBN_FIELD_TYPES {
  _SOURCE = '_source',
  ATTACHMENT = 'attachment',
  BOOLEAN = 'boolean',
  DATE = 'date',
  DATE_RANGE = 'date_range',
  GEO_POINT = 'geo_point',
  GEO_SHAPE = 'geo_shape',
  IP = 'ip',
  IP_RANGE = 'ip_range',
  MURMUR3 = 'murmur3',
  NUMBER = 'number',
  NUMBER_RANGE = 'number_range',
  STRING = 'string',
  UNKNOWN = 'unknown',
  CONFLICT = 'conflict',
  OBJECT = 'object',
  NESTED = 'nested',
  HISTOGRAM = 'histogram',
  MISSING = 'missing',
}

export interface KbnFieldTypeOptions {
  sortable: boolean;
  filterable: boolean;
  name: string;
  esTypes: ES_FIELD_TYPES[];
}

export class KbnFieldType {
  public readonly name: string;
  public readonly sortable: boolean;
  public readonly filterable: boolean;
  public readonly esTypes: readonly ES_FIELD_TYPES[];

  constructor(options: Partial<KbnFieldTypeOptions> = {}) {
    this.name = options.name || KBN_FIELD_TYPES.UNKNOWN;
    this.sortable = options.sortable || false;
    this.filterable = options.filterable || false;
    this.esTypes = Object.freeze((options.esTypes || []).slice());
  }
}

export const kbnFieldTypeUnknown = new KbnFieldType({
  name: KBN_FIELD_TYPES.UNKNOWN,
});

export const createKbnFieldTypes = (): KbnFieldType[] => [
  new KbnFieldType({
    name: KBN_FIELD_TYPES.STRING,
    sortable: true,
    filterable: true,
    esTypes: [
      ES_FIELD_TYPES.STRING,
      ES_FIELD_TYPES.TEXT,
      ES_FIELD_TYPES.MATCH_ONLY_TEXT,
      ES_FIELD_TYPES.KEYWORD,
      ES_FIELD_TYPES.VERSION,
      ES_FIELD_TYPES._TYPE,
      ES_FIELD_TYPES._ID,
    ],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.NUMBER,
    sortable: true,
    filterable: true,
    esTypes: [
      ES_FIELD_TYPES.FLOAT,
      ES_FIELD_TYPES.HALF_FLOAT,
      ES_FIELD_TYPES.SCALED_FLOAT,
      ES_FIELD_TYPES.DOUBLE,
      ES_FIELD_TYPES.INTEGER,
      ES_FIELD_TYPES.LONG,
      ES_FIELD_TYPES.UNSIGNED_LONG,
      ES_FIELD_TYPES.SHORT,
      ES_FIELD_TYPES.BYTE,
      ES_FIELD_TYPES.TOKEN_COUNT,
      ES_FIELD_TYPES.AGGREGATE_METRIC_DOUBLE,
    ],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.NUMBER_RANGE,
    sortable: true,
    filterable: true,
    esTypes: [
      ES_FIELD_TYPES.FLOAT_RANGE,
      ES_FIELD_TYPES.DOUBLE_RANGE,
      ES_FIELD_TYPES.INTEGER_RANGE,
      ES_FIELD_TYPES.LONG_RANGE,
    ],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.DATE,
    sortable: true,
    filterable: true,
    esTypes: [ES_FIELD_TYPES.DATE, ES_FIELD_TYPES.DATE_NANOS],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.DATE_RANGE,
    sortable: true,
    filterable: true,
    esTypes: [ES_FIELD_TYPES.DATE_RANGE],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.IP,
    sortable: true,
    filterable: true,
    esTypes: [ES_FIELD_TYPES.IP],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.IP_RANGE,
    sortable: true,
    filterable: true,
    esTypes: [ES_FIELD_TYPES.IP_RANGE],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.BOOLEAN,
    sortable: true,
    filterable: true,
    esTypes: [ES_FIELD_TYPES.BOOLEAN],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.OBJECT,
    esTypes: [ES_FIELD_TYPES.OBJECT],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.NESTED,
    esTypes: [ES_FIELD_TYPES.NESTED],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.GEO_POINT,
    esTypes: [ES_FIELD_TYPES.GEO_POINT],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.GEO_SHAPE,
    esTypes: [ES_FIELD_TYPES.GEO_SHAPE],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.ATTACHMENT,
    esTypes: [ES_FIELD_TYPES.ATTACHMENT],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.MURMUR3,
    esTypes: [ES_FIELD_TYPES.MURMUR3],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES._SOURCE,
    esTypes: [ES_FIELD_TYPES._SOURCE],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.HISTOGRAM,
    filterable: true,
    esTypes: [ES_FIELD_TYPES.HISTOGRAM],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.CONFLICT,
  }),
  kbnFieldTypeUnknown,
];

const cursorSymbol = '@kuery-cursor@';

const dedup = (suggestions: any[]): any[] =>
  _.uniqBy(suggestions, ({ type, text, start, end }) => [type, text, start, end].join('|'));

export const setupKqlQuerySuggestionProvider = (core: any): any => {
  let getSuggestionsByType:
    | ((cursoredQuery: string, querySuggestionsArgs: any) => Promise<Array<Promise<any[]>> | []>)
    | undefined;

  const asyncGetSuggestionsByTypeFn = async () => {
    if (getSuggestionsByType) {
      return getSuggestionsByType;
    }

    const providers = {
      field: setupGetFieldSuggestions(core),
      value: setupGetValueSuggestions(core),
      operator: setupGetOperatorSuggestions(),
      conjunction: setupGetConjunctionSuggestions(core),
    };
    return (getSuggestionsByType = async (
      cursoredQuery: string,
      querySuggestionsArgs: any,
    ): Promise<Array<Promise<any[]>> | []> => {
      try {
        const { suggestionsAbstraction } = querySuggestionsArgs;
        let cursorNode = fromKueryExpression(cursoredQuery, {
          cursorSymbol,
          parseCursor: true,
        });
        const isNested = cursorNode.nestedPath && cursorNode.nestedPath.length > 0;
        const fieldName = isNested ? `${cursorNode.nestedPath}.${cursorNode.fieldName}` : cursorNode.fieldName;
        if (suggestionsAbstraction && suggestionsAbstraction?.fields[fieldName]) {
          if (isNested) {
            cursorNode = {
              ...cursorNode,
              fieldName: suggestionsAbstraction?.fields[fieldName]?.nestedField ?? fieldName,
              nestedPath: suggestionsAbstraction?.fields[fieldName]?.nestedPath ?? fieldName,
            };
          } else {
            cursorNode = {
              ...cursorNode,
              fieldName: suggestionsAbstraction?.fields[fieldName]?.field ?? fieldName,
            };
          }
        }
        return cursorNode.suggestionTypes.map((type) => providers[type](querySuggestionsArgs, cursorNode));
      } catch (e) {
        return [];
      }
    });
  };

  return async (querySuggestionsArgs): Promise<any[]> => {
    const { query, selectionStart, selectionEnd } = querySuggestionsArgs;
    const cursoredQuery = `${query.substr(0, selectionStart)}${cursorSymbol}${query.substr(selectionEnd)}`;
    const fn = await asyncGetSuggestionsByTypeFn();
    return Promise.all(await fn(cursoredQuery, querySuggestionsArgs)).then((suggestionsByType) => {
      return dedup(_.flatten(suggestionsByType));
    });
  };
};

export const getQuerySuggestions = (args) => {
  const provider = setupKqlQuerySuggestionProvider(args);
  if (provider) {
    return provider(args);
  }
};

const OVERRIDES = {
  _source: { type: '_source' },
  _index: { type: 'string' },
  _type: { type: 'string' },
  _id: { type: 'string' },
  _score: {
    type: 'number',
    searchable: false,
    aggregatable: false,
  },
};

function mergeOverrides(field) {
  if (OVERRIDES.hasOwnProperty(field.name)) {
    return _.merge(field, OVERRIDES[field.name]);
  } else {
    return field;
  }
}

const registeredKbnTypes = createKbnFieldTypes();

export const castEsToKbnFieldTypeName = (esType: ES_FIELD_TYPES | string): KBN_FIELD_TYPES => {
  const type = registeredKbnTypes.find((t) => t.esTypes.includes(esType as ES_FIELD_TYPES));

  return type && type.name ? (type.name as KBN_FIELD_TYPES) : KBN_FIELD_TYPES.UNKNOWN;
};

export function shouldReadFieldFromDocValues(aggregatable: boolean, esType: string) {
  return aggregatable && !['text', 'geo_shape'].includes(esType) && !esType.startsWith('_');
}

export function readFieldCapsResponse(fieldCapsResponse) {
  const capsByNameThenType = fieldCapsResponse.fields;
  const kibanaFormattedCaps = Object.keys(capsByNameThenType).reduce<{
    array;
    hash;
  }>(
    (agg, fieldName) => {
      const capsByType = capsByNameThenType[fieldName];
      const types = Object.keys(capsByType);

      // If a single type is marked as searchable or aggregatable, all the types are searchable or aggregatable
      const isSearchable = types.some((type) => {
        return (
          !!capsByType[type].searchable ||
          (!!capsByType[type].non_searchable_indices && capsByType[type].non_searchable_indices!.length > 0)
        );
      });

      const isAggregatable = types.some((type) => {
        return (
          !!capsByType[type].aggregatable ||
          (!!capsByType[type].non_aggregatable_indices && capsByType[type].non_aggregatable_indices!.length > 0)
        );
      });

      const timeSeriesMetricProp = _.uniq(types.map((t) => capsByType[t].time_series_metric));

      // If there are multiple types but they all resolve to the same kibana type
      // ignore the conflict and carry on (my wayward son)
      const uniqueKibanaTypes = _.uniq(types.map(castEsToKbnFieldTypeName));
      if (uniqueKibanaTypes.length > 1) {
        const field = {
          name: fieldName,
          type: 'conflict',
          esTypes: types,
          searchable: isSearchable,
          aggregatable: isAggregatable,
          readFromDocValues: false,
          conflictDescriptions: types.reduce((acc, esType) => {
            acc[esType] = capsByType[esType].indices;
            return acc;
          }, {}),
          metadata_field: capsByType[types[0]].metadata_field,
        };
        // This is intentionally using a "hash" and a "push" to be highly optimized with very large indexes
        agg.array.push(field);
        agg.hash[fieldName] = field;
        return agg;
      }

      let timeSeriesMetricType: 'gauge' | 'counter' | 'position' | undefined;
      if (timeSeriesMetricProp.length === 1 && timeSeriesMetricProp[0] === 'gauge') {
        timeSeriesMetricType = 'gauge';
      }
      if (timeSeriesMetricProp.length === 1 && timeSeriesMetricProp[0] === 'counter') {
        timeSeriesMetricType = 'counter';
      }
      if (timeSeriesMetricProp.length === 1 && timeSeriesMetricProp[0] === 'position') {
        timeSeriesMetricType = 'position';
      }
      const esType = types[0];
      const field = {
        name: fieldName,
        type: castEsToKbnFieldTypeName(esType),
        esTypes: types,
        searchable: isSearchable,
        aggregatable: isAggregatable,
        readFromDocValues: shouldReadFieldFromDocValues(isAggregatable, esType),
        metadata_field: capsByType[types[0]].metadata_field,
        fixedInterval: capsByType[types[0]].meta?.fixed_interval,
        timeZone: capsByType[types[0]].meta?.time_zone,
        timeSeriesMetric: timeSeriesMetricType,
        timeSeriesDimension: capsByType[types[0]].time_series_dimension,
      };
      // This is intentionally using a "hash" and a "push" to be highly optimized with very large indexes
      agg.array.push(field);
      agg.hash[fieldName] = field;
      return agg;
    },
    {
      array: [],
      hash: {},
    },
  );

  // Get all types of sub fields. These could be multi fields or children of nested/object types
  const subFields = kibanaFormattedCaps.array.filter((field) => {
    return field.name.includes('.');
  });

  // Determine the type of each sub field.
  subFields.forEach((field) => {
    const parentFieldNames = field.name
      .split('.')
      .slice(0, -1)
      .map((_, index, parentFieldNameParts) => {
        return parentFieldNameParts.slice(0, index + 1).join('.');
      });
    const parentFieldCaps = parentFieldNames.map((parentFieldName) => kibanaFormattedCaps.hash[parentFieldName]);
    const parentFieldCapsAscending = parentFieldCaps.reverse();

    if (parentFieldCaps && parentFieldCaps.length > 0) {
      let subType = {};
      // If the parent field is not an object or nested field the child must be a multi field.
      const firstParent = parentFieldCapsAscending[0];
      if (firstParent && !['object', 'nested'].includes(firstParent.type)) {
        subType = { ...subType, multi: { parent: firstParent.name } };
      }

      // We need to know if some parent field is nested
      const nestedParentCaps = parentFieldCapsAscending.find(
        (parentCaps) => parentCaps && parentCaps.type === 'nested',
      );
      if (nestedParentCaps) {
        subType = { ...subType, nested: { path: nestedParentCaps.name } };
      }

      if (Object.keys(subType).length > 0) {
        field.subType = subType;
      }
    }
  });

  return kibanaFormattedCaps.array.filter((field) => {
    return !['object', 'nested'].includes(field.type);
  });
}

export const normalizedFieldTypes: Record<string, string> = {
  long: 'number',
  integer: 'number',
  short: 'number',
  byte: 'number',
  double: 'number',
  float: 'number',
  half_float: 'number',
  scaled_float: 'number',
};

export const getFieldsForWildcard = (esFieldCaps) => {
  const metaFields = ['_source', '_id', '_index', '_scorer'];
  const fieldCapsArr = readFieldCapsResponse(esFieldCaps);
  const fieldsFromFieldCapsByName = _.keyBy(fieldCapsArr, 'name');
  const allFieldsUnsorted = Object.keys(fieldsFromFieldCapsByName)
    // not all meta fields are provided, so remove and manually add
    .filter((name) => !fieldsFromFieldCapsByName[name].metadata_field)
    .concat(fieldCapsArr.length ? metaFields : [])
    .reduce<{ names: string[]; map: Map<string, string> }>(
      (agg, value) => {
        // This is intentionally using a Map to be highly optimized with very large indexes AND be safe for user provided data
        if (agg.map.get(value) != null) {
          return agg;
        } else {
          agg.map.set(value, value);
          agg.names.push(value);
          return agg;
        }
      },
      { names: [], map: new Map<string, string>() },
    )
    .names.map((name) =>
      _.defaults({}, fieldsFromFieldCapsByName[name], {
        name,
        type: 'string',
        searchable: false,
        aggregatable: false,
        readFromDocValues: false,
        metadata_field: metaFields.includes(name),
      }),
    )
    .map(mergeOverrides);
  return _.sortBy(allFieldsUnsorted, 'name');
};

export function getFieldsFromRawFields(rawFields) {
  const result: any = [];

  if (!rawFields || !rawFields.fields) {
    return [];
  }

  for (const name of Object.keys(rawFields.fields)) {
    const rawField = rawFields.fields[name];
    const esType = Object.keys(rawField)[0];
    const values = rawField[esType];

    if (!esType || esType.startsWith('_')) continue;
    if (!values) continue;

    const normalizedType = normalizedFieldTypes[esType] || esType;
    const aggregatable = values.aggregatable;
    const searchable = values.searchable;

    result.push({
      name,
      esType,
      normalizedType,
      aggregatable,
      searchable,
      type: castEsToKbnFieldTypeName(esType),
    });
  }

  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

// 判断字段是否支持枚举值
export const isSuggestingValues = (field) => {
  const isVersionFieldType = field?.esTypes?.includes('version');
  return field && field.aggregatable && field.type === 'string' && !isVersionFieldType;
};
