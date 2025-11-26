import { SerializableRecord } from './types';
import { Query } from '../..';
import { decorateQuery } from './decorate_query';
import { luceneStringToDsl } from './lucene_string_to_dsl';
import { BoolQuery } from './types';

/** @internal */
export function buildQueryFromLucene(
  queries: Query[],
  queryStringOptions: SerializableRecord = {},
  dateFormatTZ?: string
): BoolQuery {
  const combinedQueries = (queries || []).map((query) => {
    const queryDsl = luceneStringToDsl(query.query);

    return decorateQuery(queryDsl, queryStringOptions, dateFormatTZ);
  });

  return {
    must: combinedQueries,
    filter: [],
    should: [],
    must_not: [],
  };
}
