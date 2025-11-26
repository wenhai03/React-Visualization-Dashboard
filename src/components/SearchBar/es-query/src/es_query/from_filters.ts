import { isUndefined } from 'lodash';
import { migrateFilter } from './migrate_filter';
import { Filter, cleanFilter, isFilterDisabled } from '../filters';
import { BoolQuery } from './types';
import { fromNestedFilter } from './from_nested_filter';

/**
 * Create a filter that can be reversed for filters with negate set
 * @param {boolean} reverse This will reverse the filter. If true then
 *                          anything where negate is set will come
 *                          through otherwise it will filter out
 * @returns {function}
 */
const filterNegate = (reverse: boolean) => (filter: Filter) => {
  if (isUndefined(filter.meta) || isUndefined(filter.meta.negate)) {
    return !reverse;
  }

  return filter.meta && filter.meta.negate === reverse;
};

/**
 * Translate a filter into a query to support es 5+
 * @param  {Object} filter - The filter to translate
 * @return {Object} the query version of that filter
 */
const translateToQuery = (filter: Partial<Filter>): any => {
  return filter.query || filter;
};

/**
 * Options for building query for filters
 */
export interface EsQueryFiltersConfig {
  /**
   * by default filters that use fields that can't be found in the specified index pattern are not applied. Set this to true if you want to apply them anyway.
   */
  ignoreFilterIfFieldNotInIndex?: boolean;

  /**
   * the nested field type requires a special query syntax, which includes an optional ignore_unmapped parameter that indicates whether to ignore an unmapped path and not return any documents instead of an error.
   * The optional ignore_unmapped parameter defaults to false.
   * This `nestedIgnoreUnmapped` param allows creating queries with "ignore_unmapped": true
   */
  nestedIgnoreUnmapped?: boolean;
}

/**
 * @param filters
 * @returns An EQL query
 *
 * @public
 */
export const buildQueryFromFilters = (filters: Filter[] = []): BoolQuery => {
  filters = filters.filter((filter) => filter && !isFilterDisabled(filter));

  const filtersToESQueries = (negate: boolean) => {
    return filters
      .filter((f) => !!f)
      .filter(filterNegate(negate))
      .map((filter) => {
        return migrateFilter(filter);
      })
      .map((filter) => fromNestedFilter(filter))
      .map(cleanFilter)
      .map(translateToQuery);
  };

  return {
    must: [],
    filter: filtersToESQueries(false),
    should: [],
    must_not: filtersToESQueries(true),
  };
};
