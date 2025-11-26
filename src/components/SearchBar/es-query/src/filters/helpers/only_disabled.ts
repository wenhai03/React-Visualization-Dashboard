import { filter } from 'lodash';
import type { Filter } from '..';
import type { FilterCompareOptions } from './compare_filters';
import { compareFilters, COMPARE_ALL_OPTIONS } from './compare_filters';

const isEnabled = (f: Filter) => f && f.meta && !f.meta.disabled;

/**
 * Checks to see if only disabled filters have been changed
 * @returns {bool} Only disabled filters
 *
 * @public
 */
export const onlyDisabledFiltersChanged = (
  newFilters?: Filter[],
  oldFilters?: Filter[],
  comparatorOptions?: FilterCompareOptions
) => {
  // If it's the same - compare only enabled filters
  const newEnabledFilters = filter(newFilters || [], isEnabled);
  const oldEnabledFilters = filter(oldFilters || [], isEnabled);
  const options = comparatorOptions ?? COMPARE_ALL_OPTIONS;

  return compareFilters(oldEnabledFilters, newEnabledFilters, options);
};
