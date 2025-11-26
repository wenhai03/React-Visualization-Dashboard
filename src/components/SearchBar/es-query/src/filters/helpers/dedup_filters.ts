import { filter, find } from 'lodash';
import type { Filter } from '..';
import { compareFilters, FilterCompareOptions } from './compare_filters';

/**
 * Combine 2 filter collections, removing duplicates
 *
 * @param {object} existingFilters - The filters to compare to
 * @param {object} filters - The filters being added
 * @param {object} comparatorOptions - Parameters to use for comparison
 *
 * @returns {object} An array of filters that were not in existing
 *
 * @internal
 */
export const dedupFilters = (
  existingFilters: Filter[],
  filters: Filter[],
  comparatorOptions: FilterCompareOptions = {}
) => {
  if (!Array.isArray(filters)) {
    filters = [filters];
  }

  return filter(
    filters,
    (f: Filter) =>
      !find(existingFilters, (existingFilter: Filter) =>
        compareFilters(existingFilter, f, comparatorOptions)
      )
  );
};
