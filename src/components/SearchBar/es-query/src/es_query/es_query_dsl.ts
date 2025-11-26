import { has } from 'lodash';

export interface DslQueryStringQuery {
  query_string: {
    query: string;
    analyze_wildcard?: boolean;
  };
}

/** @internal */
export const isEsQueryString = (query: any): query is DslQueryStringQuery =>
  has(query, 'query_string.query');
