import { isEqual } from 'lodash';
import { SerializableRecord } from './types';
import { buildQueryFromKuery } from './from_kuery';
import { buildQueryFromFilters } from './from_filters';
import type { KueryQueryOptions } from '../kuery';
import type { EsQueryFiltersConfig } from './from_filters';

/**
 * Configurations to be used while constructing an ES query.
 * @public
 */
export type EsQueryConfig = KueryQueryOptions &
  EsQueryFiltersConfig & {
    allowLeadingWildcards?: boolean;
    queryStringOptions?: SerializableRecord;
  };

function removeMatchAll<T>(filters: T[]) {
  return filters.filter((filter) => !filter || typeof filter !== 'object' || !isEqual(filter, { match_all: {} }));
}

export function buildEsQuery(
  queryString: string, // 输入框查询语句
  filters: any, // 历史查询记录
) {
  const kueryQuery = buildQueryFromKuery(undefined, [{ language: 'kuery', query: queryString }], {
    allowLeadingWildcards: true,
  });
  const filterQuery = buildQueryFromFilters(filters);

  return {
    must: removeMatchAll([...kueryQuery.must, ...filterQuery.must]),
    filter: removeMatchAll([...kueryQuery.filter, ...filterQuery.filter]),
    should: removeMatchAll([...kueryQuery.should, ...filterQuery.should]),
    must_not: [...kueryQuery.must_not, ...filterQuery.must_not],
  };
}
