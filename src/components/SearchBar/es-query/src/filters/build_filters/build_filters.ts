import { Serializable } from '../../es_query/types';
import { Filter, FILTERS } from './types';

import { buildPhraseFilter, PhraseFilterValue } from './phrase_filter';
import { buildPhrasesFilter } from './phrases_filter';
import { buildRangeFilter, RangeFilterParams } from './range_filter';
import { buildExistsFilter } from './exists_filter';

import type { DataViewFieldBase, DataViewBase } from '../../es_query';
import { FilterStateStore } from './types';

/**
 *
 * @param indexPattern
 * @param field
 * @param type
 * @param negate whether the filter is negated (NOT filter)
 * @param disabled  whether the filter is disabled andwon't be applied to searches
 * @param params
 * @param alias a display name for the filter
 * @param store whether the filter applies to the current application or should be applied to global context
 * @returns
 *
 * @public
 */
export function buildFilter(
  indexPattern: any,
  field: DataViewFieldBase,
  operatorInfo: any,
  disabled: boolean,
  params: Serializable,
  alias: string | null,
  store?: FilterStateStore,
): any {
  const filter: any = buildBaseFilter(indexPattern, field, operatorInfo.type, params);
  filter.meta.alias = alias;
  filter.meta.negate = operatorInfo.negate;
  filter.meta.disabled = disabled;
  filter.meta.field = field;
  filter.meta.type = operatorInfo.type;
  filter.meta.params = params;
  if (store) {
    filter.$state = { store };
  }
  return filter;
}

function buildBaseFilter(
  indexPattern: DataViewBase,
  field: DataViewFieldBase,
  type: FILTERS,
  params: Serializable,
): Filter {
  switch (type) {
    case 'phrase':
      return buildPhraseFilter(field, params as PhraseFilterValue, indexPattern);
    case 'phrases':
      return buildPhrasesFilter(field, params as PhraseFilterValue[], indexPattern);
    case 'range':
      const { from: gte, to: lt } = params as RangeFilterParams;
      return buildRangeFilter(field, { lt, gte }, indexPattern);
    case 'range_from_value':
      return buildRangeFilter(field, params as RangeFilterParams, indexPattern);
    case 'exists':
      return buildExistsFilter(field, indexPattern);
    default:
      throw new Error(`Unknown filter type: ${type}`);
  }
}
