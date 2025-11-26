import { each, union } from 'lodash';
import type { Filter, FilterCompareOptions } from '..';
import { dedupFilters } from './dedup_filters';

/**
 * Remove duplicate filters from an array of filters
 *
 * @param {array} filters The filters to remove duplicates from
 * @param {object} comparatorOptions - Parameters to use for comparison
 * @returns {object} The original filters array with duplicates removed
 * @public
 */
export const uniqFilters = (filters: Filter[], comparatorOptions: FilterCompareOptions = {}) => {
  let results: Filter[] = [];

  each(filters, (filter: Filter) => {
    results = union(results, dedupFilters(results, [filter], comparatorOptions));
  });

  return results;
};
