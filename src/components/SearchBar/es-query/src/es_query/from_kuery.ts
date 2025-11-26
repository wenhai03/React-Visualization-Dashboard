import { Query } from '../filters';
import { fromKueryExpression, toElasticsearchQuery, nodeTypes, KueryNode, KueryQueryOptions } from '../kuery';
import { BoolQuery, DataViewBase } from './types';

/** @internal */
export function buildQueryFromKuery(
  indexPattern: DataViewBase | undefined,
  queries: Query[] = [],
  { allowLeadingWildcards = false }: { allowLeadingWildcards?: boolean } = {
    allowLeadingWildcards: false, // 是否允许通配符
  },
  { filtersInMustClause = false, dateFormatTZ, nestedIgnoreUnmapped, caseInsensitive }: KueryQueryOptions = {
    filtersInMustClause: false,
  },
): BoolQuery {
  const queryASTs = queries.map((query) => {
    return fromKueryExpression(query.query, { allowLeadingWildcards }, true);
  });

  return buildQuery(indexPattern, queryASTs, {
    filtersInMustClause,
    dateFormatTZ,
    nestedIgnoreUnmapped,
    caseInsensitive,
  });
}

function buildQuery(
  indexPattern: DataViewBase | undefined,
  queryASTs: KueryNode[],
  config: KueryQueryOptions = {},
): BoolQuery {
  const compoundQueryAST = nodeTypes.function.buildNode('and', queryASTs);
  const kueryQuery = toElasticsearchQuery(compoundQueryAST, indexPattern, config);

  return Object.assign(
    {
      must: [],
      filter: [],
      should: [],
      must_not: [],
    },
    kueryQuery.bool,
  );
}
