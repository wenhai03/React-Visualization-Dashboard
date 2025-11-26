import { Filter, isCombinedFilter } from '../filters';
import { DataViewBase } from './types';
import { buildQueryFromFilters, EsQueryFiltersConfig } from './from_filters';
import { BooleanRelation, CombinedFilter } from '../filters/build_filters';

const fromAndFilter = (filter: CombinedFilter) => {
  const bool = buildQueryFromFilters(filter.meta.params);
  return { ...filter, query: { bool } };
};

const fromOrFilter = (filter: CombinedFilter) => {
  const should = filter.meta.params.map((subFilter) => ({
    bool: buildQueryFromFilters([subFilter]),
  }));
  const bool = { should, minimum_should_match: 1 };
  return { ...filter, query: { bool } };
};

export const fromCombinedFilter = (filter: Filter): Filter => {
  if (!isCombinedFilter(filter)) {
    return filter;
  }

  if (filter.meta.relation === BooleanRelation.AND) {
    return fromAndFilter(filter);
  }

  return fromOrFilter(filter);
};
