import { Filter, FilterMeta, FILTERS, FilterStateStore } from './types';

/** @public */
export type CustomFilter = Filter;

/**
 *
 * @param indexPatternString
 * @param queryDsl
 * @param disabled
 * @param negate
 * @param alias
 * @param store
 * @returns
 *
 * @public
 */
export function buildCustomFilter(
  indexPatternString: any,
  queryDsl: any,
  disabled: boolean,
  negate: boolean,
  alias: string | null,
  store?: FilterStateStore,
): Filter {
  const meta: FilterMeta = {
    index: indexPatternString,
    type: FILTERS.CUSTOM,
    disabled,
    negate,
    alias,
  };
  const filter: Filter = { ...queryDsl, meta };
  if (store) {
    filter.$state = { store };
  }
  return filter;
}
