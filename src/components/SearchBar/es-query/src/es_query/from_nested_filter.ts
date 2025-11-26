import { EsQueryFiltersConfig } from '../..';
import { getFilterField, cleanFilter, Filter } from '../filters';
import { DataViewBase } from './types';
import { getDataViewFieldSubtypeNested } from '../utils';

/** @internal */
export const fromNestedFilter = (filter: Filter, indexPattern?: DataViewBase) => {
  if (!indexPattern) return filter;

  const fieldName = getFilterField(filter);
  if (!fieldName) {
    return filter;
  }

  const field = indexPattern.fields.find((indexPatternField) => indexPatternField.name === fieldName);

  const subTypeNested = field && getDataViewFieldSubtypeNested(field);
  if (!subTypeNested) {
    return filter;
  }

  const query = cleanFilter(filter);

  return {
    meta: filter.meta,
    query: {
      nested: {
        path: subTypeNested.nested.path,
        query: query.query || query,
        // ...(typeof config.ignoreUnmapped === 'boolean' && {
        //   ignore_unmapped: config.ignoreUnmapped,
        // }),
      },
    },
  };
};
