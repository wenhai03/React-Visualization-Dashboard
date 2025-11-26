import type { Query, AggregateQuery } from '../filters';

type Language = keyof AggregateQuery;

// Checks if the query is of type Query
export function isOfQueryType(arg?: Query | AggregateQuery): arg is Query {
  return Boolean(arg && 'query' in arg);
}

// Checks if the query is of type AggregateQuery
// currently only supports the sql query type
// should be enhanced to support other query types
export function isOfAggregateQueryType(
  query: AggregateQuery | Query | { [key: string]: any }
): query is AggregateQuery {
  return Boolean(query && ('sql' in query || 'esql' in query));
}

// returns the language of the aggregate Query, sql, esql etc
export function getAggregateQueryMode(query: AggregateQuery): Language {
  return Object.keys(query)[0] as Language;
}

// retrieves the index pattern from the aggregate query
export function getIndexPatternFromSQLQuery(sqlQuery?: string): string {
  let sql = sqlQuery?.replaceAll('"', '').replaceAll("'", '');
  const splitFroms = sql?.split(new RegExp(/FROM\s/, 'ig'));
  const fromsLength = splitFroms?.length ?? 0;
  if (splitFroms && splitFroms?.length > 2) {
    sql = `${splitFroms[fromsLength - 2]} FROM ${splitFroms[fromsLength - 1]}`;
  }
  // case insensitive match for the index pattern
  const regex = new RegExp(/FROM\s+([\w*-.!@$^()~;]+)/, 'i');
  const matches = sql?.match(regex);
  if (matches) {
    return matches[1];
  }
  return '';
}
